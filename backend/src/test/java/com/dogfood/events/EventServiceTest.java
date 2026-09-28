package com.dogfood.events;

import com.dogfood.auth.EventRole;
import com.dogfood.auth.EventRoleRepository;
import com.dogfood.auth.RoleType;
import com.dogfood.auth.User;
import com.dogfood.auth.UserRepository;
import com.dogfood.common.audit.AuditLogService;
import com.dogfood.events.dto.CreateEventRequest;
import com.dogfood.events.dto.CreateTrackRequest;
import com.dogfood.events.dto.EventDetailResponse;
import com.dogfood.events.dto.EventRegistrationResponse;
import com.dogfood.events.dto.TrackDto;
import com.dogfood.security.EventAuthorizationPolicy;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

import java.time.Instant;
import java.util.Collections;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class EventServiceTest {

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
    void testCreateEvent() {
        CreateEventRequest request = new CreateEventRequest("Hackathon 2026", "Desc", Instant.now());
        User user = new User("organizer", "organizer@dogfood.local", "hash");
        user.setId(1L);

        Event savedEvent = new Event("Hackathon 2026", "Desc", request.getSubmissionDeadline());
        savedEvent.setId(10L);

        when(eventRepository.save(any(Event.class))).thenReturn(savedEvent);
        when(eventRepository.findById(10L)).thenReturn(Optional.of(savedEvent));
        when(userRepository.findById(1L)).thenReturn(Optional.of(user));
        when(trackRepository.findByEventId(10L)).thenReturn(Collections.emptyList());
        doNothing().when(authorizationPolicy).requireOrganizerOrAdmin(1L);

        EventDetailResponse response = eventService.createEvent(request, 1L);

        assertNotNull(response);
        assertEquals(10L, response.getId());
        assertEquals("Hackathon 2026", response.getName());
        verify(authorizationPolicy).requireOrganizerOrAdmin(1L);
        verify(eventRoleRepository).save(any(EventRole.class));
    }

    @Test
    void testCreateEvent_ThrowsAccessDenied_WhenNotOrganizerOrAdmin() {
        CreateEventRequest request = new CreateEventRequest("Hackathon 2026", "Desc", Instant.now());
        doThrow(new org.springframework.security.access.AccessDeniedException("Access denied"))
                .when(authorizationPolicy).requireOrganizerOrAdmin(2L);

        assertThrows(org.springframework.security.access.AccessDeniedException.class, () ->
                eventService.createEvent(request, 2L)
        );
        verify(eventRepository, never()).save(any());
    }

    @Test
    void testAddTrack() {
        Long eventId = 10L;
        Long userId = 1L;
        CreateTrackRequest request = new CreateTrackRequest("AI Track", "AI/ML problems");

        Track savedTrack = new Track(eventId, "AI Track", "AI/ML problems");
        savedTrack.setId(5L);

        when(eventRepository.existsById(eventId)).thenReturn(true);
        when(trackRepository.save(any(Track.class))).thenReturn(savedTrack);

        TrackDto track = eventService.addTrack(eventId, request, userId);

        assertNotNull(track);
        assertEquals("AI Track", track.getName());
        verify(authorizationPolicy).requireEventRole(userId, eventId, RoleType.ORGANIZER);
    }

    @Test
    void testRegisterForEvent_Success() {
        Long eventId = 10L;
        Long userId = 5L;

        Event event = new Event("Hackathon 2026", "Desc", Instant.now());
        event.setId(eventId);

        User user = new User("participant", "participant@dogfood.local", "hash");
        user.setId(userId);

        when(eventRepository.findById(eventId)).thenReturn(Optional.of(event));
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(eventRoleRepository.findByUserIdAndEventIdAndRole(userId, eventId, RoleType.PARTICIPANT))
                .thenReturn(Optional.empty());

        EventRegistrationResponse response = eventService.registerForEvent(eventId, userId);

        assertNotNull(response);
        assertEquals(eventId, response.getEventId());
        assertEquals(userId, response.getUserId());
        assertEquals("PARTICIPANT", response.getRole());
        assertEquals("Successfully registered for event", response.getMessage());
        verify(eventRoleRepository).save(any(EventRole.class));
        verify(auditLogService).logAction(eq(userId), eq(eventId), eq("EVENT_REGISTRATION"), anyString());
    }

    @Test
    void testRegisterForEvent_AlreadyRegistered() {
        Long eventId = 10L;
        Long userId = 5L;

        Event event = new Event("Hackathon 2026", "Desc", Instant.now());
        event.setId(eventId);

        User user = new User("participant", "participant@dogfood.local", "hash");
        user.setId(userId);

        when(eventRepository.findById(eventId)).thenReturn(Optional.of(event));
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(eventRoleRepository.findByUserIdAndEventIdAndRole(userId, eventId, RoleType.PARTICIPANT))
                .thenReturn(Optional.of(new EventRole(user, eventId, RoleType.PARTICIPANT)));

        EventRegistrationResponse response = eventService.registerForEvent(eventId, userId);

        assertNotNull(response);
        assertEquals("Already registered for event", response.getMessage());
        verify(eventRoleRepository, never()).save(any(EventRole.class));
    }

    @Test
    void testRegisterForEvent_ThrowsIllegalState_WhenEventClosed() {
        Long eventId = 10L;
        Long userId = 5L;

        Event event = new Event("Closed Hackathon", "Desc", Instant.now());
        event.setId(eventId);
        event.setStatus("CLOSED");

        when(eventRepository.findById(eventId)).thenReturn(Optional.of(event));

        IllegalStateException ex = assertThrows(IllegalStateException.class, () ->
                eventService.registerForEvent(eventId, userId)
        );
        assertTrue(ex.getMessage().contains("closed"));
        verify(eventRoleRepository, never()).save(any(EventRole.class));
    }
}
