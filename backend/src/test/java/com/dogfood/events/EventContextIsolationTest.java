package com.dogfood.events;

import com.dogfood.auth.EventRole;
import com.dogfood.auth.EventRoleRepository;
import com.dogfood.auth.RoleType;
import com.dogfood.auth.User;
import com.dogfood.auth.UserRepository;
import com.dogfood.common.audit.AuditLogService;
import com.dogfood.judging.*;
import com.dogfood.security.EventAuthorizationPolicy;
import com.dogfood.submissions.SubmissionService;
import com.dogfood.teams.TeamMemberRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
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
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class EventContextIsolationTest {

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

    @InjectMocks
    private JudgingService judgingService;

    private final Long EVENT_A = 100L;
    private final Long EVENT_B = 200L;
    private final Long JUDGE_ID = 50L;

    private Submission subA1;
    private Submission subB1;
    private JudgeAssignment asgnA1;
    private JudgeAssignment asgnB1;

    @BeforeEach
    void setUp() {
        subA1 = new Submission();
        subA1.setId(10L);
        subA1.setEventId(EVENT_A);
        subA1.setTitle("Project A1");
        subA1.setStatus("SUBMITTED");

        subB1 = new Submission();
        subB1.setId(20L);
        subB1.setEventId(EVENT_B);
        subB1.setTitle("Project B1");
        subB1.setStatus("SUBMITTED");

        asgnA1 = new JudgeAssignment(EVENT_A, JUDGE_ID, 10L, "ASSIGNED");
        asgnA1.setId(101L);

        asgnB1 = new JudgeAssignment(EVENT_B, JUDGE_ID, 20L, "ASSIGNED");
        asgnB1.setId(201L);
    }

    @Test
    @DisplayName("Event A judge queue never returns Event B assignments")
    void test1_EventAJudgeQueueNeverReturnsEventBAssignments() {
        when(assignmentRepository.findActiveAssignmentsForJudgeAndEvent(JUDGE_ID, EVENT_A))
                .thenReturn(List.of(asgnA1));
        when(submissionRepository.findById(10L)).thenReturn(Optional.of(subA1));

        List<JudgeAssignmentResponse> queueA = judgingService.getJudgeAssignments(JUDGE_ID, EVENT_A);
        assertEquals(1, queueA.size());
        assertEquals(10L, queueA.get(0).getSubmissionId());
        assertEquals(EVENT_A, queueA.get(0).getEventId());

        verify(assignmentRepository).findActiveAssignmentsForJudgeAndEvent(JUDGE_ID, EVENT_A);
        verify(assignmentRepository, never()).findActiveAssignmentsForJudgeAndEvent(JUDGE_ID, EVENT_B);
    }

    @Test
    @DisplayName("Event B judge queue never returns Event A assignments")
    void test2_EventBJudgeQueueNeverReturnsEventAAssignments() {
        when(assignmentRepository.findActiveAssignmentsForJudgeAndEvent(JUDGE_ID, EVENT_B))
                .thenReturn(List.of(asgnB1));
        when(submissionRepository.findById(20L)).thenReturn(Optional.of(subB1));

        List<JudgeAssignmentResponse> queueB = judgingService.getJudgeAssignments(JUDGE_ID, EVENT_B);
        assertEquals(1, queueB.size());
        assertEquals(20L, queueB.get(0).getSubmissionId());
        assertEquals(EVENT_B, queueB.get(0).getEventId());

        verify(assignmentRepository).findActiveAssignmentsForJudgeAndEvent(JUDGE_ID, EVENT_B);
    }

    @Test
    @DisplayName("Single assignment for Event A cannot be opened under Event B context")
    void test3_SingleAssignmentCrossEventAccessThrowsException() {
        when(assignmentRepository.findById(101L)).thenReturn(Optional.of(asgnA1));

        // When requesting Event A assignment with Event B context, must be rejected
        assertThrows(AccessDeniedException.class, () ->
                judgingService.getJudgeAssignment(101L, JUDGE_ID, EVENT_B)
        );
    }

    @Test
    @DisplayName("Single assignment for Event A succeeds with Event A context")
    void test4_SingleAssignmentMatchesEventContext() {
        when(assignmentRepository.findById(101L)).thenReturn(Optional.of(asgnA1));
        when(submissionRepository.findById(10L)).thenReturn(Optional.of(subA1));

        JudgeAssignmentResponse resp = judgingService.getJudgeAssignment(101L, JUDGE_ID, EVENT_A);
        assertNotNull(resp);
        assertEquals(10L, resp.getSubmissionId());
        assertEquals(EVENT_A, resp.getEventId());
    }

    @Test
    @DisplayName("Score submission with wrong eventId is rejected")
    void test5_ScoreSubmissionWithWrongEventIdThrowsException() {
        when(submissionRepository.findById(10L)).thenReturn(Optional.of(subA1));

        SubmitScoreRequest req = new SubmitScoreRequest();
        req.setSubmissionId(10L);
        req.setEventId(EVENT_B); // Mismatched event context

        assertThrows(AccessDeniedException.class, () ->
                judgingService.submitScore(req, JUDGE_ID)
        );
    }

    @Test
    @DisplayName("Score submission with unknown or cross-event rubric criteria is rejected")
    void test6_ScoreSubmissionWithCrossEventCriteriaThrowsException() {
        when(submissionRepository.findById(10L)).thenReturn(Optional.of(subA1));
        when(assignmentRepository.findByJudgeIdAndSubmissionId(JUDGE_ID, 10L)).thenReturn(Optional.of(asgnA1));

        Rubric rubricA = new Rubric(EVENT_A, false);
        rubricA.setId(1L);
        when(rubricRepository.findByEventId(EVENT_A)).thenReturn(Optional.of(rubricA));

        RubricCriterion cA1 = new RubricCriterion(rubricA, "Functionality", "functionality", 50.0, 1.0, 5.0);
        cA1.setId(11L);
        RubricCriterion cA2 = new RubricCriterion(rubricA, "Design", "design", 50.0, 1.0, 5.0);
        cA2.setId(12L);
        when(criterionRepository.findByRubricId(1L)).thenReturn(List.of(cA1, cA2));

        // Attempt to submit criteria from Event B (e.g., "b_innovation")
        SubmitScoreRequest req = new SubmitScoreRequest();
        req.setSubmissionId(10L);
        req.setCriteria(Map.of("b_innovation", 4.0));

        assertThrows(IllegalArgumentException.class, () ->
                judgingService.submitScore(req, JUDGE_ID)
        );
    }

    @Test
    @DisplayName("Score submission missing a required criterion is rejected without silent defaulting")
    void test7_ScoreSubmissionMissingRequiredCriterionThrowsException() {
        when(submissionRepository.findById(10L)).thenReturn(Optional.of(subA1));
        when(assignmentRepository.findByJudgeIdAndSubmissionId(JUDGE_ID, 10L)).thenReturn(Optional.of(asgnA1));

        Rubric rubricA = new Rubric(EVENT_A, false);
        rubricA.setId(1L);
        when(rubricRepository.findByEventId(EVENT_A)).thenReturn(Optional.of(rubricA));

        RubricCriterion cA1 = new RubricCriterion(rubricA, "Functionality", "functionality", 50.0, 1.0, 5.0);
        cA1.setId(11L);
        RubricCriterion cA2 = new RubricCriterion(rubricA, "Design", "design", 50.0, 1.0, 5.0);
        cA2.setId(12L);
        when(criterionRepository.findByRubricId(1L)).thenReturn(List.of(cA1, cA2));

        // Submit only "functionality", omit "design"
        SubmitScoreRequest req = new SubmitScoreRequest();
        req.setSubmissionId(10L);
        req.setCriteria(Map.of("functionality", 4.0));

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () ->
                judgingService.submitScore(req, JUDGE_ID)
        );
        assertTrue(ex.getMessage().contains("Missing required rubric criterion score"));
    }

    @Test
    @DisplayName("COI declaration under mismatched event is rejected")
    void test8_CoiDeclarationMismatchedEventThrowsException() {
        when(submissionRepository.findById(10L)).thenReturn(Optional.of(subA1));

        CoiRequest coiReq = new CoiRequest(10L, CoiReason.SAME_TEAM, "Notes");
        coiReq.setEventId(EVENT_B);

        assertThrows(AccessDeniedException.class, () ->
                judgingService.declareCoi(coiReq, JUDGE_ID)
        );
    }
}
