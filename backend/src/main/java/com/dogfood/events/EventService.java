package com.dogfood.events;

import com.dogfood.auth.*;
import com.dogfood.common.audit.AuditLogService;
import com.dogfood.events.dto.CreateEventRequest;
import com.dogfood.events.dto.CreateTrackRequest;
import com.dogfood.events.dto.EventDetailResponse;
import com.dogfood.events.dto.EventRegistrationResponse;
import com.dogfood.events.dto.TrackDto;
import com.dogfood.security.EventAuthorizationPolicy;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
public class EventService {

    private final EventRepository eventRepository;
    private final TrackRepository trackRepository;
    private final EventRoleRepository eventRoleRepository;
    private final UserRepository userRepository;
    private final EventAuthorizationPolicy authorizationPolicy;
    private final AuditLogService auditLogService;

    @org.springframework.beans.factory.annotation.Autowired(required = false)
    private EventCustomQuestionRepository customQuestionRepository;

    @org.springframework.beans.factory.annotation.Autowired(required = false)
    private com.dogfood.webhooks.WebhookService webhookService;

    public EventService(
            EventRepository eventRepository,
            TrackRepository trackRepository,
            EventRoleRepository eventRoleRepository,
            UserRepository userRepository,
            EventAuthorizationPolicy authorizationPolicy,
            AuditLogService auditLogService) {
        this.eventRepository = eventRepository;
        this.trackRepository = trackRepository;
        this.eventRoleRepository = eventRoleRepository;
        this.userRepository = userRepository;
        this.authorizationPolicy = authorizationPolicy;
        this.auditLogService = auditLogService;
    }

    public void setCustomQuestionRepository(EventCustomQuestionRepository customQuestionRepository) {
        this.customQuestionRepository = customQuestionRepository;
    }

    public List<EventCustomQuestion> getCustomQuestions(Long eventId) {
        if (customQuestionRepository == null) return List.of();
        return customQuestionRepository.findByEventIdOrderByDisplayOrderAscIdAsc(eventId);
    }

    @Transactional
    public EventCustomQuestion addCustomQuestion(Long eventId, String prompt, String questionType, boolean required, Long userId) {
        authorizationPolicy.requireOrganizerOrAdmin(userId);
        if (customQuestionRepository == null) throw new IllegalStateException("Repository unavailable");
        EventCustomQuestion q = new EventCustomQuestion(eventId, prompt, questionType, required, 0);
        return customQuestionRepository.save(q);
    }

    @Transactional
    public void deleteCustomQuestion(Long eventId, Long questionId, Long userId) {
        authorizationPolicy.requireOrganizerOrAdmin(userId);
        if (customQuestionRepository != null) {
            customQuestionRepository.deleteById(questionId);
        }
    }

    @Transactional
    public EventDetailResponse createEvent(CreateEventRequest request, Long creatorUserId) {
        if (creatorUserId == null) {
            throw new AccessDeniedException("Unauthorized: missing user credentials");
        }
        authorizationPolicy.requireOrganizerOrAdmin(creatorUserId);

        validateLifecycleDates(request);

        Event event = new Event(request.getName().trim(), request.getDescription(), request.getSubmissionDeadline());
        event.setRegistrationStart(request.getRegistrationStart());
        event.setRegistrationEnd(request.getRegistrationEnd());
        event.setEventStart(request.getEventStart());
        event.setEventEnd(request.getEventEnd());
        event.setTeamFormationStart(request.getTeamFormationStart());
        event.setTeamFormationEnd(request.getTeamFormationEnd());
        event.setSubmissionStart(request.getSubmissionStart());
        event.setJudgingStart(request.getJudgingStart());
        event.setJudgingEnd(request.getJudgingEnd());
        event.setVotingStart(request.getVotingStart());
        event.setVotingEnd(request.getVotingEnd());
        event.setVotingEnabled(request.getVotingEnabled() != null ? request.getVotingEnabled() : false);
        event.setVotingAccessMode(request.getVotingAccessMode() != null ? request.getVotingAccessMode().toUpperCase() : "OPEN");
        event.setPairwiseJudgingEnabled(request.getPairwiseJudgingEnabled() != null ? request.getPairwiseJudgingEnabled() : false);
        event.setResultsPublishAt(request.getResultsPublishAt());
        event = eventRepository.save(event);

        User creator = userRepository.findById(creatorUserId)
                .orElseThrow(() -> new IllegalArgumentException("User not found: " + creatorUserId));
        EventRole organizerRole = new EventRole(creator, event.getId(), RoleType.ORGANIZER);
        eventRoleRepository.save(organizerRole);

        auditLogService.logAction(creatorUserId, event.getId(), "CREATE_EVENT", "Created event: " + event.getName());

        return getEvent(event.getId());
    }

