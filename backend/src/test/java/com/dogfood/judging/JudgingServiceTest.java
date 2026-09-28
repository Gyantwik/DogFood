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
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class JudgingServiceTest {

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

    private Submission testSubmission;

    @BeforeEach
    void setUp() {
        testSubmission = new Submission(
                1L, null, 100L, "Orbit", "Tagline", "Desc", "Infra",
                "http://github.com", "http://demo.com", "[]", "SUBMITTED",
                false, null
        );
        testSubmission.setId(10L);
    }

    @Test
    void testConfigureRubricValidatesTotalWeight100() {
        doNothing().when(authorizationPolicy).requireEventRole(1L, 1L, RoleType.ORGANIZER);
        when(rubricRepository.findByEventId(1L)).thenReturn(Optional.empty());
        when(rubricRepository.save(any(Rubric.class))).thenAnswer(i -> {
            Rubric r = i.getArgument(0);
            r.setId(5L);
            return r;
        });

        // Invalid: sum = 80 != 100
        RubricConfigRequest badReq = new RubricConfigRequest(List.of(
                new RubricCriterionDto("Criteria A", "a", 50.0),
                new RubricCriterionDto("Criteria B", "b", 30.0)
        ));
        assertThrows(IllegalArgumentException.class, () ->
                judgingService.configureRubric(1L, badReq, 1L)
        );

        // Valid: sum = 100
        RubricConfigRequest goodReq = new RubricConfigRequest(List.of(
                new RubricCriterionDto("Criteria A", "a", 60.0),
                new RubricCriterionDto("Criteria B", "b", 40.0)
        ));
        RubricResponse resp = judgingService.configureRubric(1L, goodReq, 1L);
        assertNotNull(resp);
        assertEquals(2, resp.getCriteria().size());
        verify(auditLogService).logAction(eq(1L), eq(1L), eq("CONFIGURE_RUBRIC"), any());
    }

    @Test
    void testConfigureRubricRejectsWhenLocked() {
        doNothing().when(authorizationPolicy).requireEventRole(1L, 1L, RoleType.ORGANIZER);
        Rubric lockedRubric = new Rubric(1L, true);
        lockedRubric.setId(5L);
        when(rubricRepository.findByEventId(1L)).thenReturn(Optional.of(lockedRubric));

        RubricConfigRequest req = new RubricConfigRequest(List.of(
                new RubricCriterionDto("Criteria A", "a", 100.0)
        ));

        IllegalStateException ex = assertThrows(IllegalStateException.class, () ->
                judgingService.configureRubric(1L, req, 1L)
        );
        assertTrue(ex.getMessage().contains("locked"));
    }

    @Test
    void testAssignJudgePreventsAssignmentWhenCoiExists() {
        doNothing().when(authorizationPolicy).requireEventRole(1L, 1L, RoleType.ORGANIZER);
        doNothing().when(authorizationPolicy).requireEventRole(200L, 1L, RoleType.JUDGE);
        when(submissionRepository.findById(10L)).thenReturn(Optional.of(testSubmission));
        // COI exists!
        when(coiRepository.existsByJudgeIdAndSubmissionId(200L, 10L)).thenReturn(true);

        assertThrows(IllegalArgumentException.class, () ->
                judgingService.assignJudge(1L, 200L, 10L, 1L)
        );
        verify(assignmentRepository, never()).save(any());
    }

    @Test
    void testDeclareCoiRemovesActiveAssignment() {
        when(submissionRepository.findById(10L)).thenReturn(Optional.of(testSubmission));
        doNothing().when(authorizationPolicy).requireEventRole(200L, 1L, RoleType.JUDGE);
        when(coiRepository.findByJudgeIdAndSubmissionId(200L, 10L)).thenReturn(Optional.empty());

        JudgeAssignment activeAsgn = new JudgeAssignment(1L, 200L, 10L, "ASSIGNED");
        activeAsgn.setId(50L);
        when(assignmentRepository.findByJudgeIdAndSubmissionId(200L, 10L)).thenReturn(Optional.of(activeAsgn));

        CoiRequest req = new CoiRequest(10L, CoiReason.SAME_TEAM, "Worked with author");
        CoiResponse resp = judgingService.declareCoi(req, 200L);

        assertNotNull(resp);
        assertEquals("SAME_TEAM", resp.getReason());
        // Verify active assignment status updated to REMOVED_COI
        assertEquals("REMOVED_COI", activeAsgn.getStatus());
        verify(assignmentRepository).save(activeAsgn);
        verify(auditLogService).logAction(eq(200L), eq(1L), eq("REMOVE_ASSIGNMENT_COI"), any());
    }

    @Test
    void testSubmitScoreCalculatesWeightedScoreAndLocksRubric() {
        when(submissionRepository.findById(10L)).thenReturn(Optional.of(testSubmission));
        doNothing().when(authorizationPolicy).requireEventRole(200L, 1L, RoleType.JUDGE);
        when(coiRepository.existsByJudgeIdAndSubmissionId(200L, 10L)).thenReturn(false);

        JudgeAssignment asgn = new JudgeAssignment(1L, 200L, 10L, "ASSIGNED");
        asgn.setId(50L);
        when(assignmentRepository.findByJudgeIdAndSubmissionId(200L, 10L)).thenReturn(Optional.of(asgn));

        Rubric rubric = new Rubric(1L, false);
        rubric.setId(5L);
        when(rubricRepository.findByEventId(1L)).thenReturn(Optional.of(rubric));

        when(scoreRepository.findByJudgeIdAndSubmissionId(200L, 10L)).thenReturn(Optional.empty());
        when(scoreRepository.save(any(Score.class))).thenAnswer(i -> {
            Score s = i.getArgument(0);
            s.setId(99L);
            return s;
        });

        SubmitScoreRequest req = new SubmitScoreRequest();
        req.setSubmissionId(10L);
        req.setCriteria(Map.of(
                "tier", 4.0,       // 4.0 * 0.40 = 1.60
                "integrity", 4.0,  // 4.0 * 0.25 = 1.00
                "adoptability", 4.0,// 4.0 * 0.20 = 0.80
                "code", 4.0        // 4.0 * 0.15 = 0.60 -> total 4.0
        ));
        req.setComment("Great work");

        ScoreResponse resp = judgingService.submitScore(req, 200L);

        assertNotNull(resp);
        assertEquals(4.0, resp.getRawScore(), 0.01);
        assertTrue(rubric.isLocked(), "Rubric must be locked on first score submission");
        assertEquals("COMPLETED", asgn.getStatus());
        verify(auditLogService).logAction(eq(200L), eq(1L), eq("SUBMIT_SCORE"), any());
    }

    @Test
    void testResubmittingScoreUpdatesExistingRecord() {
        when(submissionRepository.findById(10L)).thenReturn(Optional.of(testSubmission));
        doNothing().when(authorizationPolicy).requireEventRole(200L, 1L, RoleType.JUDGE);
        when(coiRepository.existsByJudgeIdAndSubmissionId(200L, 10L)).thenReturn(false);

        JudgeAssignment asgn = new JudgeAssignment(1L, 200L, 10L, "COMPLETED");
        asgn.setId(50L);
        when(assignmentRepository.findByJudgeIdAndSubmissionId(200L, 10L)).thenReturn(Optional.of(asgn));

        Rubric rubric = new Rubric(1L, true);
        rubric.setId(5L);
        when(rubricRepository.findByEventId(1L)).thenReturn(Optional.of(rubric));

        Score existingScore = new Score(1L, 10L, 200L, 3.0, "Old comment");
        existingScore.setId(99L);
        when(scoreRepository.findByJudgeIdAndSubmissionId(200L, 10L)).thenReturn(Optional.of(existingScore));
        when(scoreRepository.save(any(Score.class))).thenAnswer(i -> i.getArgument(0));

        SubmitScoreRequest req = new SubmitScoreRequest();
        req.setSubmissionId(10L);
        req.setCriteria(Map.of(
                "tier", 5.0,
                "integrity", 5.0,
                "adoptability", 5.0,
                "code", 5.0
        ));
        req.setComment("Updated score to 5.0");

        ScoreResponse resp = judgingService.submitScore(req, 200L);

        assertEquals(99L, resp.getId());
        assertEquals(5.0, resp.getRawScore(), 0.01);
        assertEquals("Updated score to 5.0", resp.getComment());
        // Updated existingScore instead of creating new row
        assertEquals(5.0, existingScore.getRawScore(), 0.01);
    }

    @Test
    void testSubmitScore_FailsBeforeJudgingStart() {
        Event event = new Event("Hackathon", "Desc", Instant.now().plus(5, java.time.temporal.ChronoUnit.DAYS));
        event.setId(1L);
        event.setJudgingStart(Instant.now().plus(2, java.time.temporal.ChronoUnit.DAYS)); // In future

        when(submissionRepository.findById(10L)).thenReturn(Optional.of(testSubmission));
        when(eventRepository.findById(1L)).thenReturn(Optional.of(event));

        SubmitScoreRequest req = new SubmitScoreRequest();
        req.setSubmissionId(10L);

        IllegalStateException ex = assertThrows(IllegalStateException.class, () ->
                judgingService.submitScore(req, 200L)
        );
        assertTrue(ex.getMessage().contains("Judging period has not started yet"));
    }

    @Test
    void testSubmitScore_FailsAfterJudgingEnd() {
        Event event = new Event("Hackathon", "Desc", Instant.now().minus(5, java.time.temporal.ChronoUnit.DAYS));
        event.setId(1L);
        event.setJudgingEnd(Instant.now().minus(1, java.time.temporal.ChronoUnit.DAYS)); // Past

        when(submissionRepository.findById(10L)).thenReturn(Optional.of(testSubmission));
        when(eventRepository.findById(1L)).thenReturn(Optional.of(event));

        SubmitScoreRequest req = new SubmitScoreRequest();
        req.setSubmissionId(10L);

        IllegalStateException ex = assertThrows(IllegalStateException.class, () ->
                judgingService.submitScore(req, 200L)
        );
        assertTrue(ex.getMessage().contains("Judging period has ended"));
    }

    @Test
    void testOverrideScore_SucceedsForOrganizerAfterJudgingEnd() {
        Long organizerId = 1L;
        Long submissionId = 10L;
        Long judgeId = 200L;
        doNothing().when(authorizationPolicy).requireEventRole(organizerId, 1L, RoleType.ORGANIZER);

        when(submissionRepository.findById(submissionId)).thenReturn(Optional.of(testSubmission));

        Score existingScore = new Score(1L, submissionId, judgeId, 3.5, "Original comment");
        existingScore.setId(99L);

        when(scoreRepository.findByJudgeIdAndSubmissionId(judgeId, submissionId)).thenReturn(Optional.of(existingScore));
        when(scoreRepository.save(any(Score.class))).thenAnswer(i -> i.getArgument(0));

        SubmitScoreRequest req = new SubmitScoreRequest();
        req.setSubmissionId(submissionId);
        req.setJudgeId(judgeId);
        req.setRawScore(4.8);
        req.setComment("Organizer override adjustment");

        ScoreResponse resp = judgingService.overrideScore(1L, req, organizerId);

        assertNotNull(resp);
        assertEquals(4.8, resp.getRawScore(), 0.01);
        assertEquals("Organizer override adjustment", resp.getComment());
        verify(auditLogService).logAction(eq(organizerId), eq(1L), eq("OVERRIDE_SCORE"), any());
    }

    @Test
    void testGetJudgeAssignment_OwnerSuccess() {
        JudgeAssignment asgn = new JudgeAssignment(1L, 200L, 10L, "ASSIGNED");
        asgn.setId(50L);

        when(assignmentRepository.findById(50L)).thenReturn(Optional.of(asgn));
        when(coiRepository.existsByJudgeIdAndSubmissionId(200L, 10L)).thenReturn(false);
        when(submissionRepository.findById(10L)).thenReturn(Optional.of(testSubmission));

        JudgeAssignmentResponse resp = judgingService.getJudgeAssignment(50L, 200L, 1L);
        assertNotNull(resp);
        assertEquals(50L, resp.getAssignmentId());
        assertEquals("Orbit", resp.getTitle());
    }

    @Test
    void testGetJudgeAssignment_PeerJudgeDeniedWith403() {
        JudgeAssignment asgn = new JudgeAssignment(1L, 200L, 10L, "ASSIGNED");
        asgn.setId(50L);

        when(assignmentRepository.findById(50L)).thenReturn(Optional.of(asgn));

        // Judge 201 (peer) requests Judge 200's assignment -> throws AccessDeniedException
        AccessDeniedException ex = assertThrows(AccessDeniedException.class, () ->
                judgingService.getJudgeAssignment(50L, 201L, 1L)
        );
        assertTrue(ex.getMessage().contains("You are not authorized to view this assignment"));
    }

    @Test
    void testGetJudgeAssignment_CrossEventDeniedWith403() {
        JudgeAssignment asgn = new JudgeAssignment(1L, 200L, 10L, "ASSIGNED");
        asgn.setId(50L);

        when(assignmentRepository.findById(50L)).thenReturn(Optional.of(asgn));

        // Requesting Event 2 for an Event 1 assignment -> throws AccessDeniedException
        AccessDeniedException ex = assertThrows(AccessDeniedException.class, () ->
                judgingService.getJudgeAssignment(50L, 200L, 2L)
        );
        assertTrue(ex.getMessage().contains("Assignment does not belong to event 2"));
    }

    @Test
    void testGetJudgeAssignment_UnauthenticatedDenied() {
        assertThrows(AccessDeniedException.class, () ->
                judgingService.getJudgeAssignment(50L, null, 1L)
        );
    }

    @Test
    void testAssignJudge_RejectDuplicates_ThrowsIllegalArgumentException() {
        doNothing().when(authorizationPolicy).requireEventRole(1L, 1L, RoleType.ORGANIZER);
        doNothing().when(authorizationPolicy).requireEventRole(200L, 1L, RoleType.JUDGE);
        when(submissionRepository.findById(10L)).thenReturn(Optional.of(testSubmission));
        when(coiRepository.existsByJudgeIdAndSubmissionId(200L, 10L)).thenReturn(false);

        JudgeAssignment existing = new JudgeAssignment(1L, 200L, 10L, "ASSIGNED");
        when(assignmentRepository.findByJudgeIdAndSubmissionId(200L, 10L)).thenReturn(Optional.of(existing));

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () ->
                judgingService.assignJudge(1L, 200L, 10L, 1L, true)
        );
        assertTrue(ex.getMessage().contains("already assigned"));
    }

    @Test
    void testRemoveAssignment_UncompletedSucceeds() {
        doNothing().when(authorizationPolicy).requireEventRole(1L, 1L, RoleType.ORGANIZER);
        JudgeAssignment asgn = new JudgeAssignment(1L, 200L, 10L, "ASSIGNED");
        asgn.setId(50L);
        when(assignmentRepository.findById(50L)).thenReturn(Optional.of(asgn));
        when(scoreRepository.findByJudgeIdAndSubmissionId(200L, 10L)).thenReturn(Optional.empty());

        judgingService.removeAssignment(1L, 50L, 1L);

        verify(assignmentRepository).delete(asgn);
        verify(auditLogService).logAction(eq(1L), eq(1L), eq("REMOVE_ASSIGNMENT"), anyString());
    }

    @Test
    void testRemoveAssignment_CompletedThrowsIllegalStateException() {
        doNothing().when(authorizationPolicy).requireEventRole(1L, 1L, RoleType.ORGANIZER);
        JudgeAssignment asgn = new JudgeAssignment(1L, 200L, 10L, "COMPLETED");
        asgn.setId(50L);
        when(assignmentRepository.findById(50L)).thenReturn(Optional.of(asgn));

        IllegalStateException ex = assertThrows(IllegalStateException.class, () ->
                judgingService.removeAssignment(1L, 50L, 1L)
        );
        assertTrue(ex.getMessage().contains("Cannot remove completed assignment"));
        verify(assignmentRepository, never()).delete(any());
    }
}
