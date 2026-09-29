package com.dogfood.bulk;

import com.dogfood.auth.RoleType;
import com.dogfood.certificates.CertificateService;
import com.dogfood.comments.Comment;
import com.dogfood.comments.CommentRepository;
import com.dogfood.common.audit.AuditLogService;
import com.dogfood.events.*;
import com.dogfood.common.audit.AuditLog;
import com.dogfood.common.audit.AuditLogRepository;
import com.dogfood.events.dto.CreateEventRequest;
import com.dogfood.events.dto.EventDetailResponse;
import com.dogfood.judging.Rubric;
import com.dogfood.judging.RubricCriterion;
import com.dogfood.judging.RubricCriterionRepository;
import com.dogfood.judging.RubricRepository;
import com.dogfood.normalization.LeaderboardEntryDto;
import com.dogfood.normalization.ZScoreNormalizationService;
import com.dogfood.security.EventAuthorizationPolicy;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
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
    private final AuditLogRepository auditLogRepository;
    private final RubricRepository rubricRepository;
    private final RubricCriterionRepository rubricCriterionRepository;
    private final EventCustomQuestionRepository customQuestionRepository;

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
            AuditLogService auditLogService,
            AuditLogRepository auditLogRepository,
            RubricRepository rubricRepository,
            RubricCriterionRepository rubricCriterionRepository,
            EventCustomQuestionRepository customQuestionRepository) {
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
        this.auditLogRepository = auditLogRepository;
        this.rubricRepository = rubricRepository;
        this.rubricCriterionRepository = rubricCriterionRepository;
        this.customQuestionRepository = customQuestionRepository;
    }

    @Transactional(readOnly = true)
    public Map<String, Object> exportBundle(Long eventId, Long userId) {
        authorizationPolicy.requireEventRole(userId, eventId, RoleType.ORGANIZER);

        EventDetailResponse event = eventService.getEvent(eventId);
        List<Track> tracks = trackRepository.findByEventId(eventId);
        List<Submission> submissions = submissionRepository.findByEventId(eventId);
        if (submissions.size() > 200) {
            submissions = new ArrayList<>(submissions.subList(0, 200));
        }
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
            int maxToImport = Math.min(subList.size(), 100);
            for (int i = 0; i < maxToImport; i++) {
                Map<String, Object> sMap = subList.get(i);
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

    @Transactional
    public EventDetailResponse cloneEvent(Long sourceEventId, CloneEventRequest req, Long userId) {
        authorizationPolicy.requireEventRole(userId, sourceEventId, RoleType.ORGANIZER);

        Event source = eventRepository.findById(sourceEventId)
                .orElseThrow(() -> new IllegalArgumentException("Source event not found: " + sourceEventId));

        long offsetDays = (req != null && req.getDateOffsetDays() != null) ? req.getDateOffsetDays() : 0L;

        CreateEventRequest createReq = new CreateEventRequest();
        String targetName = (req != null && req.getNewName() != null && !req.getNewName().isBlank())
                ? req.getNewName().trim()
                : source.getName() + " (Copy)";
        createReq.setName(targetName);
        createReq.setDescription(source.getDescription());
        createReq.setSubmissionDeadline(shiftDate(source.getSubmissionDeadline(), offsetDays));
        createReq.setRegistrationStart(shiftDate(source.getRegistrationStart(), offsetDays));
        createReq.setRegistrationEnd(shiftDate(source.getRegistrationEnd(), offsetDays));
        createReq.setEventStart(shiftDate(source.getEventStart(), offsetDays));
        createReq.setEventEnd(shiftDate(source.getEventEnd(), offsetDays));
        createReq.setTeamFormationStart(shiftDate(source.getTeamFormationStart(), offsetDays));
        createReq.setTeamFormationEnd(shiftDate(source.getTeamFormationEnd(), offsetDays));
        createReq.setSubmissionStart(shiftDate(source.getSubmissionStart(), offsetDays));
        createReq.setJudgingStart(shiftDate(source.getJudgingStart(), offsetDays));
        createReq.setJudgingEnd(shiftDate(source.getJudgingEnd(), offsetDays));
        createReq.setVotingStart(shiftDate(source.getVotingStart(), offsetDays));
        createReq.setVotingEnd(shiftDate(source.getVotingEnd(), offsetDays));
        createReq.setVotingEnabled(source.getVotingEnabled());
        createReq.setVotingAccessMode(source.getVotingAccessMode());
        createReq.setResultsPublishAt(shiftDate(source.getResultsPublishAt(), offsetDays));

        EventDetailResponse newEvent = eventService.createEvent(createReq, userId);
        Long newEventId = newEvent.getId();

        // 1. Copy Tracks
        if (req == null || Boolean.TRUE.equals(req.getCopyTracks())) {
            List<Track> sourceTracks = trackRepository.findByEventId(sourceEventId);
            for (Track t : sourceTracks) {
                trackRepository.save(new Track(newEventId, t.getName(), t.getDescription()));
            }
        }

        // 2. Copy Rubrics
        if (req == null || Boolean.TRUE.equals(req.getCopyRubrics())) {
            Optional<Rubric> sourceRubricOpt = rubricRepository.findByEventId(sourceEventId);
            if (sourceRubricOpt.isPresent()) {
                Rubric sourceRubric = sourceRubricOpt.get();
                Rubric newRubric = rubricRepository.save(new Rubric(newEventId, false));
                List<RubricCriterion> sourceCriteria = rubricCriterionRepository.findByRubricId(sourceRubric.getId());
                for (RubricCriterion c : sourceCriteria) {
                    rubricCriterionRepository.save(new RubricCriterion(
                            newRubric,
                            c.getName(),
                            c.getCriterionKey(),
                            c.getWeight(),
                            c.getMinScore(),
                            c.getMaxScore()
                    ));
                }
            }
        }

        // 3. Copy Custom Questions
        if (req == null || Boolean.TRUE.equals(req.getCopyCustomQuestions())) {
            if (customQuestionRepository != null) {
                List<EventCustomQuestion> sourceQuestions = customQuestionRepository.findByEventIdOrderByDisplayOrderAscIdAsc(sourceEventId);
                for (EventCustomQuestion q : sourceQuestions) {
                    customQuestionRepository.save(new EventCustomQuestion(
                            newEventId,
                            q.getPrompt(),
                            q.getQuestionType(),
                            q.isRequired(),
                            q.getDisplayOrder()
                    ));
                }
            }
        }

        auditLogService.logAction(userId, sourceEventId, "EVENT_CLONED",
                "Cloned event " + sourceEventId + " to new event " + newEventId + " (" + targetName + ")");

        return eventService.getEvent(newEventId);
    }

    @Transactional(readOnly = true)
    public String exportAuditLogsCsv(Long eventId, Long userId) {
        authorizationPolicy.requireEventRole(userId, eventId, RoleType.ORGANIZER);
        List<AuditLog> logs = auditLogRepository.findByEventIdOrderByCreatedAtDesc(eventId);
        StringBuilder sb = new StringBuilder();
        sb.append("ID,Timestamp,User ID,Action,Details,IP Address\r\n");
        for (AuditLog l : logs) {
            sb.append(l.getId()).append(",");
            sb.append(l.getCreatedAt() != null ? l.getCreatedAt().toString() : "").append(",");
            sb.append(l.getUserId() != null ? l.getUserId().toString() : "").append(",");
            sb.append(escapeCsv(l.getAction())).append(",");
            sb.append(escapeCsv(l.getDetails())).append(",");
            sb.append(escapeCsv(l.getIpAddress())).append("\r\n");
        }
        return sb.toString();
    }

    private Instant shiftDate(Instant date, long days) {
        if (date == null || days == 0) return date;
        return date.plus(Duration.ofDays(days));
    }

    private String escapeCsv(String val) {
        if (val == null) return "\"\"";
        return "\"" + val.replace("\"", "\"\"") + "\"";
    }
}
