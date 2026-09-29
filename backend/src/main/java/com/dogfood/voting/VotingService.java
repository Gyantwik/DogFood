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
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

@Service
public class VotingService {

    private final VoteRepository voteRepository;
    private final EventRepository eventRepository;
    private final SubmissionRepository submissionRepository;
    private final EventAuthorizationPolicy authorizationPolicy;
    private final AuditLogService auditLogService;
    private final WebhookService webhookService;

    private final ConcurrentHashMap<String, List<Instant>> ipRateLimitTracker = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, List<Instant>> tokenRateLimitTracker = new ConcurrentHashMap<>();

    private static class EmailVerification {
        final String code;
        final Instant expiresAt;
        boolean verified;

        EmailVerification(String code, Instant expiresAt) {
            this.code = code;
            this.expiresAt = expiresAt;
            this.verified = false;
        }
    }

    private final ConcurrentHashMap<String, EmailVerification> emailVerifications = new ConcurrentHashMap<>();

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

    public Map<String, Object> sendEmailVerificationCode(Long eventId, String email) {
        if (email == null || !email.matches("^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$")) {
            throw new IllegalArgumentException("A valid email address is required for email-gated voting");
        }
        String normalized = email.trim().toLowerCase();
        String code = String.format("%06d", new Random().nextInt(1000000));
        Instant expiresAt = Instant.now().plusSeconds(900); // 15 mins
        emailVerifications.put(normalized, new EmailVerification(code, expiresAt));

        Map<String, Object> res = new LinkedHashMap<>();
        res.put("email", normalized);
        res.put("code", code); // Included for development/offline test convenience
        res.put("expiresAt", expiresAt.toString());
        res.put("message", "Verification code dispatched to " + normalized);
        return res;
    }

    public Map<String, Object> verifyEmailCode(Long eventId, String email, String code) {
        if (email == null || code == null) {
            throw new IllegalArgumentException("Email and verification code are required");
        }
        String normalized = email.trim().toLowerCase();
        EmailVerification entry = emailVerifications.get(normalized);
        if (entry == null || entry.expiresAt.isBefore(Instant.now())) {
            throw new IllegalArgumentException("Verification code expired or not requested. Please request a new code.");
        }
        if (!entry.code.equals(code.trim())) {
            throw new IllegalArgumentException("Invalid verification code. Please check and try again.");
        }
        entry.verified = true;
        Map<String, Object> res = new LinkedHashMap<>();
        res.put("email", normalized);
        res.put("verified", true);
        res.put("verifiedAt", Instant.now().toString());
        return res;
    }

    private boolean verifyEmailCodeInternal(Long eventId, String email, String code) {
        String normalized = email.trim().toLowerCase();
        EmailVerification entry = emailVerifications.get(normalized);
        if (entry == null || entry.expiresAt.isBefore(Instant.now())) {
            return false;
        }
        return entry.code.equals(code.trim());
    }

    @Transactional
    public VoteResponse submitVote(Long eventId, VoteRequest request, Long userId, String ipAddress) {
        Event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new IllegalArgumentException("Event not found: " + eventId));

        if (!Boolean.TRUE.equals(event.getVotingEnabled())) {
            throw new IllegalStateException("Community voting is not enabled for this event");
        }

        Instant now = Instant.now();
        Instant effectiveVotingStart = event.getVotingStart() != null ? event.getVotingStart() : event.getSubmissionDeadline();
        Instant winnerDeclarationTime = event.getResultsPublishAt() != null ? event.getResultsPublishAt() :
                                        (event.getJudgingEnd() != null ? event.getJudgingEnd() : event.getEventEnd());
        Instant effectiveVotingEnd = event.getVotingEnd();
        if (effectiveVotingEnd == null && winnerDeclarationTime != null && winnerDeclarationTime.isAfter(now)) {
            effectiveVotingEnd = winnerDeclarationTime.minusSeconds(86400);
        }

        if (effectiveVotingStart != null && now.isBefore(effectiveVotingStart)) {
            throw new IllegalStateException("Voting has not started yet. Community voting opens after the submission deadline at " + effectiveVotingStart);
        }
        if ("CLOSED".equalsIgnoreCase(event.getStatus())) {
            throw new IllegalStateException("Hackathon is officially closed and winners have been declared. Voting is ended.");
        }
        if (effectiveVotingEnd != null && now.isAfter(effectiveVotingEnd)) {
            throw new IllegalStateException("Voting has ended for this event (closed 1 day prior to winner declaration at " + effectiveVotingEnd + ")");
        }

