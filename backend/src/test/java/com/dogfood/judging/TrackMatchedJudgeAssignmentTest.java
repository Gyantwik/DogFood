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
public class TrackMatchedJudgeAssignmentTest {

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

    private Long eventId = 1L;
    private Long organizerId = 99L;

    @BeforeEach
    void setUp() {
        lenient().doNothing().when(authorizationPolicy).requireEventRole(anyLong(), anyLong(), any(RoleType.class));
    }

    @Test
    void testTrackMatchedAssignment_MatchesJudgesOnSameTrack() {
        // Setup Tracks: Track 1 ("Developer tools"), Track 2 ("Security")
        Track track1 = new Track(eventId, "Developer tools", "Dev tools");
        track1.setId(10L);
        Track track2 = new Track(eventId, "Security", "Security");
        track2.setId(20L);
        when(trackRepository.findByEventId(eventId)).thenReturn(List.of(track1, track2));

        // Submissions: Sub 1 in Track 1, Sub 2 in Track 2
        Submission sub1 = new Submission(eventId, 100L, 1L, "DevProject", "tag", "desc", "Developer tools", "repo", "demo", "tech", "SUBMITTED", false, null);
        sub1.setId(101L);

        Submission sub2 = new Submission(eventId, 200L, 2L, "SecProject", "tag", "desc", "Security", "repo", "demo", "tech", "SUBMITTED", false, null);
        sub2.setId(201L);

        when(submissionRepository.findByEventIdAndStatus(eventId, "SUBMITTED")).thenReturn(List.of(sub1, sub2));

        // Judges: Judge 1 (User 1), Judge 2 (User 2)
        User u1 = new User("judge1", "j1@example.org", "pwd");
        u1.setId(1L);
        User u2 = new User("judge2", "j2@example.org", "pwd");
        u2.setId(2L);

        EventRole r1 = new EventRole(u1, eventId, RoleType.JUDGE);
        EventRole r2 = new EventRole(u2, eventId, RoleType.JUDGE);
        when(eventRoleRepository.findByEventIdAndRole(eventId, RoleType.JUDGE)).thenReturn(List.of(r1, r2));

        // Judge 1 is in Track 1; Judge 2 is in Track 2
        JudgeTrack jt1 = new JudgeTrack(eventId, 1L, 10L);
        JudgeTrack jt2 = new JudgeTrack(eventId, 2L, 20L);
        when(judgeTrackRepository.findByEventIdAndTrackId(eventId, 10L)).thenReturn(List.of(jt1));
        when(judgeTrackRepository.findByEventIdAndTrackId(eventId, 20L)).thenReturn(List.of(jt2));

        // No COI
        when(coiRepository.existsByJudgeIdAndSubmissionId(anyLong(), anyLong())).thenReturn(false);
        when(teamMemberRepository.existsByTeamIdAndUserId(anyLong(), anyLong())).thenReturn(false);
        when(assignmentRepository.existsByJudgeIdAndSubmissionId(anyLong(), anyLong())).thenReturn(false);

        int assignedCount = judgingService.autoAssignJudges(eventId, organizerId);

        // Expect 2 assignments: (Judge 1 -> Sub 1), (Judge 2 -> Sub 2)
        assertEquals(2, assignedCount);
        verify(assignmentRepository).save(argThat(asgn -> asgn.getJudgeId().equals(1L) && asgn.getSubmissionId().equals(101L)));
        verify(assignmentRepository).save(argThat(asgn -> asgn.getJudgeId().equals(2L) && asgn.getSubmissionId().equals(201L)));

        // Ensure non-matching assignments were NOT created
        verify(assignmentRepository, never()).save(argThat(asgn -> asgn.getJudgeId().equals(1L) && asgn.getSubmissionId().equals(201L)));
        verify(assignmentRepository, never()).save(argThat(asgn -> asgn.getJudgeId().equals(2L) && asgn.getSubmissionId().equals(101L)));
    }

