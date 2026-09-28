package com.dogfood.judging;

import com.dogfood.auth.EventRole;
import com.dogfood.auth.EventRoleRepository;
import com.dogfood.auth.RoleType;
import com.dogfood.auth.User;
import com.dogfood.auth.UserRepository;
import com.dogfood.common.audit.AuditLogService;
import com.dogfood.events.Event;
import com.dogfood.events.EventRepository;
import com.dogfood.events.Score;
import com.dogfood.events.ScoreRepository;
import com.dogfood.events.Submission;
import com.dogfood.events.SubmissionRepository;
import com.dogfood.events.Track;
import com.dogfood.events.TrackRepository;
import com.dogfood.teams.TeamMemberRepository;
import com.dogfood.security.EventAuthorizationPolicy;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;

import java.time.Instant;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class JudgeWorkflowEndToEndTest {

    @Mock private RubricRepository rubricRepository;
    @Mock private RubricCriterionRepository criterionRepository;
    @Mock private JudgeAssignmentRepository assignmentRepository;
    @Mock private ConflictOfInterestRepository coiRepository;
    @Mock private ScoreRepository scoreRepository;
    @Mock private ScoreCriterionValueRepository scoreCriterionValueRepository;
    @Mock private SubmissionRepository submissionRepository;
    @Mock private EventRepository eventRepository;
    @Mock private EventRoleRepository eventRoleRepository;
    @Mock private UserRepository userRepository;
    @Mock private TrackRepository trackRepository;
    @Mock private JudgeTrackRepository judgeTrackRepository;
    @Mock private TeamMemberRepository teamMemberRepository;
    @Mock private EventAuthorizationPolicy authorizationPolicy;
    @Mock private AuditLogService auditLogService;
    @Mock private ObjectMapper objectMapper;

    @InjectMocks private JudgingService judgingService;

    private Long eventId = 2L;
    private Long organizerId = 1L;
    private Long judgeAId = 201L;
    private Long judgeBId = 202L;
    private Long projectXId = 100L;
    private Submission projectX;

    @BeforeEach
    void setUp() {
        projectX = new Submission(
                eventId, null, 10L, "Project X", "Tagline X", "Desc X", "Infra",
                "http://github.com/team/x", "http://x.example.com", "[]", "SUBMITTED",
                false, null
        );
        projectX.setId(projectXId);
    }

    // 1. Assign Judge A to Project X -> row persists -> X appears in A's queue
    @Test
    void test1_AssignJudgeAToProjectX_PersistsAndAppearsInQueue() {
        doNothing().when(authorizationPolicy).requireEventRole(organizerId, eventId, RoleType.ORGANIZER);
        doNothing().when(authorizationPolicy).requireEventRole(judgeAId, eventId, RoleType.JUDGE);

        when(submissionRepository.findById(projectXId)).thenReturn(Optional.of(projectX));
        when(coiRepository.existsByJudgeIdAndSubmissionId(judgeAId, projectXId)).thenReturn(false);
        when(assignmentRepository.findByJudgeIdAndSubmissionId(judgeAId, projectXId)).thenReturn(Optional.empty());

        JudgeAssignment savedAssignment = new JudgeAssignment(eventId, judgeAId, projectXId, "ASSIGNED");
        savedAssignment.setId(501L);
        when(assignmentRepository.save(any(JudgeAssignment.class))).thenReturn(savedAssignment);

        JudgeAssignment result = judgingService.assignJudge(eventId, judgeAId, projectXId, organizerId);
        assertNotNull(result);
        assertEquals(501L, result.getId());
        assertEquals("ASSIGNED", result.getStatus());
        assertEquals(judgeAId, result.getJudgeId());
        assertEquals(projectXId, result.getSubmissionId());

        // Now verify it appears in Judge A's queue
        when(assignmentRepository.findActiveAssignmentsForJudgeAndEvent(judgeAId, eventId))
                .thenReturn(List.of(savedAssignment));

        List<JudgeAssignmentResponse> queueA = judgingService.getJudgeAssignments(judgeAId, eventId);
        assertEquals(1, queueA.size());
        assertEquals(projectXId, queueA.get(0).getSubmissionId());
        assertEquals("Project X", queueA.get(0).getTitle());
    }

    // 2. Assign Judge B to Project X -> two valid assignments exist -> both judges see X in their own queues
    @Test
    void test2_AssignJudgeBToSameProjectX_BothJudgesSeeXInQueues() {
        doNothing().when(authorizationPolicy).requireEventRole(organizerId, eventId, RoleType.ORGANIZER);
        doNothing().when(authorizationPolicy).requireEventRole(judgeBId, eventId, RoleType.JUDGE);

        when(submissionRepository.findById(projectXId)).thenReturn(Optional.of(projectX));
        when(coiRepository.existsByJudgeIdAndSubmissionId(judgeBId, projectXId)).thenReturn(false);
        when(assignmentRepository.findByJudgeIdAndSubmissionId(judgeBId, projectXId)).thenReturn(Optional.empty());

        JudgeAssignment assignmentB = new JudgeAssignment(eventId, judgeBId, projectXId, "ASSIGNED");
        assignmentB.setId(502L);
        when(assignmentRepository.save(any(JudgeAssignment.class))).thenReturn(assignmentB);

        JudgeAssignment resB = judgingService.assignJudge(eventId, judgeBId, projectXId, organizerId);
        assertEquals(502L, resB.getId());
        assertEquals(judgeBId, resB.getJudgeId());

        // Queue A sees Assignment A
        JudgeAssignment assignmentA = new JudgeAssignment(eventId, judgeAId, projectXId, "ASSIGNED");
        assignmentA.setId(501L);
        when(assignmentRepository.findActiveAssignmentsForJudgeAndEvent(judgeAId, eventId))
                .thenReturn(List.of(assignmentA));
        List<JudgeAssignmentResponse> queueA = judgingService.getJudgeAssignments(judgeAId, eventId);
        assertEquals(1, queueA.size());
        assertEquals(501L, queueA.get(0).getAssignmentId());

        // Queue B sees Assignment B
        when(assignmentRepository.findActiveAssignmentsForJudgeAndEvent(judgeBId, eventId))
                .thenReturn(List.of(assignmentB));
        List<JudgeAssignmentResponse> queueB = judgingService.getJudgeAssignments(judgeBId, eventId);
        assertEquals(1, queueB.size());
        assertEquals(502L, queueB.get(0).getAssignmentId());
    }

    // 3. Reassign A to X using the same action -> no duplicate active assignment and no count inflation
    @Test
    void test3_ReassignAToX_ReturnsExistingAssignmentWithoutDuplication() {
        doNothing().when(authorizationPolicy).requireEventRole(organizerId, eventId, RoleType.ORGANIZER);
        doNothing().when(authorizationPolicy).requireEventRole(judgeAId, eventId, RoleType.JUDGE);

        when(submissionRepository.findById(projectXId)).thenReturn(Optional.of(projectX));
        when(coiRepository.existsByJudgeIdAndSubmissionId(judgeAId, projectXId)).thenReturn(false);

        JudgeAssignment existingAssignment = new JudgeAssignment(eventId, judgeAId, projectXId, "ASSIGNED");
        existingAssignment.setId(501L);
        when(assignmentRepository.findByJudgeIdAndSubmissionId(judgeAId, projectXId))
                .thenReturn(Optional.of(existingAssignment));

        JudgeAssignment result = judgingService.assignJudge(eventId, judgeAId, projectXId, organizerId);
        assertNotNull(result);
        assertEquals(501L, result.getId());
        // Verify save was NOT called to create a second row
        verify(assignmentRepository, never()).save(argThat(a -> a.getId() == null));
    }

    // 4. A scores X -> criterion values and score persist -> A's assignment becomes completed
    @Test
    void test4_JudgeAScoresX_PersistsScoreAndCriteria_MarksAssignmentCompleted() {
        when(submissionRepository.findById(projectXId)).thenReturn(Optional.of(projectX));
        when(coiRepository.existsByJudgeIdAndSubmissionId(judgeAId, projectXId)).thenReturn(false);

        JudgeAssignment assignmentA = new JudgeAssignment(eventId, judgeAId, projectXId, "ASSIGNED");
        assignmentA.setId(501L);
        when(assignmentRepository.findByJudgeIdAndSubmissionId(judgeAId, projectXId))
                .thenReturn(Optional.of(assignmentA));

        when(scoreRepository.findByJudgeIdAndSubmissionId(judgeAId, projectXId)).thenReturn(Optional.empty());

        Score savedScore = new Score(eventId, projectXId, judgeAId, 4.0, "Great architecture");
        savedScore.setId(888L);
        when(scoreRepository.save(any(Score.class))).thenReturn(savedScore);

        Rubric rubric = new Rubric(eventId, false);
        rubric.setId(10L);
        when(rubricRepository.findByEventId(eventId)).thenReturn(Optional.of(rubric));
        when(criterionRepository.findByRubricId(10L)).thenReturn(List.of(
                new RubricCriterion(rubric, "Impact", "impact", 100.0, 1.0, 5.0)
        ));

        SubmitScoreRequest req = new SubmitScoreRequest();
        req.setSubmissionId(projectXId);
        req.setRawScore(4.0);
        req.setComment("Great architecture");
        req.setCriteria(Map.of("impact", 4.0));
        req.setEventId(eventId);

        ScoreResponse resp = judgingService.submitScore(req, judgeAId);
        assertNotNull(resp);
        assertEquals(888L, resp.getId());
        assertEquals(4.0, resp.getRawScore());

        // Verify assignment status marked COMPLETED
        assertEquals("COMPLETED", assignmentA.getStatus());
        verify(assignmentRepository).save(assignmentA);

        // Verify criteria values saved
        verify(scoreCriterionValueRepository).save(any(ScoreCriterionValue.class));
    }

    // 5. B scores X -> B's separate score persists -> neither judge can read the other's private score
    @Test
    void test5_BProducesIndependentScore_NeitherCanReadPeerScore() {
        Score scoreA = new Score(eventId, projectXId, judgeAId, 4.5, "Judge A review");
        scoreA.setId(801L);
        Score scoreB = new Score(eventId, projectXId, judgeBId, 3.5, "Judge B review");
        scoreB.setId(802L);

        when(authorizationPolicy.hasEventRole(judgeAId, eventId, RoleType.JUDGE)).thenReturn(true);
        when(authorizationPolicy.hasEventRole(judgeAId, eventId, RoleType.ORGANIZER)).thenReturn(false);
        when(authorizationPolicy.hasEventRole(judgeBId, eventId, RoleType.JUDGE)).thenReturn(true);
        when(authorizationPolicy.hasEventRole(judgeBId, eventId, RoleType.ORGANIZER)).thenReturn(false);

        when(scoreRepository.findByEventIdAndJudgeId(eventId, judgeAId)).thenReturn(List.of(scoreA));

        // Judge A reads own scores -> Success
        List<ScoreResponse> scoresA = judgingService.getScoresForJudgeWithIsolation(judgeAId, judgeAId, eventId);
        assertEquals(1, scoresA.size());
        assertEquals(4.5, scoresA.get(0).getRawScore());

        // Judge B attempts to read Judge A's scores -> 403 Forbidden
        assertThrows(AccessDeniedException.class, () ->
                judgingService.getScoresForJudgeWithIsolation(judgeBId, judgeAId, eventId)
        );
    }

    // 6. Failed score submission (invalid rubric criterion) -> leaves assignment pending
    @Test
    void test6_FailedScoreSubmission_LeavesAssignmentPending() {
        when(submissionRepository.findById(projectXId)).thenReturn(Optional.of(projectX));
        when(coiRepository.existsByJudgeIdAndSubmissionId(judgeAId, projectXId)).thenReturn(false);

        JudgeAssignment assignmentA = new JudgeAssignment(eventId, judgeAId, projectXId, "ASSIGNED");
        assignmentA.setId(501L);
        when(assignmentRepository.findByJudgeIdAndSubmissionId(judgeAId, projectXId))
                .thenReturn(Optional.of(assignmentA));

        Rubric rubric = new Rubric(eventId, false);
        rubric.setId(10L);
        when(rubricRepository.findByEventId(eventId)).thenReturn(Optional.of(rubric));
        when(criterionRepository.findByRubricId(10L)).thenReturn(List.of(
                new RubricCriterion(rubric, "Impact", "impact", 100.0, 1.0, 5.0)
        ));

        // Unknown criterion 'fraudulent_key'
        SubmitScoreRequest req = new SubmitScoreRequest();
        req.setSubmissionId(projectXId);
        req.setRawScore(5.0);
        req.setComment("Note");
        req.setCriteria(Map.of("fraudulent_key", 5.0));
        req.setEventId(eventId);

        assertThrows(IllegalArgumentException.class, () -> judgingService.submitScore(req, judgeAId));

        // Assignment status MUST remain ASSIGNED
        assertEquals("ASSIGNED", assignmentA.getStatus());
        verify(scoreRepository, never()).save(any(Score.class));
    }

    // 7. Participant or non-event user cannot assign or view queues
    @Test
    void test7_NonOrganizerCannotAssign_NonJudgeCannotViewQueue() {
        Long participantId = 300L;
        doThrow(new AccessDeniedException("Forbidden")).when(authorizationPolicy)
                .requireEventRole(participantId, eventId, RoleType.ORGANIZER);

        assertThrows(AccessDeniedException.class, () ->
                judgingService.assignJudge(eventId, judgeAId, projectXId, participantId)
        );

        doThrow(new AccessDeniedException("Forbidden")).when(authorizationPolicy)
                .requireEventRole(participantId, eventId, RoleType.JUDGE);

        assertThrows(AccessDeniedException.class, () ->
                judgingService.getJudgeAssignments(participantId, eventId)
        );
    }

    // 8. Automatic balancing twice -> idempotent, no duplicate pairings
    @Test
    void test8_AutoAssignTwice_IdempotentWorkload() {
        doNothing().when(authorizationPolicy).requireEventRole(organizerId, eventId, RoleType.ORGANIZER);

        User userA = new User("judge_a", "a@test.com", "pass");
        userA.setId(judgeAId);
        EventRole roleA = new EventRole(userA, eventId, RoleType.JUDGE);

        when(eventRoleRepository.findByEventIdAndRole(eventId, RoleType.JUDGE)).thenReturn(List.of(roleA));
        when(submissionRepository.findByEventIdAndStatus(eventId, "SUBMITTED")).thenReturn(List.of(projectX));
        when(trackRepository.findByEventId(eventId)).thenReturn(Collections.emptyList());

        // First run: not yet assigned
        when(assignmentRepository.existsByJudgeIdAndSubmissionId(judgeAId, projectXId)).thenReturn(false);
        when(assignmentRepository.findByEventId(eventId)).thenReturn(Collections.emptyList());

        AutoAssignResult res1 = judgingService.autoAssignJudges(eventId, organizerId, 1);
        assertEquals(1, res1.getTotalAssignmentsCreated());

        // Second run: assignment already exists in DB
        JudgeAssignment existingA = new JudgeAssignment(eventId, judgeAId, projectXId, "ASSIGNED");
        when(assignmentRepository.existsByJudgeIdAndSubmissionId(judgeAId, projectXId)).thenReturn(true);
        when(assignmentRepository.findByEventId(eventId)).thenReturn(List.of(existingA));

        AutoAssignResult res2 = judgingService.autoAssignJudges(eventId, organizerId, 1);
        assertEquals(0, res2.getTotalAssignmentsCreated(), "Second run must not create duplicate assignments");
    }

    // 9. COI declaration -> marks REMOVED_COI -> cannot score -> eligible for reassignment
    @Test
    void test9_CoiDeclaration_ExcludesFromScoring_AllowsReassignment() {
        when(submissionRepository.findById(projectXId)).thenReturn(Optional.of(projectX));
        doNothing().when(authorizationPolicy).requireEventRole(judgeAId, eventId, RoleType.JUDGE);

        JudgeAssignment assignmentA = new JudgeAssignment(eventId, judgeAId, projectXId, "ASSIGNED");
        assignmentA.setId(501L);
        when(assignmentRepository.findByJudgeIdAndSubmissionId(judgeAId, projectXId)).thenReturn(Optional.of(assignmentA));

        CoiRequest coiReq = new CoiRequest(projectXId, CoiReason.SAME_TEAM, "Friend on team");
        coiReq.setEventId(eventId);

        CoiResponse coiResp = judgingService.declareCoi(coiReq, judgeAId);
        assertNotNull(coiResp);
        assertEquals("REMOVED_COI", assignmentA.getStatus());

        // Attempting to score a REMOVED_COI assignment throws AccessDeniedException
        when(coiRepository.existsByJudgeIdAndSubmissionId(judgeAId, projectXId)).thenReturn(true);

        SubmitScoreRequest scoreReq = new SubmitScoreRequest();
        scoreReq.setSubmissionId(projectXId);
        scoreReq.setRawScore(4.0);
        scoreReq.setComment("Score");
        scoreReq.setCriteria(Map.of());
        scoreReq.setEventId(eventId);

        assertThrows(AccessDeniedException.class, () -> judgingService.submitScore(scoreReq, judgeAId));
    }

    // 10. Organizer assignment removal policy -> cannot delete COMPLETED review
    @Test
    void test10_OrganizerCannotDeleteCompletedAssignment_CanDeletePending() {
        doNothing().when(authorizationPolicy).requireEventRole(organizerId, eventId, RoleType.ORGANIZER);

        JudgeAssignment completed = new JudgeAssignment(eventId, judgeAId, projectXId, "COMPLETED");
        completed.setId(701L);
        when(assignmentRepository.findById(701L)).thenReturn(Optional.of(completed));

        // Attempting to delete completed assignment must fail
        IllegalStateException ex = assertThrows(IllegalStateException.class, () ->
                judgingService.removeAssignment(eventId, 701L, organizerId)
        );
        assertTrue(ex.getMessage().contains("Cannot remove completed assignment"));

        // Pending assignment can be removed
        JudgeAssignment pending = new JudgeAssignment(eventId, judgeBId, projectXId, "ASSIGNED");
        pending.setId(702L);
        when(assignmentRepository.findById(702L)).thenReturn(Optional.of(pending));

        assertDoesNotThrow(() -> judgingService.removeAssignment(eventId, 702L, organizerId));
        verify(assignmentRepository).delete(pending);
    }

    // 11. Event-scoped metrics -> accurately derives assignments, pending, completed, without cross-event leakage
    @Test
    void test11_DashboardMetrics_EventScoped_AccuratelyDerivesBreakdown() {
        doNothing().when(authorizationPolicy).requireEventRole(organizerId, eventId, RoleType.ORGANIZER);

        User userA = new User("judge_a", "a@test.com", "pass");
        userA.setId(judgeAId);
        EventRole roleA = new EventRole(userA, eventId, RoleType.JUDGE);

        when(submissionRepository.countByEventIdAndStatus(eventId, "SUBMITTED")).thenReturn(5L);
        when(eventRoleRepository.findByEventIdAndRole(eventId, RoleType.JUDGE)).thenReturn(List.of(roleA));
        when(scoreRepository.findAverageScoreByEventId(eventId)).thenReturn(4.2);

        when(assignmentRepository.countByEventIdAndJudgeId(eventId, judgeAId)).thenReturn(3L);
        when(assignmentRepository.countByEventIdAndJudgeIdAndStatus(eventId, judgeAId, "COMPLETED")).thenReturn(2L);

        when(assignmentRepository.countByEventIdAndStatus(eventId, "ASSIGNED")).thenReturn(1L);
        when(assignmentRepository.countByEventIdAndStatus(eventId, "COMPLETED")).thenReturn(2L);
        when(assignmentRepository.countByEventIdAndStatus(eventId, "REMOVED_COI")).thenReturn(1L);
        when(assignmentRepository.countByEventId(eventId)).thenReturn(4L);

        when(submissionRepository.findByEventId(eventId)).thenReturn(List.of(projectX));
        when(scoreRepository.countByEventIdAndSubmissionId(eventId, projectXId)).thenReturn(2L);

        JudgingDashboardResponse dash = judgingService.getDashboardMetrics(eventId, organizerId);
        assertNotNull(dash);
        assertEquals(5L, dash.getProjectsSubmitted());
        assertEquals(1L, dash.getJudgesCount());
        assertEquals(4.2, dash.getAvgScore());

        assertEquals(4L, dash.getTotalAssignments());
        assertEquals(3L, dash.getTotalEligibleAssignments());
        assertEquals(1L, dash.getPendingAssignments());
        assertEquals(2L, dash.getCompletedAssignments());
        assertEquals(1L, dash.getRemovedCoiAssignments());
        assertEquals(1L, dash.getJudgesWithOutstandingWork());
        assertEquals(1L, dash.getProjectsWithMultipleReviews());
    }
}
