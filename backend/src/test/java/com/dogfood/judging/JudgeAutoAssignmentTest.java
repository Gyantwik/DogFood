package com.dogfood.judging;

import com.dogfood.auth.EventRole;
import com.dogfood.auth.EventRoleRepository;
import com.dogfood.auth.RoleType;
import com.dogfood.auth.User;
import com.dogfood.auth.UserRepository;
import com.dogfood.common.audit.AuditLogService;
import com.dogfood.events.*;
import com.dogfood.security.EventAuthorizationPolicy;
import com.dogfood.teams.TeamMemberRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class JudgeAutoAssignmentTest {

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

    private final Long eventId = 1L;
    private final Long organizerId = 99L;

    @BeforeEach
    void setUp() {
        lenient().doNothing().when(authorizationPolicy).requireEventRole(anyLong(), anyLong(), any(RoleType.class));
    }

    @Test
    void testAutoAssignJudges_ReviewsPerProjectConfigurable() {
        // Setup 4 judges
        List<EventRole> judges = new ArrayList<>();
        for (long i = 1; i <= 4; i++) {
            User u = new User("judge" + i, "j" + i + "@dogfood.local", "pwd");
            u.setId(i);
            judges.add(new EventRole(u, eventId, RoleType.JUDGE));
        }
        when(eventRoleRepository.findByEventIdAndRole(eventId, RoleType.JUDGE)).thenReturn(judges);

        // 1 submission
        Submission sub1 = new Submission(eventId, 100L, 10L, "Project Alpha", "tag", "desc", "General", "repo", "demo", "tech", "SUBMITTED", false, null);
        sub1.setId(101L);
        when(submissionRepository.findByEventIdAndStatus(eventId, "SUBMITTED")).thenReturn(List.of(sub1));
        when(trackRepository.findByEventId(eventId)).thenReturn(Collections.emptyList());
        when(assignmentRepository.findByEventId(eventId)).thenReturn(Collections.emptyList());

        // No conflicts
        when(coiRepository.existsByJudgeIdAndSubmissionId(anyLong(), anyLong())).thenReturn(false);
        when(teamMemberRepository.existsByTeamIdAndUserId(anyLong(), anyLong())).thenReturn(false);
        when(assignmentRepository.existsByJudgeIdAndSubmissionId(anyLong(), anyLong())).thenReturn(false);

        // Request 3 reviews per project
        AutoAssignResult result = judgingService.autoAssignJudges(eventId, organizerId, 3);

        assertNotNull(result);
        assertEquals(3, result.getTotalAssignmentsCreated(), "Must create 3 assignments matching reviewsPerProject");
        assertEquals(1, result.getSubmissionsCovered());
        assertEquals(3, result.getJudgesUtilized());
        assertEquals(0, result.getUnassignedSubmissions());
        verify(assignmentRepository, times(3)).save(any(JudgeAssignment.class));
    }

    @Test
    void testAutoAssignJudges_WorkloadBalancing() {
        // Setup 2 judges
        User u1 = new User("j1", "j1@dogfood.local", "pwd");
        u1.setId(1L);
        User u2 = new User("j2", "j2@dogfood.local", "pwd");
        u2.setId(2L);
        when(eventRoleRepository.findByEventIdAndRole(eventId, RoleType.JUDGE)).thenReturn(List.of(
                new EventRole(u1, eventId, RoleType.JUDGE),
                new EventRole(u2, eventId, RoleType.JUDGE)
        ));

        // 2 submissions
        Submission sub1 = new Submission(eventId, 100L, 10L, "Project 1", "tag", "desc", "General", "repo", "demo", "tech", "SUBMITTED", false, null);
        sub1.setId(101L);
        Submission sub2 = new Submission(eventId, 200L, 20L, "Project 2", "tag", "desc", "General", "repo", "demo", "tech", "SUBMITTED", false, null);
        sub2.setId(201L);
        when(submissionRepository.findByEventIdAndStatus(eventId, "SUBMITTED")).thenReturn(List.of(sub1, sub2));
        when(trackRepository.findByEventId(eventId)).thenReturn(Collections.emptyList());
        when(assignmentRepository.findByEventId(eventId)).thenReturn(Collections.emptyList());

        when(coiRepository.existsByJudgeIdAndSubmissionId(anyLong(), anyLong())).thenReturn(false);
        when(teamMemberRepository.existsByTeamIdAndUserId(anyLong(), anyLong())).thenReturn(false);
        when(assignmentRepository.existsByJudgeIdAndSubmissionId(anyLong(), anyLong())).thenReturn(false);

        // Target: 1 review per project
        AutoAssignResult result = judgingService.autoAssignJudges(eventId, organizerId, 1);

        assertEquals(2, result.getTotalAssignmentsCreated());
        assertEquals(2, result.getJudgesUtilized(), "Both judges must be utilized (workload balanced 1 each)");
        verify(assignmentRepository).save(argThat(a -> a.getJudgeId().equals(1L) && a.getSubmissionId().equals(101L)));
        verify(assignmentRepository).save(argThat(a -> a.getJudgeId().equals(2L) && a.getSubmissionId().equals(201L)));
    }

    @Test
    void testAutoAssignJudges_COIAndTeamExclusion() {
        // Setup 3 judges: Judge 1 has declared COI, Judge 2 is on the team, Judge 3 is conflict-free
        User u1 = new User("j1", "j1@dogfood.local", "pwd");
        u1.setId(1L);
        User u2 = new User("j2", "j2@dogfood.local", "pwd");
        u2.setId(2L);
        User u3 = new User("j3", "j3@dogfood.local", "pwd");
        u3.setId(3L);
        when(eventRoleRepository.findByEventIdAndRole(eventId, RoleType.JUDGE)).thenReturn(List.of(
                new EventRole(u1, eventId, RoleType.JUDGE),
                new EventRole(u2, eventId, RoleType.JUDGE),
                new EventRole(u3, eventId, RoleType.JUDGE)
        ));

        Submission sub1 = new Submission(eventId, 500L, 10L, "Project 1", "tag", "desc", "General", "repo", "demo", "tech", "SUBMITTED", false, null);
        sub1.setId(101L);
        when(submissionRepository.findByEventIdAndStatus(eventId, "SUBMITTED")).thenReturn(List.of(sub1));
        when(trackRepository.findByEventId(eventId)).thenReturn(Collections.emptyList());
        when(assignmentRepository.findByEventId(eventId)).thenReturn(Collections.emptyList());

        // Judge 1: Declared COI
        when(coiRepository.existsByJudgeIdAndSubmissionId(1L, 101L)).thenReturn(true);
        // Judge 2: Team Member
        when(coiRepository.existsByJudgeIdAndSubmissionId(2L, 101L)).thenReturn(false);
        when(teamMemberRepository.existsByTeamIdAndUserId(500L, 2L)).thenReturn(true);
        // Judge 3: Clear
        when(coiRepository.existsByJudgeIdAndSubmissionId(3L, 101L)).thenReturn(false);
        when(teamMemberRepository.existsByTeamIdAndUserId(500L, 3L)).thenReturn(false);
        when(assignmentRepository.existsByJudgeIdAndSubmissionId(3L, 101L)).thenReturn(false);

        AutoAssignResult result = judgingService.autoAssignJudges(eventId, organizerId, 1);

        assertEquals(1, result.getTotalAssignmentsCreated());
        assertEquals(1, result.getJudgesUtilized());
        // Verify ONLY Judge 3 was assigned
        verify(assignmentRepository).save(argThat(a -> a.getJudgeId().equals(3L) && a.getSubmissionId().equals(101L)));
        verify(assignmentRepository, never()).save(argThat(a -> a.getJudgeId().equals(1L)));
        verify(assignmentRepository, never()).save(argThat(a -> a.getJudgeId().equals(2L)));
    }
}