    @Test
    void testConflictOfInterestExclusion_DeclaredAndTeamMembership() {
        Track track1 = new Track(eventId, "Developer tools", "Dev tools");
        track1.setId(10L);
        when(trackRepository.findByEventId(eventId)).thenReturn(List.of(track1));

        Submission sub1 = new Submission(eventId, 100L, 1L, "DevProject", "tag", "desc", "Developer tools", "repo", "demo", "tech", "SUBMITTED", false, null);
        sub1.setId(101L);
        when(submissionRepository.findByEventIdAndStatus(eventId, "SUBMITTED")).thenReturn(List.of(sub1));

        User j1 = new User("judge1", "j1@example.org", "pwd"); j1.setId(1L); // Has declared COI
        User j2 = new User("judge2", "j2@example.org", "pwd"); j2.setId(2L); // Is member of team 100L
        User j3 = new User("judge3", "j3@example.org", "pwd"); j3.setId(3L); // Clean judge

        EventRole r1 = new EventRole(j1, eventId, RoleType.JUDGE);
        EventRole r2 = new EventRole(j2, eventId, RoleType.JUDGE);
        EventRole r3 = new EventRole(j3, eventId, RoleType.JUDGE);
        when(eventRoleRepository.findByEventIdAndRole(eventId, RoleType.JUDGE)).thenReturn(List.of(r1, r2, r3));

        JudgeTrack jt1 = new JudgeTrack(eventId, 1L, 10L);
        JudgeTrack jt2 = new JudgeTrack(eventId, 2L, 10L);
        JudgeTrack jt3 = new JudgeTrack(eventId, 3L, 10L);
        when(judgeTrackRepository.findByEventIdAndTrackId(eventId, 10L)).thenReturn(List.of(jt1, jt2, jt3));

        // Judge 1: Declared COI on sub 101L
        when(coiRepository.existsByJudgeIdAndSubmissionId(1L, 101L)).thenReturn(true);
        when(coiRepository.existsByJudgeIdAndSubmissionId(2L, 101L)).thenReturn(false);
        when(coiRepository.existsByJudgeIdAndSubmissionId(3L, 101L)).thenReturn(false);

        // Judge 2: Member of team 100L
        when(teamMemberRepository.existsByTeamIdAndUserId(100L, 2L)).thenReturn(true);
        when(teamMemberRepository.existsByTeamIdAndUserId(100L, 3L)).thenReturn(false);

        when(assignmentRepository.existsByJudgeIdAndSubmissionId(3L, 101L)).thenReturn(false);

        int assignedCount = judgingService.autoAssignJudges(eventId, organizerId);

        // Only Judge 3 should be assigned
        assertEquals(1, assignedCount);
        verify(assignmentRepository).save(argThat(asgn -> asgn.getJudgeId().equals(3L) && asgn.getSubmissionId().equals(101L)));
        verify(assignmentRepository, never()).save(argThat(asgn -> asgn.getJudgeId().equals(1L)));
        verify(assignmentRepository, never()).save(argThat(asgn -> asgn.getJudgeId().equals(2L)));
    }

    @Test
    void testManualOverride_AllowsAssignmentAcrossTracks_BlocksCOI() {
        Submission sub1 = new Submission(eventId, 100L, 1L, "DevProject", "tag", "desc", "Developer tools", "repo", "demo", "tech", "SUBMITTED", false, null);
        sub1.setId(101L);
        when(submissionRepository.findById(101L)).thenReturn(Optional.of(sub1));

        // Judge 2 (Security track) manually assigned to Sub 1 (Developer tools) without COI
        when(coiRepository.existsByJudgeIdAndSubmissionId(2L, 101L)).thenReturn(false);
        when(teamMemberRepository.existsByTeamIdAndUserId(100L, 2L)).thenReturn(false);
        when(assignmentRepository.findByJudgeIdAndSubmissionId(2L, 101L)).thenReturn(Optional.empty());
        when(assignmentRepository.save(any(JudgeAssignment.class))).thenAnswer(i -> i.getArgument(0));

        JudgeAssignment result = judgingService.assignJudge(eventId, 2L, 101L, organizerId);
        assertNotNull(result);
        assertEquals(2L, result.getJudgeId());
        assertEquals(101L, result.getSubmissionId());

        // Attempt manual assignment when COI exists -> Must throw IllegalArgumentException
        when(coiRepository.existsByJudgeIdAndSubmissionId(1L, 101L)).thenReturn(true);
        assertThrows(IllegalArgumentException.class, () -> judgingService.assignJudge(eventId, 1L, 101L, organizerId));

        // Attempt manual assignment when Team Member -> Must throw IllegalArgumentException
        when(coiRepository.existsByJudgeIdAndSubmissionId(3L, 101L)).thenReturn(false);
        when(teamMemberRepository.existsByTeamIdAndUserId(100L, 3L)).thenReturn(true);
        assertThrows(IllegalArgumentException.class, () -> judgingService.assignJudge(eventId, 3L, 101L, organizerId));
    }

    @Test
    void testIdempotency_RepeatAutoAssignDoesNotDuplicate() {
        Track track1 = new Track(eventId, "Developer tools", "Dev tools");
        track1.setId(10L);
        when(trackRepository.findByEventId(eventId)).thenReturn(List.of(track1));

        Submission sub1 = new Submission(eventId, 100L, 1L, "DevProject", "tag", "desc", "Developer tools", "repo", "demo", "tech", "SUBMITTED", false, null);
        sub1.setId(101L);
        when(submissionRepository.findByEventIdAndStatus(eventId, "SUBMITTED")).thenReturn(List.of(sub1));

        User j1 = new User("judge1", "j1@example.org", "pwd"); j1.setId(1L);
        EventRole r1 = new EventRole(j1, eventId, RoleType.JUDGE);
        when(eventRoleRepository.findByEventIdAndRole(eventId, RoleType.JUDGE)).thenReturn(List.of(r1));

        JudgeTrack jt1 = new JudgeTrack(eventId, 1L, 10L);
        when(judgeTrackRepository.findByEventIdAndTrackId(eventId, 10L)).thenReturn(List.of(jt1));

        when(coiRepository.existsByJudgeIdAndSubmissionId(1L, 101L)).thenReturn(false);
        when(teamMemberRepository.existsByTeamIdAndUserId(100L, 1L)).thenReturn(false);

        // Already assigned in previous run
        when(assignmentRepository.existsByJudgeIdAndSubmissionId(1L, 101L)).thenReturn(true);

        int assignedCount = judgingService.autoAssignJudges(eventId, organizerId);
        assertEquals(0, assignedCount);
        verify(assignmentRepository, never()).save(any(JudgeAssignment.class));
    }
}
