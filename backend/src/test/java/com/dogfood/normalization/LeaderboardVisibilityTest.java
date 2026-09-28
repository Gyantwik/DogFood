package com.dogfood.normalization;

import com.dogfood.auth.RoleType;
import com.dogfood.common.ApiResponse;
import com.dogfood.events.Event;
import com.dogfood.events.EventRepository;
import com.dogfood.security.EventAuthorizationPolicy;
import com.dogfood.security.UserPrincipal;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class LeaderboardVisibilityTest {

    private ZScoreNormalizationService normalizationService;
    private EventAuthorizationPolicy authorizationPolicy;
    private EventRepository eventRepository;
    private NormalizationController normalizationController;

    @BeforeEach
    void setUp() {
        normalizationService = Mockito.mock(ZScoreNormalizationService.class);
        authorizationPolicy = Mockito.mock(EventAuthorizationPolicy.class);
        eventRepository = Mockito.mock(EventRepository.class);

        normalizationController = new NormalizationController(
                normalizationService,
                authorizationPolicy,
                eventRepository
        );
    }

    @Test
    void testGetLeaderboard_BeforePublish_OrganizerCanAccess() {
        Long eventId = 1L;
        Instant future = Instant.now().plus(5, ChronoUnit.DAYS);

        Event event = new Event("Hackathon", "Desc", future);
        event.setId(eventId);
        event.setResultsPublishAt(future);

        UserPrincipal organizer = new UserPrincipal(1L, "organizer", "org@dogfood.local", "ROLE_ORGANIZER", Collections.emptyList());

        when(eventRepository.findById(eventId)).thenReturn(Optional.of(event));
        when(authorizationPolicy.hasEventRole(1L, eventId, RoleType.ORGANIZER)).thenReturn(true);
        when(normalizationService.getLeaderboard(eventId, "raw")).thenReturn(Collections.emptyList());

        ResponseEntity<ApiResponse<List<LeaderboardEntryDto>>> response =
                normalizationController.getLeaderboard(eventId, "raw", organizer);

        assertNotNull(response);
        assertEquals(200, response.getStatusCode().value());
        assertTrue(response.getBody().isSuccess());
    }

    @Test
    void testGetLeaderboard_BeforePublish_ParticipantDenied() {
        Long eventId = 1L;
        Instant future = Instant.now().plus(5, ChronoUnit.DAYS);

        Event event = new Event("Hackathon", "Desc", future);
        event.setId(eventId);
        event.setResultsPublishAt(future);

        UserPrincipal participant = new UserPrincipal(5L, "participant", "p@dogfood.local", "ROLE_PARTICIPANT", Collections.emptyList());

        when(eventRepository.findById(eventId)).thenReturn(Optional.of(event));
        when(authorizationPolicy.hasEventRole(5L, eventId, RoleType.ORGANIZER)).thenReturn(false);
        when(authorizationPolicy.hasEventRole(5L, eventId, RoleType.ADMIN)).thenReturn(false);

        AccessDeniedException ex = assertThrows(AccessDeniedException.class, () ->
                normalizationController.getLeaderboard(eventId, "raw", participant)
        );
        assertTrue(ex.getMessage().contains("Results are not published yet"));
    }

    @Test
    void testGetLeaderboard_BeforePublish_UnauthenticatedDenied() {
        Long eventId = 1L;
        Instant future = Instant.now().plus(5, ChronoUnit.DAYS);

        Event event = new Event("Hackathon", "Desc", future);
        event.setId(eventId);
        event.setResultsPublishAt(future);

        when(eventRepository.findById(eventId)).thenReturn(Optional.of(event));

        AccessDeniedException ex = assertThrows(AccessDeniedException.class, () ->
                normalizationController.getLeaderboard(eventId, "raw", null)
        );
        assertTrue(ex.getMessage().contains("Results are not published yet"));
    }

    @Test
    void testGetLeaderboard_AfterPublish_PublicAccessAllowed() {
        Long eventId = 1L;
        Instant past = Instant.now().minus(1, ChronoUnit.DAYS);

        Event event = new Event("Hackathon", "Desc", past);
        event.setId(eventId);
        event.setResultsPublishAt(past);

        when(eventRepository.findById(eventId)).thenReturn(Optional.of(event));
        when(normalizationService.getLeaderboard(eventId, "raw")).thenReturn(Collections.emptyList());

        // Anonymous user (null principal)
        ResponseEntity<ApiResponse<List<LeaderboardEntryDto>>> response =
                normalizationController.getLeaderboard(eventId, "raw", null);

        assertNotNull(response);
        assertEquals(200, response.getStatusCode().value());
        assertTrue(response.getBody().isSuccess());
    }
}
