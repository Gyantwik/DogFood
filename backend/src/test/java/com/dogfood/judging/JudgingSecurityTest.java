package com.dogfood.judging;

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
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class JudgingSecurityTest {

    @Mock private JudgingService judgingService;

    @InjectMocks private JudgingController judgingController;

    private UserPrincipal participantPrincipal;
    private UserPrincipal judgeAPrincipal;
    private UserPrincipal judgeBPrincipal;
    private UserPrincipal organizerPrincipal;

    @BeforeEach
    void setUp() {
        participantPrincipal = new UserPrincipal(100L, "participant", "participant@dogfood.local", "pwd", Collections.singletonList(new SimpleGrantedAuthority("ROLE_USER")));
        judgeAPrincipal = new UserPrincipal(201L, "judge_a", "judge_a@dogfood.local", "pwd", Collections.singletonList(new SimpleGrantedAuthority("ROLE_USER")));
        judgeBPrincipal = new UserPrincipal(202L, "judge_b", "judge_b@dogfood.local", "pwd", Collections.singletonList(new SimpleGrantedAuthority("ROLE_USER")));
        organizerPrincipal = new UserPrincipal(1L, "organizer", "organizer@dogfood.local", "pwd", Collections.singletonList(new SimpleGrantedAuthority("ROLE_USER")));
    }

    // 1. Unauthenticated judging request -> 401
    @Test
    void test1_UnauthenticatedJudgingRequestReturns401() {
        ResponseEntity<List<JudgeAssignmentResponse>> resp = judgingController.getMyAssignments(null);
        assertEquals(HttpStatus.UNAUTHORIZED, resp.getStatusCode());

        ResponseEntity<ScoreResponse> scoreResp = judgingController.submitScore(new SubmitScoreRequest(), null);
        assertEquals(HttpStatus.UNAUTHORIZED, scoreResp.getStatusCode());

        ResponseEntity<CoiResponse> coiResp = judgingController.declareConflictOfInterest(new CoiRequest(), null);
        assertEquals(HttpStatus.UNAUTHORIZED, coiResp.getStatusCode());
    }

    // 2. Participant requesting judging route -> 403
    @Test
    void test2_ParticipantRequestingJudgingRouteThrows403() {
        SubmitScoreRequest req = new SubmitScoreRequest();
        req.setSubmissionId(10L);
        req.setRawScore(4.0);
        req.setComment("Great");

        doThrow(new AccessDeniedException("User 100 lacks required role JUDGE in event 1"))
                .when(judgingService).submitScore(any(), eq(100L));

        assertThrows(AccessDeniedException.class, () ->
                judgingController.submitScore(req, participantPrincipal)
        );
    }

    // 3. Judge A requesting Judge B's assignment -> never receives Judge B's data
    @Test
    void test3_JudgeIsolationGuaranteesJudgeOnlyReceivesOwnAssignments() {
        JudgeAssignmentResponse a1 = new JudgeAssignmentResponse();
        a1.setAssignmentId(50L);
        a1.setSubmissionId(10L);
        a1.setTitle("Orbit");
        a1.setStatus("ASSIGNED");

        when(judgingService.getJudgeAssignments(201L)).thenReturn(List.of(a1));

        // When Judge A queries queue:
        ResponseEntity<List<JudgeAssignmentResponse>> respA = judgingController.getMyAssignments(judgeAPrincipal);
        assertEquals(HttpStatus.OK, respA.getStatusCode());
        assertEquals(1, respA.getBody().size());
        assertEquals(10L, respA.getBody().get(0).getSubmissionId());

        // When Judge B queries queue, service is invoked with Judge B's own ID:
        when(judgingService.getJudgeAssignments(202L)).thenReturn(List.of());
        ResponseEntity<List<JudgeAssignmentResponse>> respB = judgingController.getMyAssignments(judgeBPrincipal);
        assertEquals(0, respB.getBody().size());

        verify(judgingService).getJudgeAssignments(201L);
        verify(judgingService).getJudgeAssignments(202L);
    }

    // 4. Judge A cannot submit score for unassigned project -> 403
    @Test
    void test4_JudgeCannotScoreUnassignedProjectThrows403() {
        SubmitScoreRequest req = new SubmitScoreRequest();
        req.setSubmissionId(999L);
        req.setRawScore(4.0);
        req.setComment("Great");

        doThrow(new AccessDeniedException("Judge is not assigned to project: 999"))
                .when(judgingService).submitScore(any(), eq(201L));

        AccessDeniedException ex = assertThrows(AccessDeniedException.class, () ->
                judgingController.submitScore(req, judgeAPrincipal)
        );
        assertTrue(ex.getMessage().contains("not assigned"));
    }

    // 5. Judge with COI cannot score that project -> 403
    @Test
    void test5_JudgeWithCoiCannotScoreProjectThrows403() {
        SubmitScoreRequest req = new SubmitScoreRequest();
        req.setSubmissionId(10L);
        req.setRawScore(4.0);
        req.setComment("Score");

        doThrow(new AccessDeniedException("Conflict of interest declared: scoring not permitted for this project"))
                .when(judgingService).submitScore(any(), eq(201L));

        AccessDeniedException ex = assertThrows(AccessDeniedException.class, () ->
                judgingController.submitScore(req, judgeAPrincipal)
        );
        assertTrue(ex.getMessage().contains("Conflict of interest declared"));
    }

    // 6. Judge in Event A cannot access Event B judging data without Event B role -> 403
    @Test
    void test6_JudgeInEventACannotAccessEventBWithoutRole() {
        doThrow(new AccessDeniedException("User 201 lacks required role ORGANIZER in event 2"))
                .when(judgingService).getDashboardMetrics(2L, 201L);

        assertThrows(AccessDeniedException.class, () ->
                judgingController.getDashboard(2L, judgeAPrincipal)
        );
    }

    // 7. Organizer-only assignment/rubric operations reject participants and judges -> 403
    @Test
    void test7_OrganizerOnlyOperationsRejectParticipantsAndJudges() {
        RubricConfigRequest req = new RubricConfigRequest(List.of(new RubricCriterionDto("Criteria", "c", 100.0)));
        doThrow(new AccessDeniedException("User 201 lacks required role ORGANIZER in event 1"))
                .when(judgingService).configureRubric(eq(1L), any(), eq(201L));

        assertThrows(AccessDeniedException.class, () ->
                judgingController.configureRubric(1L, req, judgeAPrincipal)
        );

        doThrow(new AccessDeniedException("User 100 lacks required role ORGANIZER in event 1"))
                .when(judgingService).configureRubric(eq(1L), any(), eq(100L));

        assertThrows(AccessDeniedException.class, () ->
                judgingController.configureRubric(1L, req, participantPrincipal)
        );
    }

    // 8. Repeated score submission cannot create duplicate score rows -> updates existing score
    @Test
    void test8_RepeatedScoreSubmissionUpdatesExistingScore() {
        SubmitScoreRequest req1 = new SubmitScoreRequest();
        req1.setSubmissionId(10L);
        req1.setRawScore(4.0);
        req1.setComment("First score");

        ScoreResponse firstResp = new ScoreResponse();
        firstResp.setId(99L);
        firstResp.setSubmissionId(10L);
        firstResp.setJudgeId(201L);
        firstResp.setRawScore(4.0);
        firstResp.setComment("First score");
        firstResp.setCreatedAt(Instant.now());

        SubmitScoreRequest req2 = new SubmitScoreRequest();
        req2.setSubmissionId(10L);
        req2.setRawScore(5.0);
        req2.setComment("Updated score");

        ScoreResponse secondResp = new ScoreResponse();
        secondResp.setId(99L);
        secondResp.setSubmissionId(10L);
        secondResp.setJudgeId(201L);
        secondResp.setRawScore(5.0);
        secondResp.setComment("Updated score");
        secondResp.setCreatedAt(Instant.now());

        when(judgingService.submitScore(any(), eq(201L))).thenReturn(firstResp, secondResp);

        ResponseEntity<ScoreResponse> r1 = judgingController.submitScore(req1, judgeAPrincipal);
        assertEquals(4.0, r1.getBody().getRawScore());
        assertEquals(99L, r1.getBody().getId());

        ResponseEntity<ScoreResponse> r2 = judgingController.submitScore(req2, judgeAPrincipal);
        assertEquals(5.0, r2.getBody().getRawScore());
        assertEquals(99L, r2.getBody().getId()); // same ID, updated score
    }

    // 9. Judge A can read own scores -> 200 OK
    @Test
    void test9_JudgeSeesOwnScoresSuccess() {
        ScoreResponse s = new ScoreResponse();
        s.setId(1L);
        s.setSubmissionId(10L);
        s.setJudgeId(201L);
        s.setRawScore(4.5);
        s.setComment("Own score");

        when(judgingService.getScoresForJudgeWithIsolation(eq(201L), eq(201L), eq(1L)))
                .thenReturn(Collections.singletonList(s));

        ResponseEntity<List<ScoreResponse>> resp = judgingController.getJudgeScores(null, 1L, null, null, judgeAPrincipal);
        assertEquals(HttpStatus.OK, resp.getStatusCode());
        assertNotNull(resp.getBody());
        assertEquals(1, resp.getBody().size());
        assertEquals(4.5, resp.getBody().get(0).getRawScore());
    }

    // 10. Judge B cannot see Judge A's peer scores -> 403 Forbidden
    @Test
    void test10_JudgeCannotSeePeerScoresThrows403() {
        when(judgingService.resolveJudgeUserId("judge_a")).thenReturn(201L);
        doThrow(new AccessDeniedException("Access Denied: Judges cannot view peer scores"))
                .when(judgingService).getScoresForJudgeWithIsolation(eq(202L), eq(201L), eq(1L));

        assertThrows(AccessDeniedException.class, () ->
                judgingController.getJudgeScores(null, 1L, "judge_a", null, judgeBPrincipal)
        );
    }

    // 11. Participant blocked from judge scores -> 403 Forbidden
    @Test
    void test11_ParticipantBlockedFromJudgeScoresThrows403() {
        doThrow(new AccessDeniedException("Access Denied: User does not have JUDGE or ORGANIZER role"))
                .when(judgingService).getScoresForJudgeWithIsolation(eq(100L), eq(100L), eq(1L));

        assertThrows(AccessDeniedException.class, () ->
                judgingController.getJudgeScores(null, 1L, null, null, participantPrincipal)
        );
    }

    // 12. Unauthenticated request to single assignment -> 401 Unauthorized
    @Test
    void test12_UnauthenticatedSingleAssignmentReturns401() {
        ResponseEntity<JudgeAssignmentResponse> resp = judgingController.getMyAssignment(50L, null);
        assertEquals(HttpStatus.UNAUTHORIZED, resp.getStatusCode());
    }

    // 13. Judge A accessing own assignment -> 200 OK
    @Test
    void test13_JudgeAccessingOwnAssignmentReturns200() {
        JudgeAssignmentResponse a1 = new JudgeAssignmentResponse();
        a1.setAssignmentId(50L);
        a1.setSubmissionId(10L);
        a1.setTitle("Orbit");
        a1.setJudgeId(201L);

        when(judgingService.getJudgeAssignment(50L, 201L)).thenReturn(a1);

        ResponseEntity<JudgeAssignmentResponse> resp = judgingController.getMyAssignment(50L, judgeAPrincipal);
        assertEquals(HttpStatus.OK, resp.getStatusCode());
        assertNotNull(resp.getBody());
        assertEquals(50L, resp.getBody().getAssignmentId());
        assertEquals("Orbit", resp.getBody().getTitle());
    }

    // 14. Judge B accessing Judge A's assignment -> 403 Access Denied
    @Test
    void test14_JudgeAccessingPeerAssignmentThrows403() {
        doThrow(new AccessDeniedException("Access Denied: You are not authorized to view this assignment"))
                .when(judgingService).getJudgeAssignment(50L, 202L);

        assertThrows(AccessDeniedException.class, () ->
                judgingController.getMyAssignment(50L, judgeBPrincipal)
        );
    }

    // 15. Visitor (unauthenticated) accessing sensitive endpoints -> 401 Unauthorized
    @Test
    void test15_VisitorEndpointsAccessBlockedWith401() {
        // Judge queue
        assertEquals(HttpStatus.UNAUTHORIZED, judgingController.getMyAssignments(null).getStatusCode());
        assertEquals(HttpStatus.UNAUTHORIZED, judgingController.getMyAssignmentsForEvent(1L, null).getStatusCode());
        assertEquals(HttpStatus.UNAUTHORIZED, judgingController.getMyAssignment(50L, null).getStatusCode());

        // Judge scores
        assertEquals(HttpStatus.UNAUTHORIZED, judgingController.getJudgeScores(null, 1L, null, null, null).getStatusCode());

        // Organizer dashboard
        assertEquals(HttpStatus.UNAUTHORIZED, judgingController.getDashboard(1L, null).getStatusCode());

        // Judge assignments & mutations
        assertEquals(HttpStatus.UNAUTHORIZED, judgingController.getEventAssignments(1L, null).getStatusCode());
        assertEquals(HttpStatus.UNAUTHORIZED, judgingController.assignJudges(1L, new AssignJudgesRequest(), null).getStatusCode());
        assertEquals(HttpStatus.UNAUTHORIZED, judgingController.removeAssignment(1L, 50L, null).getStatusCode());
        assertEquals(HttpStatus.UNAUTHORIZED, judgingController.getEventJudges(1L, null).getStatusCode());
        assertEquals(HttpStatus.UNAUTHORIZED, judgingController.addJudge(1L, Map.of(), null).getStatusCode());
    }

    // 16. Duplicate assignment rejected with IllegalArgumentException
    @Test
    void test16_DuplicateJudgeAssignmentRejected() {
        AssignJudgesRequest req = new AssignJudgesRequest();
        req.setJudgeId(201L);
        req.setSubmissionId(10L);

        doThrow(new IllegalArgumentException("Cannot assign: Judge is already assigned to this project"))
                .when(judgingService).assignJudge(eq(1L), eq(201L), eq(10L), eq(1L), eq(true));

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () ->
                judgingController.assignJudges(1L, req, organizerPrincipal)
        );
        assertTrue(ex.getMessage().contains("already assigned"));
    }

    // 17. Removing completed assignment throws IllegalStateException
    @Test
    void test17_RemoveCompletedAssignmentThrowsIllegalStateException() {
        doThrow(new IllegalStateException("Cannot remove completed assignment: score review has already been submitted. Use score override if adjustment is needed."))
                .when(judgingService).removeAssignment(eq(1L), eq(50L), eq(1L));

        IllegalStateException ex = assertThrows(IllegalStateException.class, () ->
                judgingController.removeAssignment(1L, 50L, organizerPrincipal)
        );
        assertTrue(ex.getMessage().contains("Cannot remove completed assignment"));
    }

    // 18. Removing uncompleted assignment succeeds
    @Test
    void test18_RemoveUncompletedAssignmentSucceeds() {
        doNothing().when(judgingService).removeAssignment(eq(1L), eq(50L), eq(1L));

        ResponseEntity<?> resp = judgingController.removeAssignment(1L, 50L, organizerPrincipal);
        assertEquals(HttpStatus.OK, resp.getStatusCode());
        assertNotNull(resp.getBody());
        assertTrue(resp.getBody().toString().contains("Assignment removed successfully"));
    }
}