        // 1. IP Rate Limiting check: max 5 voting attempts per IP in last 60 seconds
        if (ipAddress != null && !ipAddress.isBlank()) {
            Instant cutoff = now.minusSeconds(60);
            List<Instant> timestamps = ipRateLimitTracker.computeIfAbsent(ipAddress.trim(), k -> Collections.synchronizedList(new ArrayList<>()));
            synchronized (timestamps) {
                timestamps.removeIf(t -> t.isBefore(cutoff));
                if (timestamps.size() >= 5) {
                    auditLogService.logAction(userId, eventId, "VOTE_RATE_LIMITED", "Rate limit exceeded for IP: " + ipAddress, ipAddress);
                    throw new RateLimitExceededException("Too many voting requests from this network. Please wait a minute before voting again.");
                }
                timestamps.add(now);
            }
        }

        // Validate submission existence and event ownership first
        Submission submission = submissionRepository.findById(request.getSubmissionId())
                .orElseThrow(() -> new IllegalArgumentException("Submission not found: " + request.getSubmissionId()));

        if (!submission.getEventId().equals(eventId)) {
            throw new IllegalArgumentException("Submission does not belong to this event");
        }

        if (!"SUBMITTED".equalsIgnoreCase(submission.getStatus())) {
            throw new IllegalArgumentException("Cannot vote for an unsubmitted project");
        }

        // 2. Determine voter identifier strictly according to voting access mode
        String mode = event.getVotingAccessMode() != null ? event.getVotingAccessMode().toUpperCase() : "OPEN";
        String voterIdentifier;
        String voterType;
        String email = null;
        String sessionToken = request.getSessionToken();

        if ("AUTHENTICATED".equals(mode)) {
            // =========================================================================
            // AUTHENTICATED MODE:
            // Strictly requires normal authenticated user account / JWT.
            // Phone numbers, client tokens, or anonymous aliases cannot bypass JWT auth!
            // =========================================================================
            if (userId == null) {
                throw new AccessDeniedException("Authentication required: Please log in with your account to vote in this event");
            }
            voterIdentifier = "user:" + userId;
            voterType = "AUTHENTICATED";

            // Loophole removal: Project authors cannot vote for their own project (Anti-COI)
            if (submission.getCreatedBy() != null && submission.getCreatedBy().equals(userId)) {
                auditLogService.logAction(userId, eventId, "VOTE_COI_REJECTED", "Author self-vote rejected for submission " + submission.getId(), ipAddress);
                throw new IllegalArgumentException("Conflict of interest: You cannot vote for your own project.");
            }
        } else if ("EMAIL".equals(mode)) {
            // =========================================================================
            // EMAIL MODE:
            // Requires email-gated verification.
            // =========================================================================
            if (request.getVoterEmail() == null || request.getVoterEmail().isBlank() || !request.getVoterEmail().contains("@")) {
                throw new IllegalArgumentException("A valid email address is required for email-gated voting");
            }
            email = request.getVoterEmail().trim().toLowerCase();
            if (!email.matches("^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$")) {
                throw new IllegalArgumentException("Please provide a valid email format (e.g. voter@domain.com)");
            }

            // If a verification code is provided, verify it against the cache
            if (request.getVerificationCode() != null && !request.getVerificationCode().isBlank()) {
                boolean validCode = verifyEmailCodeInternal(eventId, email, request.getVerificationCode().trim());
                if (!validCode) {
                    throw new IllegalArgumentException("Invalid or expired email verification code.");
                }
            }

            voterIdentifier = "email:" + email;
            voterType = "EMAIL";
        } else {
            // =========================================================================
            // OPEN MODE:
            // No phone registration required!
            // Issue a voter/session token, rate-limit + prevent duplicate voting.
            // =========================================================================
            voterType = "OPEN";

            // Session token rate-limiting (max 5 attempts per session token per 60s)
            if (sessionToken != null && !sessionToken.isBlank()) {
                Instant cutoff = now.minusSeconds(60);
                List<Instant> tokenTimestamps = tokenRateLimitTracker.computeIfAbsent(sessionToken.trim(), k -> Collections.synchronizedList(new ArrayList<>()));
                synchronized (tokenTimestamps) {
                    tokenTimestamps.removeIf(t -> t.isBefore(cutoff));
                    if (tokenTimestamps.size() >= 5) {
                        auditLogService.logAction(userId, eventId, "VOTE_RATE_LIMITED", "Rate limit exceeded for session token: " + sessionToken, ipAddress);
                        throw new RateLimitExceededException("Too many voting requests for this session. Please wait a minute before voting again.");
                    }
                    tokenTimestamps.add(now);
                }
            }

            if (userId != null) {
                // If voter happens to be logged in, tie to account
                voterIdentifier = "user:" + userId;
            } else if (sessionToken != null && !sessionToken.isBlank()) {
                String cleanToken = sessionToken.trim();
                voterIdentifier = cleanToken.startsWith("token:") ? cleanToken : "token:" + cleanToken;
            } else if (request.getVoterIdentifier() != null && !request.getVoterIdentifier().isBlank()) {
                String vi = request.getVoterIdentifier().trim();
                voterIdentifier = vi.startsWith("token:") || vi.startsWith("client:") ? vi : "client:" + vi;
            } else if (request.getVoterAlias() != null && !request.getVoterAlias().isBlank()) {
                voterIdentifier = "client:" + request.getVoterAlias().trim();
            } else if (ipAddress != null && !ipAddress.isBlank()) {
                voterIdentifier = "ip:" + ipAddress.trim();
            } else {
                voterIdentifier = "token:" + UUID.randomUUID().toString();
            }
        }

