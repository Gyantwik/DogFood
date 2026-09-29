package com.dogfood.judging;

import com.dogfood.common.ApiResponse;
import com.dogfood.common.audit.AuditLogService;
import com.dogfood.normalization.ZScoreNormalizationService;
import com.dogfood.security.EventAuthorizationPolicy;
import com.dogfood.security.UserPrincipal;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api")
public class JudgingController {

    private final JudgingService judgingService;
    private final ZScoreNormalizationService zScoreNormalizationService;
    private final AuditLogService auditLogService;
    private final EventAuthorizationPolicy authorizationPolicy;

    public JudgingController(JudgingService judgingService,
                             ZScoreNormalizationService zScoreNormalizationService,
                             AuditLogService auditLogService,
                             EventAuthorizationPolicy authorizationPolicy) {
        this.judgingService = judgingService;
        this.zScoreNormalizationService = zScoreNormalizationService;
        this.auditLogService = auditLogService;
        this.authorizationPolicy = authorizationPolicy;
    }

    // -------------------------------------------------------------
    // Rubric Endpoints
    // -------------------------------------------------------------

    @GetMapping("/events/{eventId}/rubric")
    public ResponseEntity<List<RubricCriterionDto>> getRubricCriteria(@PathVariable Long eventId) {
        return ResponseEntity.ok(judgingService.getRubricCriteria(eventId));
    }

    @GetMapping("/events/{eventId}/rubric/details")
    public ResponseEntity<RubricResponse> getRubricDetails(@PathVariable Long eventId) {
        return ResponseEntity.ok(judgingService.getRubricDetails(eventId));
    }