    private void validateLifecycleDates(CreateEventRequest req) {
        if (req.getRegistrationStart() != null && req.getRegistrationEnd() != null) {
            if (req.getRegistrationStart().isAfter(req.getRegistrationEnd())) {
                throw new IllegalArgumentException("registrationStart must be on or before registrationEnd");
            }
        }
        if (req.getTeamFormationStart() != null && req.getTeamFormationEnd() != null) {
            if (req.getTeamFormationStart().isAfter(req.getTeamFormationEnd())) {
                throw new IllegalArgumentException("teamFormationStart must be on or before teamFormationEnd");
            }
        }
        if (req.getEventStart() != null && req.getEventEnd() != null) {
            if (req.getEventStart().isAfter(req.getEventEnd())) {
                throw new IllegalArgumentException("eventStart must be on or before eventEnd");
            }
        }
        if (req.getSubmissionStart() != null && req.getSubmissionDeadline() != null) {
            if (req.getSubmissionStart().isAfter(req.getSubmissionDeadline())) {
                throw new IllegalArgumentException("submissionStart must be on or before submissionDeadline");
            }
        }
        if (req.getJudgingStart() != null && req.getJudgingEnd() != null) {
            if (req.getJudgingStart().isAfter(req.getJudgingEnd())) {
                throw new IllegalArgumentException("judgingStart must be on or before judgingEnd");
            }
        }
        if (req.getVotingStart() != null && req.getVotingEnd() != null) {
            if (req.getVotingStart().isAfter(req.getVotingEnd())) {
                throw new IllegalArgumentException("votingStart must be on or before votingEnd");
            }
        }

        // Cross-phase sequence validation
        if (req.getTeamFormationStart() != null && req.getRegistrationStart() != null) {
            if (req.getTeamFormationStart().isBefore(req.getRegistrationStart())) {
                throw new IllegalArgumentException("teamFormationStart must be on or after registrationStart");
            }
        }
        if (req.getSubmissionStart() != null && req.getTeamFormationEnd() != null) {
            if (req.getSubmissionStart().isBefore(req.getTeamFormationEnd())) {
                throw new IllegalArgumentException("submissionStart must be on or after teamFormationEnd");
            }
        }
        if (req.getSubmissionStart() != null && req.getEventStart() != null) {
            if (req.getSubmissionStart().isBefore(req.getEventStart())) {
                throw new IllegalArgumentException("submissionStart must be on or after eventStart");
            }
        }
        if (req.getJudgingStart() != null && req.getSubmissionDeadline() != null) {
            if (req.getJudgingStart().isBefore(req.getSubmissionDeadline())) {
                throw new IllegalArgumentException("judgingStart must be on or after submissionDeadline");
            }
        } else if (req.getJudgingStart() != null && req.getSubmissionStart() != null) {
            if (req.getJudgingStart().isBefore(req.getSubmissionStart())) {
                throw new IllegalArgumentException("judgingStart must be on or after submissionStart");
            }
        }
        if (req.getResultsPublishAt() != null && req.getJudgingEnd() != null) {
            if (req.getResultsPublishAt().isBefore(req.getJudgingEnd())) {
                throw new IllegalArgumentException("resultsPublishAt must be on or after judgingEnd");
            }
        }
    }

    @Transactional(readOnly = true)
    public List<Event> listEvents() {
        return eventRepository.findAll();
    }

    @Transactional(readOnly = true)
    public EventDetailResponse getEvent(Long eventId) {
        Event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new IllegalArgumentException("Event not found with id: " + eventId));

        List<TrackDto> tracks = trackRepository.findByEventId(eventId).stream()
                .map(t -> new TrackDto(t.getId(), t.getEventId(), t.getName(), t.getDescription()))
                .collect(Collectors.toList());

