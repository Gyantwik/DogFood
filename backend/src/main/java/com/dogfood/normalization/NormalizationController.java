package com.dogfood.normalization;

import com.dogfood.auth.RoleType;
import com.dogfood.common.ApiResponse;
import com.dogfood.security.EventAuthorizationPolicy;
import com.dogfood.security.UserPrincipal;
import com.dogfood.events.Event;
import com.dogfood.events.EventRepository;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.List;

@RestController
@RequestMapping("/api/events/{eventId}")
public class NormalizationController {

    private final ZScoreNormalizationService normalizationService;
    private final EventAuthorizationPolicy authorizationPolicy;
    private final EventRepository eventRepository;

    public NormalizationController(
            ZScoreNormalizationService normalizationService,
            EventAuthorizationPolicy authorizationPolicy,
            EventRepository eventRepository) {
        this.normalizationService = normalizationService;
        this.authorizationPolicy = authorizationPolicy;
        this.eventRepository = eventRepository;
    }

    @GetMapping({"/leaderboard", "/results"})
    public ResponseEntity<ApiResponse<List<LeaderboardEntryDto>>> getLeaderboard(
            @PathVariable Long eventId,
            @RequestParam(defaultValue = "raw") String mode,
            @AuthenticationPrincipal UserPrincipal currentUser) {
        Event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new IllegalArgumentException("Event not found with id: " + eventId));

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
                    ? "Results are not published yet. Leaderboard will be available at " + publishAt
                    : "Results are not published yet. Judging is currently in progress.";
            throw new AccessDeniedException(msg);
        }

        List<LeaderboardEntryDto> leaderboard = normalizationService.getLeaderboard(eventId, mode);
        return ResponseEntity.ok(ApiResponse.ok(leaderboard));
    }

    @GetMapping("/score-distribution")
    public ResponseEntity<ApiResponse<List<ScoreDistributionDto>>> getScoreDistribution(
            @PathVariable Long eventId,
            @AuthenticationPrincipal UserPrincipal currentUser) {
        if (currentUser == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        authorizationPolicy.requireEventRole(currentUser.getId(), eventId, RoleType.ORGANIZER);
        List<ScoreDistributionDto> distribution = normalizationService.getScoreDistribution(eventId);
        return ResponseEntity.ok(ApiResponse.ok(distribution));
    }

    @PostMapping("/normalize")
    public ResponseEntity<ApiResponse<String>> triggerNormalization(
            @PathVariable Long eventId,
            @AuthenticationPrincipal UserPrincipal currentUser) {
        if (currentUser == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        authorizationPolicy.requireEventRole(currentUser.getId(), eventId, RoleType.ORGANIZER);
        normalizationService.normalizeScoresForEvent(eventId);
        return ResponseEntity.ok(ApiResponse.ok("Scores normalized successfully", "OK"));
    }
}
