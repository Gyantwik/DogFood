package com.dogfood.voting;

import com.dogfood.auth.RoleType;
import com.dogfood.common.RateLimitExceededException;
import com.dogfood.common.audit.AuditLogService;
import com.dogfood.events.Event;
import com.dogfood.events.EventRepository;
import com.dogfood.events.Submission;
import com.dogfood.events.SubmissionRepository;
import com.dogfood.security.EventAuthorizationPolicy;
import com.dogfood.security.UserPrincipal;
import com.dogfood.voting.dto.*;
import com.dogfood.webhooks.WebhookService;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class VotingService {

    private final VoteRepository voteRepository;
    private final EventRepository eventRepository;
    private final SubmissionRepository submissionRepository;
    private final EventAuthorizationPolicy authorizationPolicy;
    private final AuditLogService auditLogService;
    private final WebhookService webhookService;
    private final java.util.concurrent.ConcurrentHashMap<String, java.util.List<Instant>> ipRateLimitTracker = new java.util.concurrent.ConcurrentHashMap<>();

    public VotingService(
            VoteRepository voteRepository,
            EventRepository eventRepository,
            SubmissionRepository submissionRepository,
            EventAuthorizationPolicy authorizationPolicy,
            AuditLogService auditLogService,
            WebhookService webhookService) {
        this.voteRepository = voteRepository;
        this.eventRepository = eventRepository;
        this.submissionRepository = submissionRepository;
        this.authorizationPolicy = authorizationPolicy;
        this.auditLogService = auditLogService;
        this.webhookService = webhookService;
    }

    @Transactional
    public VoteResponse submitVote(Long eventId, VoteRequest request, Long userId, String ipAddress) {
        Event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new IllegalArgumentException("Event not found: " + eventId));

        if (!Boolean.TRUE.equals(event.getVotingEnabled())) {
            throw new IllegalStateException("Community voting is not enabled for this event");
        }

        Instant now = Instant.now();
        if (event.getVotingStart() != null && now.isBefore(event.getVotingStart())) {
            throw new IllegalStateException("Voting has not started yet. Starts at " + event.getVotingStart());
        }
        if (event.getVotingEnd() != null && now.isAfter(event.getVotingEnd())) {
            throw new IllegalStateException("Voting has ended for this event");
        }

        // Rate limiting check: max 5 voting attempts per IP in last 60 seconds
        if (ipAddress != null && !ipAddress.isBlank()) {
            Instant cutoff = now.minusSeconds(60);
            java.util.List<Instant> timestamps = ipRateLimitTracker.computeIfAbsent(ipAddress.trim(), k -> java.util.Collections.synchronizedList(new java.util.ArrayList<>()));
            synchronized (timestamps) {
                timestamps.removeIf(t -> t.isBefore(cutoff));
                if (timestamps.size() >= 5) {
                    auditLogService.logAction(userId, eventId, "VOTE_RATE_LIMITED", "Rate limit exceeded for IP: " + ipAddress, ipAddress);
                    throw new RateLimitExceededException("Too many voting requests from this network. Please wait a minute before voting again.");
                }
                timestamps.add(now);
            }
        }

        // Determine voter identifier based on access mode
        String mode = event.getVotingAccessMode() != null ? event.getVotingAccessMode().toUpperCase() : "OPEN";
        String voterIdentifier;
        String voterType;
        String email = null;

        if ("AUTHENTICATED".equals(mode)) {
            if (userId == null) {
                throw new AccessDeniedException("Authentication required: Please log in to vote in this event");
            }
            voterIdentifier = "user:" + userId;
            voterType = "AUTHENTICATED";
        } else if ("EMAIL".equals(mode)) {
            if (request.getVoterEmail() == null || request.getVoterEmail().isBlank() || !request.getVoterEmail().contains("@")) {
                throw new IllegalArgumentException("A valid email address is required for email-gated voting");
            }
            email = request.getVoterEmail().trim().toLowerCase();
            voterIdentifier = "email:" + email;
            voterType = "EMAIL";
        } else {
            // OPEN mode
            voterType = "OPEN";
            if (userId != null) {
                voterIdentifier = "user:" + userId;
            } else if (request.getVoterIdentifier() != null && !request.getVoterIdentifier().isBlank()) {
                voterIdentifier = "client:" + request.getVoterIdentifier().trim();
            } else if (request.getVoterEmail() != null && !request.getVoterEmail().isBlank()) {
                email = request.getVoterEmail().trim().toLowerCase();
                voterIdentifier = "email:" + email;
            } else if (ipAddress != null && !ipAddress.isBlank()) {
                voterIdentifier = "ip:" + ipAddress.trim();
            } else {
                throw new IllegalArgumentException("Voter identification is required");
            }
        }

        // Duplicate check
        if (voteRepository.existsByEventIdAndVoterIdentifier(eventId, voterIdentifier)) {
            auditLogService.logAction(userId, eventId, "DUPLICATE_VOTE_REJECTED", "Duplicate vote rejected for identifier: " + voterIdentifier, ipAddress);
            throw new IllegalStateException("Duplicate vote: You have already cast a vote for this event.");
        }

        // Validate submission
        Submission submission = submissionRepository.findById(request.getSubmissionId())
                .orElseThrow(() -> new IllegalArgumentException("Submission not found: " + request.getSubmissionId()));

        if (!submission.getEventId().equals(eventId)) {
            throw new IllegalArgumentException("Submission does not belong to this event");
        }

        if (!"SUBMITTED".equalsIgnoreCase(submission.getStatus())) {
            throw new IllegalArgumentException("Cannot vote for an unsubmitted project");
        }

        Vote vote = new Vote(eventId, submission.getId(), voterIdentifier, voterType, userId, email, ipAddress);
        vote = voteRepository.save(vote);

        auditLogService.logAction(userId, eventId, "VOTE_CREATED", "Vote cast for submission '" + submission.getTitle() + "' (ID: " + submission.getId() + ")", ipAddress);

        // Dispatch webhook
        try {
            Map<String, Object> webhookData = new LinkedHashMap<>();
            webhookData.put("voteId", vote.getId());
            webhookData.put("eventId", eventId);
            webhookData.put("submissionId", submission.getId());
            webhookData.put("submissionTitle", submission.getTitle());
            webhookData.put("voterType", voterType);
            webhookData.put("createdAt", vote.getCreatedAt().toString());
            webhookService.dispatch(eventId, "vote.created", webhookData);
        } catch (Exception e) {
            // Non-blocking webhook dispatch
        }

        return new VoteResponse(vote.getId(), submission.getId(), voterIdentifier, "Vote recorded successfully");
    }

    @Transactional(readOnly = true)
    public VotingStatusResponse getVotingStatus(Long eventId, String clientIdentifier, Long userId) {
        Event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new IllegalArgumentException("Event not found: " + eventId));

        boolean enabled = Boolean.TRUE.equals(event.getVotingEnabled());
        String accessMode = event.getVotingAccessMode() != null ? event.getVotingAccessMode().toUpperCase() : "OPEN";
        Instant now = Instant.now();

        boolean isBefore = event.getVotingStart() != null && now.isBefore(event.getVotingStart());
        boolean isAfter = event.getVotingEnd() != null && now.isAfter(event.getVotingEnd());
        boolean open = enabled && !isBefore && !isAfter;

        boolean hasVoted = false;
        Long votedSubmissionId = null;

        if (userId != null) {
            Optional<Vote> v = voteRepository.findByEventIdAndVoterIdentifier(eventId, "user:" + userId);
            if (v.isPresent()) {
                hasVoted = true;
                votedSubmissionId = v.get().getSubmissionId();
            }
        }
        if (!hasVoted && clientIdentifier != null && !clientIdentifier.isBlank()) {
            Optional<Vote> v = voteRepository.findByEventIdAndVoterIdentifier(eventId, "client:" + clientIdentifier.trim());
            if (v.isPresent()) {
                hasVoted = true;
                votedSubmissionId = v.get().getSubmissionId();
            }
        }

        long totalVotes = voteRepository.countByEventId(eventId);

        return new VotingStatusResponse(
                enabled,
                accessMode,
                event.getVotingStart(),
                event.getVotingEnd(),
                open,
                hasVoted,
                votedSubmissionId,
                totalVotes
        );
    }

    @Transactional(readOnly = true)
    public List<BallotItemDto> getBallot(Long eventId) {
        if (!eventRepository.existsById(eventId)) {
            throw new IllegalArgumentException("Event not found: " + eventId);
        }

        List<Submission> submissions = submissionRepository.findByEventIdAndStatus(eventId, "SUBMITTED");
        List<BallotItemDto> items = submissions.stream().map(s -> new BallotItemDto(
                s.getId(),
                s.getTitle(),
                s.getTagline(),
                s.getDescription(),
                s.getTrack(),
                s.getDemoUrl(),
                s.getRepoUrl()
        )).collect(Collectors.toList());

        // Shuffle deterministically or randomly so all ballots present all items without bias or duplication
        Collections.shuffle(items, new Random());
        return items;
    }

    @Transactional(readOnly = true)
    public List<VotingResultItemDto> getVotingResults(Long eventId, UserPrincipal currentUser) {
        Event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new IllegalArgumentException("Event not found: " + eventId));

        Instant publishAt = event.getResultsPublishAt();
        if (publishAt == null) {
            publishAt = event.getJudgingEnd();
        }

        boolean isClosed = "CLOSED".equalsIgnoreCase(event.getStatus());
        boolean isPublished = isClosed || (publishAt != null && Instant.now().isAfter(publishAt));

        boolean isOrganizerOrAdmin = currentUser != null && (
                authorizationPolicy.hasEventRole(currentUser.getId(), eventId, RoleType.ORGANIZER) ||
                authorizationPolicy.hasEventRole(currentUser.getId(), eventId, RoleType.ADMIN) ||
                authorizationPolicy.isOrganizerOrAdmin(currentUser.getId()) ||
                (currentUser.getAuthorities() != null && currentUser.getAuthorities().stream().anyMatch(a ->
                        a.getAuthority().equals("ROLE_ORGANIZER") ||
                        a.getAuthority().equals("ROLE_ADMIN")
                ))
        );

        if (!isOrganizerOrAdmin && !isPublished) {
            String msg = publishAt != null
                    ? "Community voting results are hidden until published at " + publishAt
                    : "Community voting results are hidden until judging completes and results are published.";
            throw new AccessDeniedException(msg);
        }

        List<Object[]> counts = voteRepository.countVotesBySubmissionForEvent(eventId);
        Map<Long, Long> countMap = new HashMap<>();
        for (Object[] row : counts) {
            Long subId = (Long) row[0];
            Long count = (Long) row[1];
            countMap.put(subId, count);
        }

        List<Submission> submissions = submissionRepository.findByEventIdAndStatus(eventId, "SUBMITTED");
        List<VotingResultItemDto> results = new ArrayList<>();

        for (Submission s : submissions) {
            long count = countMap.getOrDefault(s.getId(), 0L);
            results.add(new VotingResultItemDto(
                    s.getId(),
                    s.getTitle(),
                    s.getTrack(),
                    count
            ));
        }

        // Sort descending by vote count
        results.sort((a, b) -> Long.compare(b.getVoteCount(), a.getVoteCount()));
        return results;
    }
}