        EventDetailResponse response = new EventDetailResponse(
                event.getId(),
                event.getName(),
                event.getDescription(),
                event.getStatus(),
                event.getSubmissionDeadline(),
                tracks,
                event.getCreatedAt()
        );
        response.setRegistrationStart(event.getRegistrationStart());
        response.setRegistrationEnd(event.getRegistrationEnd());
        response.setEventStart(event.getEventStart());
        response.setEventEnd(event.getEventEnd());
        response.setTeamFormationStart(event.getTeamFormationStart());
        response.setTeamFormationEnd(event.getTeamFormationEnd());
        response.setSubmissionStart(event.getSubmissionStart());
        response.setJudgingStart(event.getJudgingStart());
        response.setJudgingEnd(event.getJudgingEnd());
        response.setVotingStart(event.getVotingStart());
        response.setVotingEnd(event.getVotingEnd());
        response.setVotingEnabled(event.getVotingEnabled());
        response.setVotingAccessMode(event.getVotingAccessMode());
        response.setPairwiseJudgingEnabled(event.getPairwiseJudgingEnabled());
        response.setResultsPublishAt(event.getResultsPublishAt());
        return response;
    }

    @Transactional
    public TrackDto addTrack(Long eventId, CreateTrackRequest request, Long userId) {
        authorizationPolicy.requireEventRole(userId, eventId, RoleType.ORGANIZER);

        if (!eventRepository.existsById(eventId)) {
            throw new IllegalArgumentException("Event not found with id: " + eventId);
        }

        Track track = new Track(eventId, request.getName().trim(), request.getDescription());
        track = trackRepository.save(track);

        auditLogService.logAction(userId, eventId, "ADD_TRACK", "Added track: " + track.getName());

        return new TrackDto(track.getId(), track.getEventId(), track.getName(), track.getDescription());
    }

    @Transactional(readOnly = true)
    public List<TrackDto> getTracks(Long eventId) {
        return trackRepository.findByEventId(eventId).stream()
                .map(t -> new TrackDto(t.getId(), t.getEventId(), t.getName(), t.getDescription()))
                .collect(Collectors.toList());
    }

    @Transactional
    public EventRegistrationResponse registerForEvent(Long eventId, Long userId) {
        if (userId == null) {
            throw new IllegalArgumentException("User ID is required for event registration");
        }
        Event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new IllegalArgumentException("Event not found with id: " + eventId));

        if (event.getStatus() == null || !"OPEN".equalsIgnoreCase(event.getStatus())) {
            throw new IllegalStateException("Registration is closed for event: " + event.getName());
        }

        Instant now = Instant.now();
        if (event.getRegistrationStart() != null && now.isBefore(event.getRegistrationStart())) {
            throw new IllegalStateException("Registration period has not opened yet");
        }
        if (event.getRegistrationEnd() != null && now.isAfter(event.getRegistrationEnd())) {
            throw new IllegalStateException("Registration period has closed");
        }

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found with id: " + userId));

        Optional<EventRole> existingRole = eventRoleRepository.findByUserIdAndEventIdAndRole(userId, eventId, RoleType.PARTICIPANT);
        if (existingRole.isPresent()) {
            return new EventRegistrationResponse(eventId, userId, RoleType.PARTICIPANT.name(), "Already registered for event");
        }

        EventRole participantRole = new EventRole(user, eventId, RoleType.PARTICIPANT);
        eventRoleRepository.save(participantRole);

        auditLogService.logAction(userId, eventId, "EVENT_REGISTRATION", "User registered as participant for event: " + event.getName());

        return new EventRegistrationResponse(eventId, userId, RoleType.PARTICIPANT.name(), "Successfully registered for event");
    }

    @Transactional
    public EventDetailResponse updateEvent(Long eventId, CreateEventRequest request, Long userId) {
        authorizationPolicy.requireOrganizerOrAdmin(userId);
        Event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new IllegalArgumentException("Event not found with id: " + eventId));

        if (request.getName() != null && !request.getName().isBlank()) event.setName(request.getName());
        if (request.getDescription() != null) event.setDescription(request.getDescription());
        if (request.getSubmissionDeadline() != null) event.setSubmissionDeadline(request.getSubmissionDeadline());
        if (request.getSubmissionStart() != null) event.setSubmissionStart(request.getSubmissionStart());
        if (request.getRegistrationStart() != null) event.setRegistrationStart(request.getRegistrationStart());
        if (request.getRegistrationEnd() != null) event.setRegistrationEnd(request.getRegistrationEnd());
        if (request.getEventStart() != null) event.setEventStart(request.getEventStart());
        if (request.getEventEnd() != null) event.setEventEnd(request.getEventEnd());
        if (request.getTeamFormationStart() != null) event.setTeamFormationStart(request.getTeamFormationStart());
        if (request.getTeamFormationEnd() != null) event.setTeamFormationEnd(request.getTeamFormationEnd());
        if (request.getJudgingStart() != null) event.setJudgingStart(request.getJudgingStart());
        if (request.getJudgingEnd() != null) event.setJudgingEnd(request.getJudgingEnd());
        if (request.getVotingStart() != null) event.setVotingStart(request.getVotingStart());
        if (request.getVotingEnd() != null) event.setVotingEnd(request.getVotingEnd());
        if (request.getVotingEnabled() != null) event.setVotingEnabled(request.getVotingEnabled());
        if (request.getVotingAccessMode() != null && !request.getVotingAccessMode().isBlank()) event.setVotingAccessMode(request.getVotingAccessMode().toUpperCase());
        if (request.getPairwiseJudgingEnabled() != null) event.setPairwiseJudgingEnabled(request.getPairwiseJudgingEnabled());
        if (request.getResultsPublishAt() != null) event.setResultsPublishAt(request.getResultsPublishAt());
        if (request.getStatus() != null && !request.getStatus().isBlank()) event.setStatus(request.getStatus().toUpperCase());

        event = eventRepository.save(event);
        auditLogService.logAction(userId, eventId, "UPDATE_EVENT", "Updated event settings for: " + event.getName());

        if (webhookService != null && ("CLOSED".equalsIgnoreCase(event.getStatus()) || (event.getResultsPublishAt() != null && Instant.now().isAfter(event.getResultsPublishAt())))) {
            try {
                webhookService.dispatch(eventId, "results.published", Map.of(
                        "eventId", eventId,
                        "eventName", event.getName(),
                        "status", event.getStatus(),
                        "publishedAt", Instant.now().toString()
                ));
            } catch (Exception ignored) {}
        }

        return getEvent(event.getId());
    }
}
