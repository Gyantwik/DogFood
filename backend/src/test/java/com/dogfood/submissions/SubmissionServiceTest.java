package com.dogfood.submissions;

import com.dogfood.auth.EventRoleRepository;
import com.dogfood.auth.RoleType;
import com.dogfood.common.audit.AuditLogService;
import com.dogfood.events.Event;
import com.dogfood.events.EventRepository;
import com.dogfood.events.Submission;
import com.dogfood.events.SubmissionRepository;
import com.dogfood.teams.TeamMemberRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class SubmissionServiceTest {

    @Mock private SubmissionRepository submissionRepository;
    @Mock private EventRepository eventRepository;
    @Mock private TeamMemberRepository teamMemberRepository;
    @Mock private com.dogfood.teams.TeamRepository teamRepository;
    @Mock private EventRoleRepository eventRoleRepository;
    @Mock private com.dogfood.auth.UserRepository userRepository;
    @Mock private com.dogfood.security.EventAuthorizationPolicy authorizationPolicy;
    @Mock private AuditLogService auditLogService;
    @Mock private ObjectMapper objectMapper;

    @InjectMocks private SubmissionService submissionService;

    private Event activeEvent;
    private Event expiredEvent;

    @BeforeEach
    void setUp() {
        activeEvent = new Event("Active Hackathon", "Active event description", Instant.now().plus(2, ChronoUnit.DAYS));
        activeEvent.setId(1L);

        expiredEvent = new Event("Past Hackathon", "Past event description", Instant.now().minus(2, ChronoUnit.DAYS));
        expiredEvent.setId(2L);
    }

    @Test
    void testCreateSubmissionDraftSuccess() {
        when(eventRepository.findById(1L)).thenReturn(Optional.of(activeEvent));
        when(submissionRepository.existsByEventIdAndRepoUrl(1L, "https://github.com/orbit/engine")).thenReturn(false);
        when(submissionRepository.save(any(Submission.class))).thenAnswer(i -> {
            Submission s = i.getArgument(0);
            s.setId(10L);
            return s;
        });

        CreateSubmissionRequest req = new CreateSubmissionRequest(
                "Orbit", "Tagline", "Description text", "Infra",
                "https://github.com/orbit/engine", "https://orbit.dev",
                List.of("Rust", "Postgres"), null, "DRAFT"
        );

        SubmissionResponse resp = submissionService.createSubmission(1L, req, 100L);

        assertNotNull(resp);
        assertEquals("Orbit", resp.getTitle());
        assertEquals("DRAFT", resp.getStatus());
        assertFalse(resp.isDuplicateFlag());
        verify(submissionRepository).save(any(Submission.class));
        verify(auditLogService).logAction(eq(100L), eq(1L), eq("CREATE_SUBMISSION"), any());
    }

    @Test
    void testCreateSubmissionRejectsAfterDeadline() {
        when(eventRepository.findById(2L)).thenReturn(Optional.of(expiredEvent));

        CreateSubmissionRequest req = new CreateSubmissionRequest("Late Project", "Tag", "Desc", "Web", null, null, null, null, "SUBMITTED");

        IllegalStateException ex = assertThrows(IllegalStateException.class, () ->
                submissionService.createSubmission(2L, req, 100L)
        );
        assertTrue(ex.getMessage().contains("deadline has passed"));
        verify(submissionRepository, never()).save(any());
    }

    @Test
    void testCreateSubmissionRejectsBeforeSubmissionStart() {
        Event earlyEvent = new Event("Future Submissions", "Desc", Instant.now().plus(10, ChronoUnit.DAYS));
        earlyEvent.setId(3L);
        earlyEvent.setSubmissionStart(Instant.now().plus(2, ChronoUnit.DAYS)); // Submissions open in 2 days

        when(eventRepository.findById(3L)).thenReturn(Optional.of(earlyEvent));

        CreateSubmissionRequest req = new CreateSubmissionRequest("Early Project", "Tag", "Desc", "Web", null, null, null, null, "SUBMITTED");

        IllegalStateException ex = assertThrows(IllegalStateException.class, () ->
                submissionService.createSubmission(3L, req, 100L)
        );
        assertTrue(ex.getMessage().contains("Submission period has not opened yet"));
        verify(submissionRepository, never()).save(any());
    }

    @Test
    void testDuplicateRepoUrlIsFlaggedNotBlocked() {
        when(eventRepository.findById(1L)).thenReturn(Optional.of(activeEvent));
        // Repo already exists in event:
        when(submissionRepository.existsByEventIdAndRepoUrl(1L, "https://github.com/duplicate/repo")).thenReturn(true);
        when(submissionRepository.save(any(Submission.class))).thenAnswer(i -> {
            Submission s = i.getArgument(0);
            s.setId(11L);
            return s;
        });

        CreateSubmissionRequest req = new CreateSubmissionRequest(
                "Copycat Project", "Tag", "Desc", "Web",
                "https://github.com/duplicate/repo", null, null, null, "SUBMITTED"
        );

        // Does NOT throw; saves successfully with duplicateFlag = true
        SubmissionResponse resp = submissionService.createSubmission(1L, req, 100L);

        assertNotNull(resp);
        assertTrue(resp.isDuplicateFlag());
        verify(submissionRepository).save(any(Submission.class));
    }

    @Test
    void testUpdateSubmissionOwnershipEnforcement() {
        Submission existing = new Submission(
                1L, null, 100L, "Original Title", "Tag", "Desc", "Infra",
                "https://github.com/original", null, "[]", "DRAFT", false, null
        );
        existing.setId(10L);

        when(submissionRepository.findById(10L)).thenReturn(Optional.of(existing));
        when(eventRepository.findById(1L)).thenReturn(Optional.of(activeEvent));

        UpdateSubmissionRequest req = new UpdateSubmissionRequest("Hacked Title", null, null, null, null, null, null, null);

        // Another user (200L) attempts to edit
        assertThrows(AccessDeniedException.class, () ->
                submissionService.updateSubmission(10L, req, 200L)
        );
        verify(submissionRepository, never()).save(any());
    }

    @Test
    void testUpdateSubmissionRejectsAfterDeadline() {
        Submission existing = new Submission(
                2L, null, 100L, "Title", "Tag", "Desc", "Infra",
                "https://github.com/repo", null, "[]", "DRAFT", false, null
        );
        existing.setId(10L);

        when(submissionRepository.findById(10L)).thenReturn(Optional.of(existing));
        when(eventRepository.findById(2L)).thenReturn(Optional.of(expiredEvent));

        UpdateSubmissionRequest req = new UpdateSubmissionRequest("Updated Title", null, null, null, null, null, null, null);

        assertThrows(IllegalStateException.class, () ->
                submissionService.updateSubmission(10L, req, 100L)
        );
        verify(submissionRepository, never()).save(any());
    }

    @Test
    void testSearchGalleryFilter() {
        Submission s1 = new Submission(1L, null, 100L, "Orbit", "Tag", "Desc", "Infra", null, null, "[]", "SUBMITTED", false, null);
        s1.setId(10L);

        when(submissionRepository.searchGallery(1L, "SUBMITTED", "Infra", "Orbit")).thenReturn(List.of(s1));

        List<SubmissionResponse> results = submissionService.getGallery(1L, "Infra", "Orbit", "top");

        assertEquals(1, results.size());
        assertEquals("Orbit", results.get(0).getTitle());
    }

    @Test
    void testGetMySubmissionSuccess() {
        Submission s = new Submission(1L, null, 100L, "Saved Draft", "Tag", "Desc", "AI", null, null, "[]", "DRAFT", false, null);
        s.setId(15L);

        when(submissionRepository.findFirstByEventIdAndCreatedByOrderByUpdatedAtDesc(1L, 100L)).thenReturn(Optional.of(s));

        SubmissionResponse resp = submissionService.getMySubmission(1L, 100L);

        assertNotNull(resp);
        assertEquals(15L, resp.getId());
        assertEquals("Saved Draft", resp.getTitle());
        assertEquals("DRAFT", resp.getStatus());
    }

    @Test
    void testGetMySubmissionReturnsNullWhenNone() {
        when(submissionRepository.findFirstByEventIdAndCreatedByOrderByUpdatedAtDesc(1L, 100L)).thenReturn(Optional.empty());

        SubmissionResponse resp = submissionService.getMySubmission(1L, 100L);

        assertNull(resp);
    }

    @Test
    void testCreateSubmission_FailsWhenTeamBelongsToDifferentEvent() {
        CreateSubmissionRequest req = new CreateSubmissionRequest("Title", "Tag", "Desc", "Track", "https://github.com/app", "https://demo.app", List.of("Java"), 50L, "SUBMITTED");
        req.setTeamId(50L);

        when(eventRepository.findById(2L)).thenReturn(Optional.of(activeEvent)); // Event 2
        com.dogfood.teams.Team event1Team = new com.dogfood.teams.Team(1L, "Event 1 Team", "INV123", 100L);
        event1Team.setId(50L);
        when(teamRepository.findById(50L)).thenReturn(Optional.of(event1Team));

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () ->
                submissionService.createSubmission(2L, req, 100L)
        );
        assertTrue(ex.getMessage().contains("Team does not belong to the specified event"));
    }

    @Test
    void testUpdateSubmission_FailsWhenRevertingSubmittedToDraft() {
        Submission submittedSub = new Submission(1L, null, 100L, "Submitted App", "Tag", "Desc", "AI", null, null, "[]", "SUBMITTED", false, null);
        submittedSub.setId(10L);

        when(submissionRepository.findById(10L)).thenReturn(Optional.of(submittedSub));
        when(eventRepository.findById(1L)).thenReturn(Optional.of(activeEvent));
        when(authorizationPolicy.hasEventRole(100L, 1L, RoleType.ORGANIZER)).thenReturn(false);

        UpdateSubmissionRequest req = new UpdateSubmissionRequest();
        req.setStatus("DRAFT");

        IllegalStateException ex = assertThrows(IllegalStateException.class, () ->
                submissionService.updateSubmission(10L, req, 100L)
        );
        assertTrue(ex.getMessage().contains("SUBMISSION_STATE_LOCKED"));
    }

    @Test
    void testGetSubmission_DraftDeniedForAnonymous() {
        Submission draftSub = new Submission(1L, null, 100L, "Draft App", "Tag", "Desc", "AI", null, null, "[]", "DRAFT", false, null);
        draftSub.setId(10L);

        when(submissionRepository.findById(10L)).thenReturn(Optional.of(draftSub));

        assertThrows(AccessDeniedException.class, () ->
                submissionService.getSubmission(10L, null, 1L)
        );
    }

    @Test
    void testGetSubmission_DraftDeniedForOtherUser() {
        Submission draftSub = new Submission(1L, null, 100L, "Draft App", "Tag", "Desc", "AI", null, null, "[]", "DRAFT", false, null);
        draftSub.setId(10L);

        when(submissionRepository.findById(10L)).thenReturn(Optional.of(draftSub));
        when(authorizationPolicy.hasEventRole(999L, 1L, RoleType.ORGANIZER)).thenReturn(false);

        assertThrows(AccessDeniedException.class, () ->
                submissionService.getSubmission(10L, 999L, 1L)
        );
    }

    @Test
    void testGetSubmission_DraftAllowedForOwner() {
        Submission draftSub = new Submission(1L, null, 100L, "Draft App", "Tag", "Desc", "AI", null, null, "[]", "DRAFT", false, null);
        draftSub.setId(10L);

        when(submissionRepository.findById(10L)).thenReturn(Optional.of(draftSub));

        SubmissionResponse resp = submissionService.getSubmission(10L, 100L, 1L);
        assertNotNull(resp);
        assertEquals("Draft App", resp.getTitle());
    }

    @Test
    void testUpdateSubmission_AllowsDraftToSubmitted() {
        Submission draftSub = new Submission(1L, null, 100L, "Draft App", "Tag", "Desc", "AI", null, null, "[]", "DRAFT", false, null);
        draftSub.setId(10L);

        when(submissionRepository.findById(10L)).thenReturn(Optional.of(draftSub));
        when(eventRepository.findById(1L)).thenReturn(Optional.of(activeEvent));
        when(submissionRepository.save(any(Submission.class))).thenAnswer(i -> i.getArgument(0));

        UpdateSubmissionRequest req = new UpdateSubmissionRequest();
        req.setStatus("SUBMITTED");

        SubmissionResponse resp = submissionService.updateSubmission(10L, req, 100L);
        assertNotNull(resp);
        assertEquals("SUBMITTED", resp.getStatus());
    }

    @Test
    void testUpdateSubmission_AllowsSubmittedToSubmitted() {
        Submission sub = new Submission(1L, null, 100L, "Final App", "Tag", "Desc", "AI", null, null, "[]", "SUBMITTED", false, null);
        sub.setId(10L);

        when(submissionRepository.findById(10L)).thenReturn(Optional.of(sub));
        when(eventRepository.findById(1L)).thenReturn(Optional.of(activeEvent));
        when(submissionRepository.save(any(Submission.class))).thenAnswer(i -> i.getArgument(0));

        UpdateSubmissionRequest req = new UpdateSubmissionRequest();
        req.setStatus("SUBMITTED");
        req.setTagline("Updated Tagline");

        SubmissionResponse resp = submissionService.updateSubmission(10L, req, 100L);
        assertNotNull(resp);
        assertEquals("SUBMITTED", resp.getStatus());
        assertEquals("Updated Tagline", resp.getTagline());
    }

    @Test
    void testUpdateSubmission_RejectsArbitraryStatusFromParticipant() {
        Submission draftSub = new Submission(1L, null, 100L, "Draft App", "Tag", "Desc", "AI", null, null, "[]", "DRAFT", false, null);
        draftSub.setId(10L);

        when(submissionRepository.findById(10L)).thenReturn(Optional.of(draftSub));
        when(eventRepository.findById(1L)).thenReturn(Optional.of(activeEvent));

        UpdateSubmissionRequest req = new UpdateSubmissionRequest();
        req.setStatus("APPROVED");

        assertThrows(IllegalStateException.class, () ->
                submissionService.updateSubmission(10L, req, 100L)
        );
    }

    @Test
    void testUpdateSubmission_RejectsModificationWhenLocked() {
        Submission lockedSub = new Submission(1L, null, 100L, "Locked App", "Tag", "Desc", "AI", null, null, "[]", "LOCKED", false, null);
        lockedSub.setId(10L);

        when(submissionRepository.findById(10L)).thenReturn(Optional.of(lockedSub));
        when(eventRepository.findById(1L)).thenReturn(Optional.of(activeEvent));

        UpdateSubmissionRequest req = new UpdateSubmissionRequest();
        req.setTagline("Attempted Change");

        IllegalStateException ex = assertThrows(IllegalStateException.class, () ->
                submissionService.updateSubmission(10L, req, 100L)
        );
        assertTrue(ex.getMessage().contains("SUBMISSION_STATE_LOCKED"));
    }

    @Test
    void testCreateSubmission_EstablishesValidServerSideStateForArbitraryInput() {
        when(eventRepository.findById(1L)).thenReturn(Optional.of(activeEvent));
        when(submissionRepository.existsByEventIdAndRepoUrl(1L, "https://github.com/test/repo")).thenReturn(false);
        when(submissionRepository.save(any(Submission.class))).thenAnswer(i -> {
            Submission s = i.getArgument(0);
            s.setId(10L);
            return s;
        });

        // Request with arbitrary status string from participant client
        CreateSubmissionRequest req = new CreateSubmissionRequest(
                "App", "Tag", "Desc", "Track",
                "https://github.com/test/repo", "https://demo.app",
                List.of("Rust"), null, "ARBITRARY_STATUS"
        );

        SubmissionResponse resp = submissionService.createSubmission(1L, req, 100L);
        assertNotNull(resp);
        // Arbitrary status is normalized to SUBMITTED
        assertEquals("SUBMITTED", resp.getStatus());
    }

    @Test
    void testCreateSubmission_DeniesNonLeaderTeamMember() {
        when(eventRepository.findById(1L)).thenReturn(Optional.of(activeEvent));
        com.dogfood.teams.Team team = new com.dogfood.teams.Team(1L, "Alpha Team", "INV123", 100L); // Leader is 100L
        team.setId(55L);
        when(teamRepository.findById(55L)).thenReturn(Optional.of(team));
        when(teamMemberRepository.existsByTeamIdAndUserId(55L, 101L)).thenReturn(true); // User 101 is member, not leader

        CreateSubmissionRequest req = new CreateSubmissionRequest("Alpha Project", "Tag", "Desc", "AI", null, null, null, 55L, "DRAFT");

        AccessDeniedException ex = assertThrows(AccessDeniedException.class, () ->
                submissionService.createSubmission(1L, req, 101L)
        );
        assertTrue(ex.getMessage().contains("Only the team leader can submit or create a project"));
        verify(submissionRepository, never()).save(any());
    }

    @Test
    void testCreateSubmission_AllowsTeamLeader() {
        when(eventRepository.findById(1L)).thenReturn(Optional.of(activeEvent));
        com.dogfood.teams.Team team = new com.dogfood.teams.Team(1L, "Alpha Team", "INV123", 100L); // Leader is 100L
        team.setId(55L);
        when(teamRepository.findById(55L)).thenReturn(Optional.of(team));
        when(teamMemberRepository.existsByTeamIdAndUserId(55L, 100L)).thenReturn(true);
        when(submissionRepository.save(any(Submission.class))).thenAnswer(i -> {
            Submission s = i.getArgument(0);
            s.setId(20L);
            return s;
        });

        CreateSubmissionRequest req = new CreateSubmissionRequest("Alpha Project", "Tag", "Desc", "AI", null, null, null, 55L, "SUBMITTED");

        SubmissionResponse resp = submissionService.createSubmission(1L, req, 100L);
        assertNotNull(resp);
        assertEquals(55L, resp.getTeamId());
        verify(submissionRepository).save(any(Submission.class));
    }

    @Test
    void testUpdateSubmission_DeniesNonLeaderTeamMember() {
        Submission teamSub = new Submission(1L, 55L, 100L, "Alpha Project", "Tag", "Desc", "AI", null, null, "[]", "DRAFT", false, null);
        teamSub.setId(20L);

        when(submissionRepository.findById(20L)).thenReturn(Optional.of(teamSub));
        when(eventRepository.findById(1L)).thenReturn(Optional.of(activeEvent));
        com.dogfood.teams.Team team = new com.dogfood.teams.Team(1L, "Alpha Team", "INV123", 100L); // Leader is 100L
        team.setId(55L);
        when(teamRepository.findById(55L)).thenReturn(Optional.of(team));
        when(teamMemberRepository.existsByTeamIdAndUserId(55L, 101L)).thenReturn(true);
        when(authorizationPolicy.hasEventRole(101L, 1L, RoleType.ORGANIZER)).thenReturn(false);

        UpdateSubmissionRequest req = new UpdateSubmissionRequest();
        req.setTitle("Updated by member");

        AccessDeniedException ex = assertThrows(AccessDeniedException.class, () ->
                submissionService.updateSubmission(20L, req, 101L)
        );
        assertTrue(ex.getMessage().contains("Only the team leader can submit or edit a project"));
    }

    @Test
    void testGetMySubmission_ReturnsTeamSubmissionForTeamMember() {
        com.dogfood.teams.Team team = new com.dogfood.teams.Team(1L, "Alpha Team", "INV123", 100L);
        team.setId(55L);
        com.dogfood.teams.TeamMember member = new com.dogfood.teams.TeamMember(team, 101L);

        when(submissionRepository.findFirstByEventIdAndCreatedByOrderByUpdatedAtDesc(1L, 101L)).thenReturn(Optional.empty());
        when(teamMemberRepository.findByUserId(101L)).thenReturn(List.of(member));
        Submission teamSub = new Submission(1L, 55L, 100L, "Leader Project", "Tag", "Desc", "AI", null, null, "[]", "SUBMITTED", false, null);
        teamSub.setId(25L);
        when(submissionRepository.findFirstByEventIdAndTeamIdOrderByUpdatedAtDesc(1L, 55L)).thenReturn(Optional.of(teamSub));

        SubmissionResponse resp = submissionService.getMySubmission(1L, 101L);
        assertNotNull(resp);
        assertEquals("Leader Project", resp.getTitle());
        assertEquals(55L, resp.getTeamId());
    }
}
