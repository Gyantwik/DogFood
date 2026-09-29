package com.dogfood.pairwise;

import com.dogfood.common.ApiResponse;
import com.dogfood.pairwise.dto.*;
import com.dogfood.security.EventAuthorizationPolicy;
import com.dogfood.security.UserPrincipal;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api")
public class PairwiseJudgingController {

    private final PairwiseJudgingService pairwiseService;
    private final EventAuthorizationPolicy authorizationPolicy;

    public PairwiseJudgingController(
            PairwiseJudgingService pairwiseService,
            EventAuthorizationPolicy authorizationPolicy) {
        this.pairwiseService = pairwiseService;
        this.authorizationPolicy = authorizationPolicy;
    }

    // -------------------------------------------------------------------------
    // Organizer Mode Toggle
    // -------------------------------------------------------------------------

    @PostMapping({"/events/{eventId}/pairwise/toggle", "/events/{eventId}/pairwise/mode"})
    public ResponseEntity<ApiResponse<Map<String, Object>>> togglePairwiseMode(
            @PathVariable Long eventId,
            @RequestBody(required = false) Map<String, Object> body,
            @AuthenticationPrincipal UserPrincipal principal) {
        if (principal == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        boolean enabled = true;
        if (body != null && body.containsKey("enabled")) {
            enabled = Boolean.parseBoolean(body.get("enabled").toString());
        }

        pairwiseService.enablePairwiseJudging(eventId, enabled, principal.getId());
        return ResponseEntity.ok(ApiResponse.ok(Map.of(
                "eventId", eventId,
                "pairwiseJudgingEnabled", enabled,
                "message", "Pairwise judging mode " + (enabled ? "enabled" : "disabled")
        )));
    }

    // -------------------------------------------------------------------------
    // Judge Next Pair
    // -------------------------------------------------------------------------

    @GetMapping({"/events/{eventId}/judging/pairwise/next", "/judge/pairwise/next"})
    public ResponseEntity<ApiResponse<NextPairResponse>> getNextPair(
            @PathVariable(required = false) Long eventId,
            @RequestParam(required = false) Long queryEventId,
            @RequestParam(required = false) Long trackId,
            @AuthenticationPrincipal UserPrincipal principal) {
        if (principal == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        Long targetEventId = eventId != null ? eventId : queryEventId;
        if (targetEventId == null) {
            return ResponseEntity.badRequest().body(ApiResponse.error("eventId is required"));
        }

        NextPairResponse next = pairwiseService.getNextPair(targetEventId, principal.getId(), trackId);
        return ResponseEntity.ok(ApiResponse.ok(next));
    }

    // -------------------------------------------------------------------------
    // Judge Submit Comparison
    // -------------------------------------------------------------------------

    @PostMapping({"/events/{eventId}/judging/pairwise", "/judge/pairwise"})
    public ResponseEntity<ApiResponse<PairwiseComparison>> submitComparison(
            @PathVariable(required = false) Long eventId,
            @RequestParam(required = false) Long queryEventId,
            @Valid @RequestBody SubmitPairwiseComparisonRequest request,
            @AuthenticationPrincipal UserPrincipal principal) {
        if (principal == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        Long targetEventId = eventId != null ? eventId : queryEventId;
        if (targetEventId == null) {
            return ResponseEntity.badRequest().body(ApiResponse.error("eventId is required"));
        }

        PairwiseComparison comp = pairwiseService.submitComparison(targetEventId, request, principal.getId());
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok("Comparison recorded successfully", comp));
    }

    // -------------------------------------------------------------------------
    // Judge Personal Progress
    // -------------------------------------------------------------------------

    @GetMapping({"/events/{eventId}/judging/pairwise/progress", "/judge/pairwise/progress"})
    public ResponseEntity<ApiResponse<JudgePairwiseProgressResponse>> getJudgeProgress(
            @PathVariable(required = false) Long eventId,
            @RequestParam(required = false) Long queryEventId,
            @AuthenticationPrincipal UserPrincipal principal) {
        if (principal == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        Long targetEventId = eventId != null ? eventId : queryEventId;
        if (targetEventId == null) {
            return ResponseEntity.badRequest().body(ApiResponse.error("eventId is required"));
        }

        JudgePairwiseProgressResponse progress = pairwiseService.getJudgeProgress(targetEventId, principal.getId());
        return ResponseEntity.ok(ApiResponse.ok(progress));
    }

    // -------------------------------------------------------------------------
    // Judge Comparison History (Strict Peer Isolation)
    // -------------------------------------------------------------------------

    @GetMapping({"/events/{eventId}/judging/pairwise/history", "/judge/pairwise/history"})
    public ResponseEntity<ApiResponse<List<PairwiseComparison>>> getComparisonHistory(
            @PathVariable(required = false) Long eventId,
            @RequestParam(required = false) Long queryEventId,
            @RequestParam(required = false) Long judgeId,
            @AuthenticationPrincipal UserPrincipal principal) {
        if (principal == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        Long targetEventId = eventId != null ? eventId : queryEventId;
        if (targetEventId == null) {
            return ResponseEntity.badRequest().body(ApiResponse.error("eventId is required"));
        }

        List<PairwiseComparison> history = pairwiseService.getComparisonsWithIsolation(targetEventId, judgeId, principal.getId());
        return ResponseEntity.ok(ApiResponse.ok(history));
    }

    // -------------------------------------------------------------------------
    // Organizer Pairwise Results & Leaderboard (Lifecycle-Gated)
    // -------------------------------------------------------------------------

    @GetMapping({"/events/{eventId}/judging/pairwise/results", "/events/{eventId}/pairwise/results"})
    public ResponseEntity<ApiResponse<BradleyTerryRankingResult>> getPairwiseResults(
            @PathVariable Long eventId,
            @AuthenticationPrincipal UserPrincipal principal) {
        Long callerId = principal != null ? principal.getId() : null;
        BradleyTerryRankingResult results = pairwiseService.getPairwiseResults(eventId, callerId);
        return ResponseEntity.ok(ApiResponse.ok(results));
    }

    // -------------------------------------------------------------------------
    // Organizer Comparison Coverage Dashboard
    // -------------------------------------------------------------------------

    @GetMapping({"/events/{eventId}/judging/pairwise/coverage", "/events/{eventId}/pairwise/coverage"})
    public ResponseEntity<ApiResponse<PairwiseCoverageDashboardDto>> getCoverageDashboard(
            @PathVariable Long eventId,
            @AuthenticationPrincipal UserPrincipal principal) {
        if (principal == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        PairwiseCoverageDashboardDto dashboard = pairwiseService.getCoverageDashboard(eventId, principal.getId());
        return ResponseEntity.ok(ApiResponse.ok(dashboard));
    }
}
