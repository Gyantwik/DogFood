package com.dogfood.bulk;

import com.dogfood.auth.RoleType;
import com.dogfood.certificates.CertificateService;
import com.dogfood.comments.Comment;
import com.dogfood.comments.CommentRepository;
import com.dogfood.common.audit.AuditLogService;
import com.dogfood.events.*;
import com.dogfood.events.dto.EventDetailResponse;
import com.dogfood.normalization.LeaderboardEntryDto;
import com.dogfood.normalization.ZScoreNormalizationService;
import com.dogfood.security.EventAuthorizationPolicy;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.*;

@Service
public class BulkDataService {

    private final EventService eventService;
    private final EventRepository eventRepository;
    private final TrackRepository trackRepository;
    private final SubmissionRepository submissionRepository;
    private final CommentRepository commentRepository;
    private final com.dogfood.voting.VoteRepository voteRepository;
    private final CertificateService certificateService;
    private final ZScoreNormalizationService normalizationService;
    private final EventAuthorizationPolicy authorizationPolicy;
    private final AuditLogService auditLogService;

    public BulkDataService(
            EventService eventService,
            EventRepository eventRepository,
            TrackRepository trackRepository,
            SubmissionRepository submissionRepository,
            CommentRepository commentRepository,
            com.dogfood.voting.VoteRepository voteRepository,
            CertificateService certificateService,
            ZScoreNormalizationService normalizationService,
            EventAuthorizationPolicy authorizationPolicy,
            AuditLogService auditLogService) {
        this.eventService = eventService;
        this.eventRepository = eventRepository;
        this.trackRepository = trackRepository;
        this.submissionRepository = submissionRepository;
        this.commentRepository = commentRepository;
        this.voteRepository = voteRepository;
        this.certificateService = certificateService;
        this.normalizationService = normalizationService;
        this.authorizationPolicy = authorizationPolicy;
        this.auditLogService = auditLogService;
    }

    @Transactional(readOnly = true)
    public Map<String, Object> exportBundle(Long eventId, Long userId) {
        authorizationPolicy.requireEventRole(userId, eventId, RoleType.ORGANIZER);

        EventDetailResponse event = eventService.getEvent(eventId);
        List<Track> tracks = trackRepository.findByEventId(eventId);
        List<Submission> submissions = submissionRepository.findByEventId(eventId);
        List<Comment> comments = commentRepository.findByEventIdOrderByCreatedAtDesc(eventId);

        List<LeaderboardEntryDto> leaderboard = List.of();
        try {
            leaderboard = normalizationService.getLeaderboard(eventId, "raw");
        } catch (Exception ignored) {}

        var certificates = certificateService.listCertificatesForEvent(eventId);

        Map<String, Object> bundle = new LinkedHashMap<>();
        bundle.put("version", "1.0");
        bundle.put("exportedAt", Instant.now().toString());
        bundle.put("eventId", eventId);
        bundle.put("event", event);
        bundle.put("tracks", tracks);
        bundle.put("submissions", submissions);
        bundle.put("votes", voteRepository.findByEventId(eventId));
        bundle.put("comments", comments);
        bundle.put("leaderboard", leaderboard);
        bundle.put("certificates", certificates);

        auditLogService.logAction(userId, eventId, "EXPORT_BUNDLE", "Exported full event data bundle for event ID: " + eventId);

        return bundle;
    }

    @Transactional
    @SuppressWarnings("unchecked")
    public Map<String, Object> importBundle(Long eventId, Map<String, Object> bundle, Long userId) {
        authorizationPolicy.requireEventRole(userId, eventId, RoleType.ORGANIZER);

        Event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new IllegalArgumentException("Event not found: " + eventId));

        int tracksImported = 0;
        int submissionsImported = 0;
        int commentsImported = 0;

        // 1. Import tracks
        if (bundle.containsKey("tracks") && bundle.get("tracks") instanceof List) {
            List<Map<String, Object>> trackList = (List<Map<String, Object>>) bundle.get("tracks");
            List<Track> existing = trackRepository.findByEventId(eventId);
            Set<String> existingNames = new HashSet<>();
            for (Track t : existing) existingNames.add(t.getName().toLowerCase());

            for (Map<String, Object> tMap : trackList) {
                String name = (String) tMap.get("name");
                String desc = (String) tMap.get("description");
                if (name != null && !name.isBlank() && !existingNames.contains(name.toLowerCase())) {
                    Track newTrack = new Track(eventId, name.trim(), desc);
                    trackRepository.save(newTrack);
                    existingNames.add(name.toLowerCase());
                    tracksImported++;
                }
            }
        }

        // 2. Import submissions
        if (bundle.containsKey("submissions") && bundle.get("submissions") instanceof List) {
            List<Map<String, Object>> subList = (List<Map<String, Object>>) bundle.get("submissions");
            for (Map<String, Object> sMap : subList) {
                String title = (String) sMap.get("title");
                if (title == null || title.isBlank()) continue;

                String tagline = (String) sMap.get("tagline");
                String description = (String) sMap.get("description");
                String repoUrl = (String) sMap.get("repoUrl");
                String demoUrl = (String) sMap.get("demoUrl");
                String status = (String) sMap.getOrDefault("status", "SUBMITTED");

                Submission sub = new Submission(eventId, title.trim(), tagline, description, repoUrl, status);
                sub.setDemoUrl(demoUrl);
                sub.setCreatedBy(userId);
                sub.setStatus(status);
                submissionRepository.save(sub);
                submissionsImported++;
            }
        }

        // 3. Import comments
        if (bundle.containsKey("comments") && bundle.get("comments") instanceof List) {
            List<Map<String, Object>> commentList = (List<Map<String, Object>>) bundle.get("comments");
            List<Submission> currentSubmissions = submissionRepository.findByEventId(eventId);
            if (!currentSubmissions.isEmpty()) {
                Long fallbackSubId = currentSubmissions.get(0).getId();
                for (Map<String, Object> cMap : commentList) {
                    String content = (String) cMap.get("content");
                    String author = (String) cMap.getOrDefault("authorName", "Anonymous");
                    if (content != null && !content.isBlank()) {
                        Comment comment = new Comment(eventId, fallbackSubId, userId, author, null, content);
                        commentRepository.save(comment);
                        commentsImported++;
                    }
                }
            }
        }

        auditLogService.logAction(userId, eventId, "IMPORT_BUNDLE",
                String.format("Imported data bundle: %d tracks, %d submissions, %d comments", tracksImported, submissionsImported, commentsImported));

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("success", true);
        result.put("tracksImported", tracksImported);
        result.put("submissionsImported", submissionsImported);
        result.put("commentsImported", commentsImported);
        return result;
    }
}
