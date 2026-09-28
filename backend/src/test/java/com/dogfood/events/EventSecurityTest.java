package com.dogfood.events;

import com.dogfood.auth.EventRole;
import com.dogfood.auth.EventRoleRepository;
import com.dogfood.auth.RoleType;
import com.dogfood.auth.User;
import com.dogfood.common.ApiResponse;
import com.dogfood.events.dto.CreateEventRequest;
import com.dogfood.events.dto.EventDetailResponse;
import com.dogfood.security.EventAuthorizationPolicy;
import com.dogfood.security.UserPrincipal;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.authority.SimpleGrantedAuthority;

import java.time.Instant;
import java.util.Collections;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class EventSecurityTest {

    @Mock
    private EventService eventService;

    @Mock
    private EventRoleRepository eventRoleRepository;

    @InjectMocks
    private EventController eventController;

    private EventAuthorizationPolicy authorizationPolicy;

    private UserPrincipal participantPrincipal;
    private UserPrincipal judgePrincipal;
    private UserPrincipal organizerPrincipal;
    private UserPrincipal adminPrincipal;

    private CreateEventRequest validRequest;

    @BeforeEach
    void setUp() {
        authorizationPolicy = new EventAuthorizationPolicy(eventRoleRepository);

        participantPrincipal = new UserPrincipal(100L, "participant", "participant@dogfood.local", "pwd",
                Collections.singletonList(new SimpleGrantedAuthority("ROLE_USER")));
        judgePrincipal = new UserPrincipal(200L, "judge", "judge@dogfood.local", "pwd",
                Collections.singletonList(new SimpleGrantedAuthority("ROLE_USER")));
        organizerPrincipal = new UserPrincipal(300L, "organizer", "organizer@dogfood.local", "pwd",
                Collections.singletonList(new SimpleGrantedAuthority("ROLE_USER")));
        adminPrincipal = new UserPrincipal(400L, "admin", "admin@dogfood.local", "pwd",
                Collections.singletonList(new SimpleGrantedAuthority("ROLE_ADMIN")));

        validRequest = new CreateEventRequest("Hackathon 2026", "Event Description", Instant.now().plusSeconds(86400));
    }

    // 1. Unauthenticated requests: HTTP 401 Unauthorized
    @Test
    void test1_UnauthenticatedCreateEventReturns401() {
        ResponseEntity<ApiResponse<EventDetailResponse>> response = eventController.createEvent(validRequest, null);

        assertNotNull(response);
        assertEquals(HttpStatus.UNAUTHORIZED, response.getStatusCode());
        assertNotNull(response.getBody());
        assertFalse(response.getBody().isSuccess());
        verify(eventService, never()).createEvent(any(), any());
    }

    // 2. Authenticated user with PARTICIPANT role: HTTP 403 Forbidden
    @Test
    void test2_ParticipantCreateEventThrows403() {
        when(eventService.createEvent(any(CreateEventRequest.class), eq(100L)))
                .thenThrow(new AccessDeniedException("Access denied: User does not have ORGANIZER or ADMIN role to create events"));

        AccessDeniedException ex = assertThrows(AccessDeniedException.class, () ->
                eventController.createEvent(validRequest, participantPrincipal)
        );
        assertTrue(ex.getMessage().contains("Access denied"));
        verify(eventService).createEvent(any(), eq(100L));
    }

    // 3. Authenticated user with JUDGE role: HTTP 403 Forbidden
    @Test
    void test3_JudgeCreateEventThrows403() {
        when(eventService.createEvent(any(CreateEventRequest.class), eq(200L)))
                .thenThrow(new AccessDeniedException("Access denied: User does not have ORGANIZER or ADMIN role to create events"));

        AccessDeniedException ex = assertThrows(AccessDeniedException.class, () ->
                eventController.createEvent(validRequest, judgePrincipal)
        );
        assertTrue(ex.getMessage().contains("Access denied"));
        verify(eventService).createEvent(any(), eq(200L));
    }

    // 4. Authenticated user with ORGANIZER role: HTTP 201 Created
    @Test
    void test4_OrganizerCreateEventReturns201() {
        EventDetailResponse mockResponse = new EventDetailResponse(
                10L, validRequest.getName(), validRequest.getDescription(), "OPEN",
                validRequest.getSubmissionDeadline(), Collections.emptyList(), Instant.now()
        );
        when(eventService.createEvent(any(CreateEventRequest.class), eq(300L)))
                .thenReturn(mockResponse);

        ResponseEntity<ApiResponse<EventDetailResponse>> response = eventController.createEvent(validRequest, organizerPrincipal);

        assertNotNull(response);
        assertEquals(HttpStatus.CREATED, response.getStatusCode());
        assertNotNull(response.getBody());
        assertTrue(response.getBody().isSuccess());
        assertEquals("Hackathon 2026", response.getBody().getData().getName());
        verify(eventService).createEvent(any(), eq(300L));
    }

    // 5. Authenticated user with ADMIN role: HTTP 201 Created
    @Test
    void test5_AdminCreateEventReturns201() {
        EventDetailResponse mockResponse = new EventDetailResponse(
                11L, validRequest.getName(), validRequest.getDescription(), "OPEN",
                validRequest.getSubmissionDeadline(), Collections.emptyList(), Instant.now()
        );
        when(eventService.createEvent(any(CreateEventRequest.class), eq(400L)))
                .thenReturn(mockResponse);

        ResponseEntity<ApiResponse<EventDetailResponse>> response = eventController.createEvent(validRequest, adminPrincipal);

        assertNotNull(response);
        assertEquals(HttpStatus.CREATED, response.getStatusCode());
        assertNotNull(response.getBody());
        assertTrue(response.getBody().isSuccess());
        assertEquals("Hackathon 2026", response.getBody().getData().getName());
        verify(eventService).createEvent(any(), eq(400L));
    }

    // 6. Policy checks: requireOrganizerOrAdmin verifies roles from repository
    @Test
    void test6_EventAuthorizationPolicy_EnforcesOrganizerOrAdmin() {
        User participant = new User("participant", "p@dogfood.local", "pwd");
        participant.setId(100L);
        when(eventRoleRepository.findByUserId(100L))
                .thenReturn(List.of(new EventRole(participant, 1L, RoleType.PARTICIPANT)));

        User judge = new User("judge", "j@dogfood.local", "pwd");
        judge.setId(200L);
        when(eventRoleRepository.findByUserId(200L))
                .thenReturn(List.of(new EventRole(judge, 1L, RoleType.JUDGE)));

        User organizer = new User("organizer", "o@dogfood.local", "pwd");
        organizer.setId(300L);
        when(eventRoleRepository.findByUserId(300L))
                .thenReturn(List.of(new EventRole(organizer, 1L, RoleType.ORGANIZER)));

        User admin = new User("admin", "a@dogfood.local", "pwd");
        admin.setId(400L);
        when(eventRoleRepository.findByUserId(400L))
                .thenReturn(List.of(new EventRole(admin, 1L, RoleType.ADMIN)));

        // Participant fails
        assertFalse(authorizationPolicy.isOrganizerOrAdmin(100L));
        assertThrows(AccessDeniedException.class, () -> authorizationPolicy.requireOrganizerOrAdmin(100L));

        // Judge fails
        assertFalse(authorizationPolicy.isOrganizerOrAdmin(200L));
        assertThrows(AccessDeniedException.class, () -> authorizationPolicy.requireOrganizerOrAdmin(200L));

        // Organizer passes
        assertTrue(authorizationPolicy.isOrganizerOrAdmin(300L));
        assertDoesNotThrow(() -> authorizationPolicy.requireOrganizerOrAdmin(300L));

        // Admin passes
        assertTrue(authorizationPolicy.isOrganizerOrAdmin(400L));
        assertDoesNotThrow(() -> authorizationPolicy.requireOrganizerOrAdmin(400L));

        // Null user fails
        assertFalse(authorizationPolicy.isOrganizerOrAdmin(null));
        assertThrows(AccessDeniedException.class, () -> authorizationPolicy.requireOrganizerOrAdmin(null));
    }
}