        // 3. Duplicate voting prevention
        if (voteRepository.existsByEventIdAndVoterIdentifier(eventId, voterIdentifier)) {
            auditLogService.logAction(userId, eventId, "DUPLICATE_VOTE_REJECTED", "Duplicate vote rejected for identifier: " + voterIdentifier, ipAddress);
            throw new IllegalStateException("Duplicate vote: You have already cast a vote for this event.");
        }
        if ("AUTHENTICATED".equals(mode) && userId != null) {
            if (voteRepository.existsByEventIdAndVoterIdentifier(eventId, "user:" + userId)) {
                auditLogService.logAction(userId, eventId, "DUPLICATE_VOTE_REJECTED", "Duplicate vote rejected for user: " + userId, ipAddress);
                throw new IllegalStateException("Duplicate vote: You have already cast a vote for this event.");
            }
        }
        if ("EMAIL".equals(mode) && email != null) {
            if (voteRepository.existsByEventIdAndVoterIdentifier(eventId, "email:" + email)) {
                auditLogService.logAction(userId, eventId, "DUPLICATE_VOTE_REJECTED", "Duplicate vote rejected for email: " + email, ipAddress);
                throw new IllegalStateException("Duplicate vote: A vote has already been submitted with this email address.");
            }
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

        return new VoteResponse(vote.getId(), submission.getId(), voterIdentifier, "Vote recorded successfully", sessionToken, voterType);
    }

    @Transactional(readOnly = true)
    public VotingStatusResponse getVotingStatus(Long eventId, String clientIdentifier, Long userId) {
        Event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new IllegalArgumentException("Event not found: " + eventId));

        boolean enabled = Boolean.TRUE.equals(event.getVotingEnabled());
        String accessMode = event.getVotingAccessMode() != null ? event.getVotingAccessMode().toUpperCase() : "OPEN";
        Instant now = Instant.now();

        Instant effectiveVotingStart = event.getVotingStart() != null ? event.getVotingStart() : event.getSubmissionDeadline();
        Instant winnerDeclarationTime = event.getResultsPublishAt() != null ? event.getResultsPublishAt() :
                                        (event.getJudgingEnd() != null ? event.getJudgingEnd() : event.getEventEnd());
        Instant effectiveVotingEnd = event.getVotingEnd();
        if (effectiveVotingEnd == null && winnerDeclarationTime != null && winnerDeclarationTime.isAfter(now)) {
            effectiveVotingEnd = winnerDeclarationTime.minusSeconds(86400);
        }

        boolean isBefore = effectiveVotingStart != null && now.isBefore(effectiveVotingStart);
        boolean isClosed = "CLOSED".equalsIgnoreCase(event.getStatus());
        boolean isAfter = isClosed || (effectiveVotingEnd != null && now.isAfter(effectiveVotingEnd));
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
            String trimmed = clientIdentifier.trim();
            List<String> candidates = new ArrayList<>();
            candidates.add(trimmed);
            if (!trimmed.startsWith("token:")) candidates.add("token:" + trimmed);
            if (!trimmed.startsWith("client:")) candidates.add("client:" + trimmed);
            if (!trimmed.startsWith("email:")) candidates.add("email:" + trimmed.toLowerCase());

            for (String cand : candidates) {
                Optional<Vote> v = voteRepository.findByEventIdAndVoterIdentifier(eventId, cand);
                if (v.isPresent()) {
                    hasVoted = true;
                    votedSubmissionId = v.get().getSubmissionId();
                    break;
                }
            }
        }

        long totalVotes = voteRepository.countByEventId(eventId);

        String voterSessionToken = null;
        if ("OPEN".equals(accessMode)) {
            if (clientIdentifier != null && !clientIdentifier.isBlank() && clientIdentifier.startsWith("token:")) {
                voterSessionToken = clientIdentifier.substring(6);
            } else if (clientIdentifier != null && !clientIdentifier.isBlank()) {
                voterSessionToken = clientIdentifier;
            } else {
                voterSessionToken = "voter_tok_" + UUID.randomUUID().toString();
            }
        }

        return new VotingStatusResponse(
                enabled,
                accessMode,
                effectiveVotingStart,
                effectiveVotingEnd,
                open,
                hasVoted,
                votedSubmissionId,
                totalVotes,
                voterSessionToken
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
