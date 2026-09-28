package com.dogfood.events;

import com.dogfood.auth.EventRole;
import com.dogfood.auth.EventRoleRepository;
import com.dogfood.auth.RoleType;
import com.dogfood.auth.User;
import com.dogfood.auth.UserRepository;
import com.dogfood.common.audit.AuditLogService;
import com.dogfood.events.dto.CreateEventRequest;
import com.dogfood.events.dto.EventDetailResponse;
import com.dogfood.events.dto.EventRegistrationResponse;
import com.dogfood.security.EventAuthorizationPolicy;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Collections;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class EventLifecycleTest {

    private EventRepository eventRepository;
    private TrackRepository trackRepository;
    private EventRoleRepository eventRoleRepository;
    private UserRepository userRepository;
    private EventAuthorizationPolicy authorizationPolicy;
    private AuditLogService auditLogService;
    private EventService eventService;

    @BeforeEach
    void setUp() {
        eventRepository = Mockito.mock(EventRepository.class);
        trackRepository = Mockito.mock(TrackRepository.class);
        eventRoleRepository = Mockito.mock(EventRoleRepository.class);
        userRepository = Mockito.mock(UserRepository.class);
        authorizationPolicy = Mockito.mock(EventAuthorizationPolicy.class);
        auditLogService = Mockito.mock(AuditLogService.class);

        eventService = new EventService(
                eventRepository,
                trackRepository,
                eventRoleRepository,
                userRepository,
                authorizationPolicy,
                auditLogService
        );
    }

    @Test
    void testCreateEvent_FailsWhenRegistrationStartAfterEnd() {
        Instant now = Instant.now();
        CreateEventRequest req = new CreateEventRequest("Hackathon", "Desc", now.plus(10, ChronoUnit.DAYS));
        req.setRegistrationStart(now.plus(5, ChronoUnit.DAYS));
        req.setRegistrationEnd(now.plus(2, ChronoUnit.DAYS)); // Invalid: start > end

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () ->
                eventService.createEvent(req, 1L)
        );
        assertTrue(ex.getMessage().contains("registrationStart must be on or before registrationEnd"));
    }

    @Test
    void testCreateEvent_FailsWhenSubmissionStartAfterDeadline() {
        Instant now = Instant.now();
        CreateEventRequest req = new CreateEventRequest("Hackathon", "Desc", now.plus(3, ChronoUnit.DAYS));
        req.setSubmissionStart(now.plus(5, ChronoUnit.DAYS)); // Invalid: start > deadline

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () ->
                eventService.createEvent(req, 1L)
        );
        assertTrue(ex.getMessage().contains("submissionStart must be on or before submissionDeadline"));
    }

    @Test
    void testCreateEvent_FailsWhenJudgingStartAfterEnd() {
        Instant now = Instant.now();
        CreateEventRequest req = new CreateEventRequest("Hackathon", "Desc", now.plus(3, ChronoUnit.DAYS));
        req.setJudgingStart(now.plus(6, ChronoUnit.DAYS));
        req.setJudgingEnd(now.plus(5, ChronoUnit.DAYS)); // Invalid: start > end

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () ->
                eventService.createEvent(req, 1L)
        );
        assertTrue(ex.getMessage().contains("judgingStart must be on or before judgingEnd"));
    }

    @Test
    void testCreateEvent_FailsWhenSubmissionStartBeforeEventStart() {
        Instant now = Instant.now();
        CreateEventRequest req = new CreateEventRequest("Hackathon", "Desc", now.plus(5, ChronoUnit.DAYS));
        req.setEventStart(now.plus(2, ChronoUnit.DAYS));
        req.setSubmissionStart(now.plus(1, ChronoUnit.DAYS)); // Invalid: subStart < eventStart

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () ->
                eventService.createEvent(req, 1L)
        );
        assertTrue(ex.getMessage().contains("submissionStart must be on or after eventStart"));
    }

    @Test
    void testCreateEvent_FailsWhenTeamFormationStartAfterEnd() {
        Instant now = Instant.now();
        CreateEventRequest req = new CreateEventRequest("Hackathon", "Desc", now.plus(10, ChronoUnit.DAYS));
        req.setTeamFormationStart(now.plus(5, ChronoUnit.DAYS));
        req.setTeamFormationEnd(now.plus(2, ChronoUnit.DAYS)); // Invalid: start > end

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () ->
                eventService.createEvent(req, 1L)
        );
        assertTrue(ex.getMessage().contains("teamFormationStart must be on or before teamFormationEnd"));
    }

    @Test
    void testCreateEvent_FailsWhenTeamFormationStartBeforeRegistrationStart() {
        Instant now = Instant.now();
        CreateEventRequest req = new CreateEventRequest("Hackathon", "Desc", now.plus(10, ChronoUnit.DAYS));
        req.setRegistrationStart(now.plus(2, ChronoUnit.DAYS));
        req.setRegistrationEnd(now.plus(5, ChronoUnit.DAYS));
        req.setTeamFormationStart(now.plus(1, ChronoUnit.DAYS)); // Invalid: formationStart < registrationStart

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () ->
                eventService.createEvent(req, 1L)
        );
        assertTrue(ex.getMessage().contains("teamFormationStart must be on or after registrationStart"));
    }

    @Test
    void testCreateEvent_FailsWhenSubmissionStartBeforeTeamFormationEnd() {
        Instant now = Instant.now();
        CreateEventRequest req = new CreateEventRequest("Hackathon", "Desc", now.plus(10, ChronoUnit.DAYS));
        req.setRegistrationStart(now.minus(2, ChronoUnit.DAYS));
        req.setRegistrationEnd(now.plus(2, ChronoUnit.DAYS));
        req.setTeamFormationStart(now.minus(1, ChronoUnit.DAYS));
        req.setTeamFormationEnd(now.plus(4, ChronoUnit.DAYS));
        req.setSubmissionStart(now.plus(3, ChronoUnit.DAYS)); // Invalid: subStart < formationEnd

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () ->
                eventService.createEvent(req, 1L)
        );
        assertTrue(ex.getMessage().contains("submissionStart must be on or after teamFormationEnd"));
    }

    @Test
    void testCreateEvent_SucceedsWithValidLifecycleTimestamps() {
        Instant now = Instant.now();
        CreateEventRequest req = new CreateEventRequest("Hackathon 2026", "Desc", now.plus(5, ChronoUnit.DAYS));
        req.setRegistrationStart(now.minus(1, ChronoUnit.DAYS));
        req.setRegistrationEnd(now.plus(2, ChronoUnit.DAYS));
        req.setEventStart(now.plus(1, ChronoUnit.DAYS));
        req.setEventEnd(now.plus(10, ChronoUnit.DAYS));
        req.setSubmissionStart(now.plus(1, ChronoUnit.DAYS));
        req.setJudgingStart(now.plus(6, ChronoUnit.DAYS));
        req.setJudgingEnd(now.plus(8, ChronoUnit.DAYS));
        req.setResultsPublishAt(now.plus(9, ChronoUnit.DAYS));

        User user = new User("organizer", "org@dogfood.local", "hash");
        user.setId(1L);

        Event savedEvent = new Event("Hackathon 2026", "Desc", req.getSubmissionDeadline());
        savedEvent.setId(20L);
        savedEvent.setRegistrationStart(req.getRegistrationStart());
        savedEvent.setRegistrationEnd(req.getRegistrationEnd());
        savedEvent.setEventStart(req.getEventStart());
        savedEvent.setEventEnd(req.getEventEnd());
        savedEvent.setSubmissionStart(req.getSubmissionStart());
        savedEvent.setJudgingStart(req.getJudgingStart());
        savedEvent.setJudgingEnd(req.getJudgingEnd());
        savedEvent.setResultsPublishAt(req.getResultsPublishAt());

        when(eventRepository.save(any(Event.class))).thenReturn(savedEvent);
        when(eventRepository.findById(20L)).thenReturn(Optional.of(savedEvent));
        when(userRepository.findById(1L)).thenReturn(Optional.of(user));
        when(trackRepository.findByEventId(20L)).thenReturn(Collections.emptyList());
        doNothing().when(authorizationPolicy).requireOrganizerOrAdmin(1L);

        EventDetailResponse res = eventService.createEvent(req, 1L);
        assertNotNull(res);
        assertEquals(20L, res.getId());
        assertEquals(req.getRegistrationStart(), res.getRegistrationStart());
        assertEquals(req.getResultsPublishAt(), res.getResultsPublishAt());
    }

    @Test
    void testRegisterForEvent_FailsWhenBeforeRegistrationStart() {
        Long eventId = 10L;
        Long userId = 5L;
        Instant now = Instant.now();

        Event event = new Event("Upcoming Event", "Desc", now.plus(10, ChronoUnit.DAYS));
        event.setId(eventId);
        event.setRegistrationStart(now.plus(2, ChronoUnit.DAYS)); // Not open yet
        event.setRegistrationEnd(now.plus(5, ChronoUnit.DAYS));

        when(eventRepository.findById(eventId)).thenReturn(Optional.of(event));

        IllegalStateException ex = assertThrows(IllegalStateException.class, () ->
                eventService.registerForEvent(eventId, userId)
        );
        assertTrue(ex.getMessage().contains("Registration period has not opened yet"));
    }

    @Test
    void testRegisterForEvent_FailsWhenAfterRegistrationEnd() {
        Long eventId = 10L;
        Long userId = 5L;
        Instant now = Instant.now();

        Event event = new Event("Closed Reg Event", "Desc", now.plus(10, ChronoUnit.DAYS));
        event.setId(eventId);
        event.setRegistrationStart(now.minus(10, ChronoUnit.DAYS));
        event.setRegistrationEnd(now.minus(1, ChronoUnit.DAYS)); // Closed yesterday

        when(eventRepository.findById(eventId)).thenReturn(Optional.of(event));

        IllegalStateException ex = assertThrows(IllegalStateException.class, () ->
                eventService.registerForEvent(eventId, userId)
        );
        assertTrue(ex.getMessage().contains("Registration period has closed"));
    }

    @Test
    void testRegisterForEvent_SucceedsWithinRegistrationWindow() {
        Long eventId = 10L;
        Long userId = 5L;
        Instant now = Instant.now();

        Event event = new Event("Open Reg Event", "Desc", now.plus(10, ChronoUnit.DAYS));
        event.setId(eventId);
        event.setRegistrationStart(now.minus(2, ChronoUnit.DAYS));
        event.setRegistrationEnd(now.plus(2, ChronoUnit.DAYS)); // Currently open

        User user = new User("participant", "p@dogfood.local", "hash");
        user.setId(userId);

        when(eventRepository.findById(eventId)).thenReturn(Optional.of(event));
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(eventRoleRepository.findByUserIdAndEventIdAndRole(userId, eventId, RoleType.PARTICIPANT))
                .thenReturn(Optional.empty());

        EventRegistrationResponse res = eventService.registerForEvent(eventId, userId);
        assertNotNull(res);
        assertEquals("Successfully registered for event", res.getMessage());
        verify(eventRoleRepository).save(any(EventRole.class));
    }
}