    @PostMapping("/events/{eventId}/rubric")
    public ResponseEntity<RubricResponse> configureRubric(
            @PathVariable Long eventId,
            @Valid @RequestBody RubricConfigRequest request,
            @AuthenticationPrincipal UserPrincipal principal) {
        if (principal == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        return ResponseEntity.ok(judgingService.configureRubric(eventId, request, principal.getId()));
    }

    // -------------------------------------------------------------
    // Assignment Endpoints
    // -------------------------------------------------------------

    @PostMapping("/events/{eventId}/assignments")
    public ResponseEntity<?> assignJudges(
            @PathVariable Long eventId,
            @RequestBody AssignJudgesRequest request,
            @AuthenticationPrincipal UserPrincipal principal) {
        if (principal == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        if (request.isAutoAssign()) {
            AutoAssignResult result = judgingService.autoAssignJudges(eventId, principal.getId(), request.getReviewsPerProject());
            return ResponseEntity.ok().body(result);
        }
        if (request.getJudgeId() != null && request.getSubmissionId() != null) {
            JudgeAssignment asgn = judgingService.assignJudge(eventId, request.getJudgeId(), request.getSubmissionId(), principal.getId(), true);
            return ResponseEntity.ok(asgn);
        }
        return ResponseEntity.badRequest().body(Map.of("error", "Missing judgeId or submissionId"));
    }

    @GetMapping("/events/{eventId}/assignments")
    public ResponseEntity<?> getEventAssignments(
            @PathVariable Long eventId,
            @AuthenticationPrincipal UserPrincipal principal) {
        if (principal == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        return ResponseEntity.ok(judgingService.getEventAssignments(eventId, principal.getId()));
    }

    @DeleteMapping("/events/{eventId}/assignments/{assignmentId}")
    public ResponseEntity<?> removeAssignment(
            @PathVariable Long eventId,
            @PathVariable Long assignmentId,
            @AuthenticationPrincipal UserPrincipal principal) {
        if (principal == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        judgingService.removeAssignment(eventId, assignmentId, principal.getId());
        return ResponseEntity.ok(Map.of("message", "Assignment removed successfully", "assignmentId", assignmentId));
    }

    @GetMapping("/events/{eventId}/judges")
    public ResponseEntity<?> getEventJudges(
            @PathVariable Long eventId,
            @AuthenticationPrincipal UserPrincipal principal) {
        if (principal == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        return ResponseEntity.ok(judgingService.getEventJudges(eventId, principal.getId()));
    }

    @PostMapping("/events/{eventId}/judges")
    public ResponseEntity<?> addJudge(
            @PathVariable Long eventId,
            @RequestBody Map<String, Object> request,
            @AuthenticationPrincipal UserPrincipal principal) {
        if (principal == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        Long judgeUserId = null;
        if (request.containsKey("judgeId")) {
            judgeUserId = Long.valueOf(request.get("judgeId").toString());
        } else if (request.containsKey("email")) {
            judgeUserId = judgingService.resolveJudgeUserId(request.get("email").toString());
        } else if (request.containsKey("username")) {
            judgeUserId = judgingService.resolveJudgeUserId(request.get("username").toString());
        }
        judgingService.addJudgeToEvent(eventId, judgeUserId, principal.getId());
        return ResponseEntity.ok(Map.of("message", "Judge added to event successfully", "judgeId", judgeUserId));
    }

    // -------------------------------------------------------------
    // Judge Queue (Strictly DB-Scoped to Authenticated Judge)
    // -------------------------------------------------------------

    @GetMapping({"/judges/me/assignments", "/judging/queue"})
    public ResponseEntity<List<JudgeAssignmentResponse>> getMyAssignments(
            @RequestParam(value = "eventId", required = false) Long queryEventId,
            @AuthenticationPrincipal UserPrincipal principal) {
        if (principal == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        if (queryEventId != null) {
            return ResponseEntity.ok(judgingService.getJudgeAssignments(principal.getId(), queryEventId));
        }
        return ResponseEntity.ok(judgingService.getJudgeAssignments(principal.getId()));
    }

    public ResponseEntity<List<JudgeAssignmentResponse>> getMyAssignments(UserPrincipal principal) {
        return getMyAssignments((Long) null, principal);
    }

    @GetMapping("/events/{eventId}/judges/me/assignments")
    public ResponseEntity<List<JudgeAssignmentResponse>> getMyAssignmentsForEvent(
            @PathVariable Long eventId,
            @AuthenticationPrincipal UserPrincipal principal) {
        if (principal == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        return ResponseEntity.ok(judgingService.getJudgeAssignments(principal.getId(), eventId));
    }

    @GetMapping({"/judges/me/assignments/{assignmentId}", "/judging/assignments/{assignmentId}"})
    public ResponseEntity<JudgeAssignmentResponse> getMyAssignment(
            @PathVariable Long assignmentId,
            @RequestParam(value = "eventId", required = false) Long queryEventId,
            @AuthenticationPrincipal UserPrincipal principal) {
        if (principal == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        if (queryEventId != null) {
            return ResponseEntity.ok(judgingService.getJudgeAssignment(assignmentId, principal.getId(), queryEventId));
        }
        return ResponseEntity.ok(judgingService.getJudgeAssignment(assignmentId, principal.getId()));
    }

    public ResponseEntity<JudgeAssignmentResponse> getMyAssignment(Long assignmentId, UserPrincipal principal) {
        return getMyAssignment(assignmentId, (Long) null, principal);
    }

    @GetMapping("/events/{eventId}/judges/me/assignments/{assignmentId}")
    public ResponseEntity<JudgeAssignmentResponse> getMyAssignmentForEvent(
            @PathVariable Long eventId,
            @PathVariable Long assignmentId,
            @AuthenticationPrincipal UserPrincipal principal) {
        if (principal == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        return ResponseEntity.ok(judgingService.getJudgeAssignment(assignmentId, principal.getId(), eventId));
    }

    // -------------------------------------------------------------
    // Conflict of Interest
    // -------------------------------------------------------------

    @PostMapping("/judging/coi")
    public ResponseEntity<CoiResponse> declareConflictOfInterest(
            @Valid @RequestBody CoiRequest request,
            @AuthenticationPrincipal UserPrincipal principal) {
        if (principal == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        return ResponseEntity.ok(judgingService.declareCoi(request, principal.getId()));
    }

    @PostMapping("/events/{eventId}/coi")
    public ResponseEntity<CoiResponse> declareConflictOfInterestForEvent(
            @PathVariable Long eventId,
            @Valid @RequestBody CoiRequest request,
            @AuthenticationPrincipal UserPrincipal principal) {
        if (principal == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        if (eventId != null) {
            request.setEventId(eventId);
        }
        return ResponseEntity.ok(judgingService.declareCoi(request, principal.getId()));
    }

    // -------------------------------------------------------------
    // Scoring Endpoint
    // -------------------------------------------------------------

    @PostMapping({"/judging/scores", "/scores"})
    public ResponseEntity<ScoreResponse> submitScore(
            @Valid @RequestBody SubmitScoreRequest request,
            @AuthenticationPrincipal UserPrincipal principal) {
        if (principal == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        return ResponseEntity.ok(judgingService.submitScore(request, principal.getId()));
    }

    @PostMapping("/events/{eventId}/scores")
    public ResponseEntity<ScoreResponse> submitScoreForEvent(
            @PathVariable Long eventId,
            @Valid @RequestBody SubmitScoreRequest request,
            @AuthenticationPrincipal UserPrincipal principal) {
        if (principal == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        request.setEventId(eventId);
        return ResponseEntity.ok(judgingService.submitScore(request, principal.getId()));
    }

    @PostMapping("/events/{eventId}/scores/override")
    public ResponseEntity<ScoreResponse> overrideScore(
            @PathVariable Long eventId,
            @Valid @RequestBody SubmitScoreRequest request,
            @AuthenticationPrincipal UserPrincipal principal) {
        if (principal == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        return ResponseEntity.ok(judgingService.overrideScore(eventId, request, principal.getId()));
    }

    // -------------------------------------------------------------
    // Score Reading Endpoints (Strict Caller Authorization & Peer Isolation)
    // -------------------------------------------------------------

    @GetMapping({"/judge/scores", "/judges/scores", "/judges/{targetJudgeId}/scores", "/events/{eventId}/scores"})
    public ResponseEntity<List<ScoreResponse>> getJudgeScores(
            @PathVariable(required = false) Long targetJudgeId,
            @PathVariable(required = false) Long eventId,
            @RequestParam(value = "eventId", required = false) Long queryEventId,
            @RequestParam(required = false) String judge,
            @RequestParam(required = false) Long judgeId,
            @AuthenticationPrincipal UserPrincipal principal) {
        if (principal == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        Long targetEventId = eventId != null ? eventId : queryEventId;
        Long targetUserId = principal.getId(); // default to self

        if (targetJudgeId != null) {
            targetUserId = targetJudgeId;
        } else if (judgeId != null) {
            targetUserId = judgeId;
        } else if (judge != null && !judge.isBlank()) {
            targetUserId = judgingService.resolveJudgeUserId(judge);
        }

        List<ScoreResponse> scores = judgingService.getScoresForJudgeWithIsolation(principal.getId(), targetUserId, targetEventId);
        return ResponseEntity.ok(scores);
    }

    public ResponseEntity<List<ScoreResponse>> getJudgeScores(
            Long targetJudgeId,
            Long eventId,
            String judge,
            Long judgeId,
            UserPrincipal principal) {
        return getJudgeScores(targetJudgeId, eventId, null, judge, judgeId, principal);
    }

    // -------------------------------------------------------------
    // Organizer Dashboard
    // -------------------------------------------------------------

    @GetMapping("/events/{eventId}/dashboard")
    public ResponseEntity<JudgingDashboardResponse> getDashboard(
            @PathVariable Long eventId,
            @AuthenticationPrincipal UserPrincipal principal) {
        if (principal == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        return ResponseEntity.ok(judgingService.getDashboardMetrics(eventId, principal.getId()));
    }

    // -------------------------------------------------------------
    // Judge Operations & Reporting
    // -------------------------------------------------------------

    @GetMapping("/events/{eventId}/judging/coverage")
    public ResponseEntity<JudgeCoverageDto> getJudgeCoverage(
            @PathVariable Long eventId,
            @AuthenticationPrincipal UserPrincipal principal) {
        if (principal == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        return ResponseEntity.ok(judgingService.getJudgeCoverage(eventId, principal.getId()));
    }

    @GetMapping("/events/{eventId}/judging/workload")
    public ResponseEntity<JudgeWorkloadDto> getJudgeWorkload(
            @PathVariable Long eventId,
            @AuthenticationPrincipal UserPrincipal principal) {
        if (principal == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        return ResponseEntity.ok(judgingService.getJudgeWorkload(eventId, principal.getId()));
    }

    @GetMapping("/events/{eventId}/judging/scoring-health")
    public ResponseEntity<ScoringHealthDto> getScoringHealth(
            @PathVariable Long eventId,
            @AuthenticationPrincipal UserPrincipal principal) {
        if (principal == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        return ResponseEntity.ok(judgingService.getScoringHealth(eventId, principal.getId()));
    }

    @GetMapping("/events/{eventId}/judging/normalization-analysis")
    public ResponseEntity<?> getNormalizationAnalysis(
            @PathVariable Long eventId,
            @AuthenticationPrincipal UserPrincipal principal) {
        if (principal == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        authorizationPolicy.requireEventRole(principal.getId(), eventId, com.dogfood.auth.RoleType.ORGANIZER);
        return ResponseEntity.ok(zScoreNormalizationService.getNormalizationAnalysis(eventId));
    }

    @GetMapping("/events/{eventId}/judging/normalization-proof")
    public ResponseEntity<?> getNormalizationProof(
            @PathVariable Long eventId,
            @AuthenticationPrincipal UserPrincipal principal) {
        if (principal == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        authorizationPolicy.requireEventRole(principal.getId(), eventId, com.dogfood.auth.RoleType.ORGANIZER);
        return ResponseEntity.ok(zScoreNormalizationService.getNormalizationProof(eventId));
    }
}

