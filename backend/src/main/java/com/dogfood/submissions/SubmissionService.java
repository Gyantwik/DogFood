package com.dogfood.submissions;

import com.dogfood.auth.EventRole;
import com.dogfood.auth.EventRoleRepository;
import com.dogfood.auth.RoleType;
import com.dogfood.auth.User;
import com.dogfood.auth.UserRepository;
import com.dogfood.common.audit.AuditLogService;
import com.dogfood.events.Event;
import com.dogfood.events.EventRepository;
import com.dogfood.events.Submission;
import com.dogfood.events.SubmissionRepository;
import com.dogfood.security.EventAuthorizationPolicy;
import com.dogfood.teams.Team;
import com.dogfood.teams.TeamMember;
import com.dogfood.teams.TeamMemberRepository;
import com.dogfood.teams.TeamRepository;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class SubmissionService {

    private final SubmissionRepository submissionRepository;
    private final EventRepository eventRepository;
    private final TeamMemberRepository teamMemberRepository;
    private final TeamRepository teamRepository;
    private final EventRoleRepository eventRoleRepository;
    private final UserRepository userRepository;
    private final AuditLogService auditLogService;
    private final EventAuthorizationPolicy authorizationPolicy;
    private final ObjectMapper objectMapper;
    private final com.dogfood.webhooks.WebhookService webhookService;

    public SubmissionService(
            SubmissionRepository submissionRepository,
            EventRepository eventRepository,
            TeamMemberRepository teamMemberRepository,
            TeamRepository teamRepository,
            EventRoleRepository eventRoleRepository,
            UserRepository userRepository,
            AuditLogService auditLogService,
            EventAuthorizationPolicy authorizationPolicy) {
        this(submissionRepository, eventRepository, teamMemberRepository, teamRepository,
                eventRoleRepository, userRepository, auditLogService, authorizationPolicy, null);
    }

    @org.springframework.beans.factory.annotation.Autowired
    public SubmissionService(
            SubmissionRepository submissionRepository,
            EventRepository eventRepository,
            TeamMemberRepository teamMemberRepository,
            TeamRepository teamRepository,
            EventRoleRepository eventRoleRepository,
            UserRepository userRepository,
            AuditLogService auditLogService,
            EventAuthorizationPolicy authorizationPolicy,
            com.dogfood.webhooks.WebhookService webhookService) {
        this.submissionRepository = submissionRepository;
        this.eventRepository = eventRepository;
        this.teamMemberRepository = teamMemberRepository;
        this.teamRepository = teamRepository;
        this.eventRoleRepository = eventRoleRepository;
        this.userRepository = userRepository;
        this.auditLogService = auditLogService;
        this.authorizationPolicy = authorizationPolicy;
        this.webhookService = webhookService;
        this.objectMapper = new ObjectMapper();
    }

    @Transactional
    public SubmissionResponse createSubmission(Long eventId, CreateSubmissionRequest request, Long userId) {
        Event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new IllegalArgumentException("Event not found with id: " + eventId));

        if (event.getStatus() != null && !"OPEN".equalsIgnoreCase(event.getStatus())) {
            throw new IllegalStateException("Submissions are closed for this event");
        }

        // Submission Window Enforcement
        Instant now = Instant.now();
        Instant effectiveSubStart = event.getSubmissionStart() != null ? event.getSubmissionStart() : event.getRegistrationEnd();
        if (effectiveSubStart != null && now.isBefore(effectiveSubStart)) {
            throw new IllegalStateException("Submission period has not opened yet");
        }
        if (event.getSubmissionDeadline() != null && now.isAfter(event.getSubmissionDeadline())) {
            throw new IllegalStateException("Submission deadline has passed for this event");
        }

        // Resolve target team for this submission
        Long targetTeamId = request.getTeamId();
        if (targetTeamId == null && userId != null) {
            List<TeamMember> userMemberships = teamMemberRepository.findByUserId(userId);
            for (TeamMember m : userMemberships) {
                Team t = m.getTeam();
                if (t == null && m.getTeamId() != null) {
                    t = teamRepository.findById(m.getTeamId()).orElse(null);
                }
                if (t != null && eventId.equals(t.getEventId())) {
                    targetTeamId = t.getId();
                    break;
                }
            }
        }

        if (targetTeamId != null) {
            final Long finalTargetTeamId = targetTeamId;
            Team team = teamRepository.findById(finalTargetTeamId)
                    .orElseThrow(() -> new IllegalArgumentException("Team not found with id: " + finalTargetTeamId));
            if (!eventId.equals(team.getEventId())) {
                throw new IllegalArgumentException("Team does not belong to the specified event");
            }
            boolean isMember = teamMemberRepository.existsByTeamIdAndUserId(finalTargetTeamId, userId);
            if (!isMember) {
                throw new AccessDeniedException("User is not a member of the specified team");
            }
            // Strict team leader enforcement: only the team leader can submit or create a project for the team
            if (!Objects.equals(team.getLeaderId(), userId)) {
                throw new AccessDeniedException("Only the team leader can submit or create a project for the team");
            }
        }

        // Ensure user has PARTICIPANT role
        if (userId != null) {
            User user = userRepository.findById(userId).orElse(null);
            if (user != null && eventRoleRepository.findByUserIdAndEventIdAndRole(userId, eventId, RoleType.PARTICIPANT).isEmpty()) {
                eventRoleRepository.save(new EventRole(user, eventId, RoleType.PARTICIPANT));
            }
        }

        // Duplicate checks (FLAG, DO NOT BLOCK)
        boolean isDup = false;
        if (request.getRepoUrl() != null && !request.getRepoUrl().isBlank()) {
            isDup = submissionRepository.existsByEventIdAndRepoUrl(eventId, request.getRepoUrl().trim());
        }

        String contentHash = null;
        if (request.getDescription() != null && !request.getDescription().isBlank()) {
            contentHash = computeSha256(request.getDescription().trim());
            if (!isDup && submissionRepository.existsByEventIdAndContentHash(eventId, contentHash)) {
                isDup = true;
            }
        }

        String status = "SUBMITTED";
        if (request.getStatus() != null && "DRAFT".equalsIgnoreCase(request.getStatus().trim())) {
            status = "DRAFT";
        }

        String techStackJson = serializeTechStack(request.getTechStack());

        Submission submission = new Submission(
                null,
                eventId,
                targetTeamId,
                request.getTitle(),
                request.getTagline(),
                request.getDescription(),
                request.getTrack() != null ? request.getTrack() : "General",
                request.getRepoUrl(),
                request.getDemoUrl(),
                techStackJson,
                status,
                isDup,
                contentHash,
                userId,
                Instant.now(),
                Instant.now()
        );
        submission.setThumbnailUrl(request.getThumbnailUrl());
        submission.setGalleryImages(serializeGalleryImages(request.getGalleryImages()));
        submission.setDemoVideoUrl(request.getDemoVideoUrl());
        submission.setLiveLink(request.getLiveLink());
        submission.setCustomAnswers(serializeCustomAnswers(request.getCustomAnswers()));
        submission.setVersionNumber(1);
        submission.setUpdatedBy(userId);

        submission = submissionRepository.save(submission);
        auditLogService.logAction(userId, eventId, "CREATE_SUBMISSION", "Created submission: " + submission.getTitle() + " (v1, Dup: " + isDup + ")");

        if (webhookService != null) {
            try {
                webhookService.dispatch(eventId, "submission.created", Map.of(
                        "submissionId", submission.getId(),
                        "title", submission.getTitle(),
                        "eventId", eventId,
                        "status", submission.getStatus()
                ));
            } catch (Exception ignored) {}
        }

        return mapToResponse(submission);
    }

    @Transactional
    public SubmissionResponse updateSubmission(Long submissionId, UpdateSubmissionRequest request, Long userId) {
        return updateSubmission(submissionId, request, userId, null);
    }

    @Transactional
    public SubmissionResponse updateSubmission(Long submissionId, UpdateSubmissionRequest request, Long userId, Long eventContextId) {
        Submission submission = submissionRepository.findById(submissionId)
                .orElseThrow(() -> new IllegalArgumentException("Submission not found with id: " + submissionId));

        if (eventContextId != null && !submission.getEventId().equals(eventContextId)) {
            throw new IllegalArgumentException("Submission does not belong to the specified event");
        }

        Long eventId = submission.getEventId();
        Event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new IllegalArgumentException("Event not found with id: " + eventId));

        // Authorization check: creator, team leader, or organizer
        boolean isOrganizer = authorizationPolicy.hasEventRole(userId, submission.getEventId(), RoleType.ORGANIZER)
                || authorizationPolicy.hasEventRole(userId, submission.getEventId(), RoleType.ADMIN)
                || authorizationPolicy.isOrganizerOrAdmin(userId);

        if (!isOrganizer && event.getStatus() != null && !"OPEN".equalsIgnoreCase(event.getStatus())) {
            throw new IllegalStateException("Submissions are closed for this event");
        }

        // Submission Window Enforcement
        Instant now = Instant.now();
        Instant effectiveSubStart = event.getSubmissionStart() != null ? event.getSubmissionStart() : event.getRegistrationEnd();
        if (!isOrganizer && effectiveSubStart != null && now.isBefore(effectiveSubStart)) {
            throw new IllegalStateException("Submission period has not opened yet");
        }
        if (!isOrganizer && event.getSubmissionDeadline() != null && now.isAfter(event.getSubmissionDeadline())) {
            throw new IllegalStateException("Submission deadline has passed for this event");
        }
        Long teamId = submission.getTeamId();
        if (teamId == null && userId != null) {
            List<TeamMember> userMemberships = teamMemberRepository.findByUserId(userId);
            for (TeamMember m : userMemberships) {
                Team t = m.getTeam();
                if (t == null && m.getTeamId() != null) {
                    t = teamRepository.findById(m.getTeamId()).orElse(null);
                }
                if (t != null && submission.getEventId().equals(t.getEventId())) {
                    teamId = t.getId();
                    break;
                }
            }
        }

        if (teamId != null) {
            final Long finalTeamId = teamId;
            Team team = teamRepository.findById(finalTeamId)
                    .orElseThrow(() -> new IllegalArgumentException("Team not found with id: " + finalTeamId));
            boolean isMember = teamMemberRepository.existsByTeamIdAndUserId(finalTeamId, userId);
            if (!isMember && !isOrganizer) {
                throw new AccessDeniedException("User is not a member of the specified team");
            }
            if (!isOrganizer && !Objects.equals(team.getLeaderId(), userId)) {
                throw new AccessDeniedException("Only the team leader can submit or edit a project for the team");
            }
        } else {
            boolean isCreator = Objects.equals(submission.getCreatedBy(), userId);
            if (!isCreator && !isOrganizer) {
                throw new AccessDeniedException("You are not authorized to edit this submission");
            }
        }

        // Submission State Machine Enforcement
        String currentStatus = submission.getStatus() != null ? submission.getStatus().toUpperCase() : "DRAFT";
        if ("LOCKED".equals(currentStatus) && !isOrganizer) {
            throw new IllegalStateException("SUBMISSION_STATE_LOCKED: Locked project cannot be modified");
        }

        if (request.getStatus() != null && !request.getStatus().isBlank()) {
            String targetStatus = request.getStatus().trim().toUpperCase();
            if (isOrganizer) {
                if (!List.of("DRAFT", "SUBMITTED", "LOCKED").contains(targetStatus)) {
                    throw new IllegalArgumentException("Invalid status: " + targetStatus);
                }
                submission.setStatus(targetStatus);
            } else {
                // Participant allowed transitions:
                // DRAFT -> DRAFT, DRAFT -> SUBMITTED, SUBMITTED -> SUBMITTED
                if ("DRAFT".equals(currentStatus)) {
                    if ("DRAFT".equals(targetStatus) || "SUBMITTED".equals(targetStatus)) {
                        submission.setStatus(targetStatus);
                    } else {
                        throw new IllegalStateException("Invalid state transition from DRAFT to " + targetStatus);
                    }
                } else if ("SUBMITTED".equals(currentStatus)) {
                    if ("DRAFT".equals(targetStatus)) {
                        throw new IllegalStateException("SUBMISSION_STATE_LOCKED: Submitted project cannot be reverted to draft by participant");
                    } else if ("SUBMITTED".equals(targetStatus)) {
                        submission.setStatus("SUBMITTED");
                    } else {
                        throw new IllegalStateException("Invalid state transition from SUBMITTED to " + targetStatus);
                    }
                } else {
                    throw new IllegalStateException("SUBMISSION_STATE_LOCKED: Project in state " + currentStatus + " cannot be modified by participant");
                }
            }
        }

        if (request.getTitle() != null && !request.getTitle().isBlank()) submission.setTitle(request.getTitle());
        if (request.getTagline() != null) submission.setTagline(request.getTagline());
        if (request.getDescription() != null) {
            submission.setDescription(request.getDescription());
            submission.setContentHash(computeSha256(request.getDescription().trim()));
        }
        if (request.getTrack() != null) submission.setTrack(request.getTrack());
        if (request.getRepoUrl() != null) submission.setRepoUrl(request.getRepoUrl());
        if (request.getDemoUrl() != null) submission.setDemoUrl(request.getDemoUrl());
        if (request.getTechStack() != null) submission.setTechStack(serializeTechStack(request.getTechStack()));
        if (request.getThumbnailUrl() != null) submission.setThumbnailUrl(request.getThumbnailUrl());
        if (request.getGalleryImages() != null) submission.setGalleryImages(serializeGalleryImages(request.getGalleryImages()));
        if (request.getDemoVideoUrl() != null) submission.setDemoVideoUrl(request.getDemoVideoUrl());
        if (request.getLiveLink() != null) submission.setLiveLink(request.getLiveLink());
        if (request.getCustomAnswers() != null) submission.setCustomAnswers(serializeCustomAnswers(request.getCustomAnswers()));

        int nextVer = (submission.getVersionNumber() != null ? submission.getVersionNumber() : 1) + 1;
        submission.setVersionNumber(nextVer);
        submission.setUpdatedBy(userId);
        submission.setUpdatedAt(Instant.now());
        submission = submissionRepository.save(submission);

        auditLogService.logAction(userId, submission.getEventId(), "UPDATE_SUBMISSION", "Updated submission: " + submission.getTitle() + " (v" + nextVer + ")");

        if (webhookService != null) {
            try {
                webhookService.dispatch(submission.getEventId(), "submission.updated", Map.of(
                        "submissionId", submission.getId(),
                        "title", submission.getTitle(),
                        "eventId", submission.getEventId(),
                        "status", submission.getStatus()
                ));
                if ("SUBMITTED".equalsIgnoreCase(submission.getStatus())) {
                    webhookService.dispatch(submission.getEventId(), "submission.submitted", Map.of(
                            "submissionId", submission.getId(),
                            "title", submission.getTitle(),
                            "eventId", submission.getEventId()
                    ));
                }
            } catch (Exception ignored) {}
        }

        return mapToResponse(submission);
    }

    @Transactional(readOnly = true)
    public SubmissionResponse getSubmission(Long submissionId) {
        return getSubmission(submissionId, null, null);
    }

    @Transactional(readOnly = true)
    public SubmissionResponse getSubmission(Long submissionId, Long requestingUserId, Long eventContextId) {
        Submission submission = submissionRepository.findById(submissionId)
                .orElseThrow(() -> new IllegalArgumentException("Submission not found with id: " + submissionId));

        if (eventContextId != null && !submission.getEventId().equals(eventContextId)) {
            throw new IllegalArgumentException("Submission does not belong to the specified event");
        }

        if ("DRAFT".equalsIgnoreCase(submission.getStatus())) {
            if (requestingUserId == null) {
                throw new AccessDeniedException("Access Denied: Private draft submission");
            }
            boolean isCreator = Objects.equals(submission.getCreatedBy(), requestingUserId);
            boolean isTeamMember = submission.getTeamId() != null && teamMemberRepository.existsByTeamIdAndUserId(submission.getTeamId(), requestingUserId);
            boolean isOrganizer = authorizationPolicy.hasEventRole(requestingUserId, submission.getEventId(), RoleType.ORGANIZER);

            if (!isCreator && !isTeamMember && !isOrganizer) {
                throw new AccessDeniedException("Access Denied: Private draft submission");
            }
        }

        return mapToResponse(submission);
    }

    @Transactional(readOnly = true)
    public SubmissionResponse getMySubmission(Long eventId, Long userId) {
        if (userId == null) {
            throw new AccessDeniedException("Authentication required");
        }
        Optional<Submission> mySub = submissionRepository.findFirstByEventIdAndCreatedByOrderByUpdatedAtDesc(eventId, userId);
        if (mySub.isPresent()) {
            return mapToResponse(mySub.get());
        }

        // If not direct creator, check if user belongs to a team in this event that has a submission
        List<TeamMember> userMemberships = teamMemberRepository.findByUserId(userId);
        for (TeamMember m : userMemberships) {
            Team t = m.getTeam();
            if (t == null && m.getTeamId() != null) {
                t = teamRepository.findById(m.getTeamId()).orElse(null);
            }
            if (t != null && eventId.equals(t.getEventId())) {
                Optional<Submission> teamSub = submissionRepository.findFirstByEventIdAndTeamIdOrderByUpdatedAtDesc(eventId, t.getId());
                if (teamSub.isPresent()) {
                    return mapToResponse(teamSub.get());
                }
            }
        }

        return null;
    }

    @Transactional(readOnly = true)
    public List<SubmissionResponse> getGallery(Long eventId, String track, String query, String sort) {
        String cleanTrack = (track != null && !track.isBlank() && !"ALL".equalsIgnoreCase(track)) ? track.trim() : null;
        String cleanQuery = (query != null && !query.isBlank()) ? query.trim() : null;

        List<Submission> list = submissionRepository.searchGallery(eventId, "SUBMITTED", cleanTrack, cleanQuery);

        if ("new".equalsIgnoreCase(sort)) {
            list.sort((a, b) -> b.getCreatedAt().compareTo(a.getCreatedAt()));
        }

        return list.stream().map(this::mapToResponse).collect(Collectors.toList());
    }

    public SubmissionResponse mapToResponse(Submission s) {
        SubmissionResponse res = new SubmissionResponse();
        res.setId(s.getId());
        res.setEventId(s.getEventId());
        res.setTeamId(s.getTeamId());
        res.setTitle(s.getTitle());
        res.setTagline(s.getTagline());
        res.setDescription(s.getDescription());
        res.setTrack(s.getTrack());
        res.setRepoUrl(s.getRepoUrl());
        res.setDemoUrl(s.getDemoUrl());
        res.setTechStack(deserializeTechStack(s.getTechStack()));
        res.setStatus(s.getStatus());
        res.setDuplicateFlag(s.isDuplicateFlag());
        res.setContentHash(s.getContentHash());
        res.setCreatedBy(s.getCreatedBy());

        res.setThumbnailUrl(s.getThumbnailUrl());
        res.setGalleryImages(deserializeGalleryImages(s.getGalleryImages()));
        res.setDemoVideoUrl(s.getDemoVideoUrl());
        res.setLiveLink(s.getLiveLink());
        res.setCustomAnswers(deserializeCustomAnswers(s.getCustomAnswers()));

        res.setCreatedAt(s.getCreatedAt());
        res.setUpdatedAt(s.getUpdatedAt());
        res.setVersionNumber(s.getVersionNumber() != null ? s.getVersionNumber() : 1);
        res.setUpdatedBy(s.getUpdatedBy());
        return res;
    }

    public String serializeGalleryImages(Object gallery) {
        if (gallery == null) return "[]";
        if (gallery instanceof String str) {
            if (str.trim().startsWith("[")) return str;
            List<String> items = Arrays.stream(str.split(","))
                    .map(String::trim)
                    .filter(s -> !s.isEmpty())
                    .collect(Collectors.toList());
            try { return objectMapper.writeValueAsString(items); } catch (Exception e) { return "[]"; }
        }
        try {
            return objectMapper.writeValueAsString(gallery);
        } catch (Exception e) {
            return "[]";
        }
    }

    public List<String> deserializeGalleryImages(String json) {
        if (json == null || json.isBlank()) return Collections.emptyList();
        try {
            return objectMapper.readValue(json, new TypeReference<List<String>>() {});
        } catch (Exception e) {
            return Arrays.stream(json.replace("[", "").replace("]", "").replace("\"", "").split(","))
                    .map(String::trim)
                    .filter(s -> !s.isEmpty())
                    .collect(Collectors.toList());
        }
    }

    public String serializeCustomAnswers(Object customAnswers) {
        if (customAnswers == null) return null;
        if (customAnswers instanceof String str) {
            return str;
        }
        try {
            return objectMapper.writeValueAsString(customAnswers);
        } catch (Exception e) {
            return null;
        }
    }

    public Object deserializeCustomAnswers(String json) {
        if (json == null || json.isBlank()) return Collections.emptyMap();
        try {
            return objectMapper.readValue(json, new TypeReference<Map<String, Object>>() {});
        } catch (Exception e) {
            return json;
        }
    }

    private String serializeTechStack(Object techStack) {
        if (techStack == null) return "[]";
        if (techStack instanceof String str) {
            if (str.trim().startsWith("[")) return str;
            List<String> items = Arrays.stream(str.split(","))
                    .map(String::trim)
                    .filter(s -> !s.isEmpty())
                    .collect(Collectors.toList());
            try { return objectMapper.writeValueAsString(items); } catch (Exception e) { return "[]"; }
        }
        try {
            return objectMapper.writeValueAsString(techStack);
        } catch (Exception e) {
            return "[]";
        }
    }

    private List<String> deserializeTechStack(String json) {
        if (json == null || json.isBlank()) return Collections.emptyList();
        try {
            return objectMapper.readValue(json, new TypeReference<List<String>>() {});
        } catch (Exception e) {
            return Arrays.stream(json.replace("[", "").replace("]", "").replace("\"", "").split(","))
                    .map(String::trim)
                    .filter(s -> !s.isEmpty())
                    .collect(Collectors.toList());
        }
    }

    public static String computeSha256(String input) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(input.getBytes(StandardCharsets.UTF_8));
            StringBuilder hexString = new StringBuilder();
            for (byte b : hash) {
                String hex = Integer.toHexString(0xff & b);
                if (hex.length() == 1) hexString.append('0');
                hexString.append(hex);
            }
            return hexString.toString();
        } catch (NoSuchAlgorithmException e) {
            throw new RuntimeException("SHA-256 not available", e);
        }
    }

    @Transactional(readOnly = true)
    public SubmissionReadinessResponse checkSubmissionReadiness(Long eventId, Long submissionId, Long userId) {
        Event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new IllegalArgumentException("Event not found with id: " + eventId));

        Submission submission = null;
        if (submissionId != null) {
            submission = submissionRepository.findById(submissionId).orElse(null);
        } else if (userId != null) {
            submission = submissionRepository.findFirstByEventIdAndCreatedByOrderByUpdatedAtDesc(eventId, userId).orElse(null);
        }

        Instant now = Instant.now();
        Instant effectiveSubStart = event.getSubmissionStart() != null ? event.getSubmissionStart() : event.getRegistrationEnd();
        boolean windowOpen = (effectiveSubStart == null || !now.isBefore(effectiveSubStart))
                && (event.getSubmissionDeadline() == null || !now.isAfter(event.getSubmissionDeadline()));

        String windowStatus = "OPEN";
        Long remainingSeconds = null;
        if (effectiveSubStart != null && now.isBefore(effectiveSubStart)) {
            windowStatus = "NOT_STARTED";
            windowOpen = false;
        } else if (event.getSubmissionDeadline() != null) {
            long diff = java.time.Duration.between(now, event.getSubmissionDeadline()).getSeconds();
            if (diff <= 0) {
                windowStatus = "CLOSED";
                windowOpen = false;
                remainingSeconds = 0L;
            } else if (diff < 7200) {
                windowStatus = "ENDING_SOON";
                windowOpen = true;
                remainingSeconds = diff;
            } else {
                windowStatus = "OPEN";
                windowOpen = true;
                remainingSeconds = diff;
            }
        }

        boolean userRegistered = userId != null && eventRoleRepository.findByUserIdAndEventIdAndRole(userId, eventId, RoleType.PARTICIPANT).isPresent();
        boolean teamValid = true;

        boolean titleValid = submission != null && submission.getTitle() != null && !submission.getTitle().isBlank();
        boolean taglineValid = submission != null && submission.getTagline() != null && !submission.getTagline().isBlank();
        boolean descriptionValid = submission != null && submission.getDescription() != null && !submission.getDescription().isBlank();
        boolean trackValid = submission != null && submission.getTrack() != null && !submission.getTrack().isBlank();
        boolean repoUrlValid = submission != null && submission.getRepoUrl() != null && !submission.getRepoUrl().isBlank()
                && (submission.getRepoUrl().startsWith("http://") || submission.getRepoUrl().startsWith("https://") || submission.getRepoUrl().startsWith("git@"));

        List<String> missingFields = new ArrayList<>();
        Map<String, String> fieldErrors = new HashMap<>();

        if (!titleValid) {
            missingFields.add("Title");
            fieldErrors.put("title", "Project title is required");
        }
        if (!taglineValid) {
            missingFields.add("Tagline");
            fieldErrors.put("tagline", "Short tagline / elevator pitch is required");
        }
        if (!descriptionValid) {
            missingFields.add("Description");
            fieldErrors.put("description", "Project description / README is required");
        }
        if (!trackValid) {
            missingFields.add("Track");
            fieldErrors.put("track", "Please select a competition track");
        }
        if (!repoUrlValid) {
            missingFields.add("Repository URL");
            fieldErrors.put("repoUrl", "Valid code repository URL (https://) is required");
        }
        if (!windowOpen) {
            fieldErrors.put("window", "Submissions are currently closed for this event");
        }

        boolean isReady = titleValid && taglineValid && descriptionValid && trackValid && repoUrlValid && windowOpen;

        SubmissionReadinessResponse resp = new SubmissionReadinessResponse();
        resp.setEventId(eventId);
        resp.setSubmissionId(submission != null ? submission.getId() : null);
        resp.setTitleValid(titleValid);
        resp.setTaglineValid(taglineValid);
        resp.setDescriptionValid(descriptionValid);
        resp.setTrackValid(trackValid);
        resp.setRepoUrlValid(repoUrlValid);
        resp.setWindowOpen(windowOpen);
        resp.setUserRegistered(userRegistered);
        resp.setTeamValid(teamValid);
        resp.setReady(isReady);
        resp.setRemainingSeconds(remainingSeconds);
        resp.setWindowStatus(windowStatus);
        resp.setMissingFields(missingFields);
        resp.setFieldErrors(fieldErrors);
        return resp;
    }
}
