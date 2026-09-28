package com.dogfood.teams;

import com.dogfood.auth.EventRole;
import com.dogfood.auth.EventRoleRepository;
import com.dogfood.auth.User;
import com.dogfood.auth.UserRepository;
import com.dogfood.common.audit.AuditLogService;
import com.dogfood.events.Event;
import com.dogfood.events.EventRepository;
import com.dogfood.events.SubmissionRepository;
import com.dogfood.teams.dto.JoinTeamRequest;
import com.dogfood.teams.dto.TeamResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.*;

class TeamJoinLifecycleTest {

    private TeamRepository teamRepository;
    private TeamMemberRepository teamMemberRepository;
    private EventRepository eventRepository;
    private UserRepository userRepository;
    private EventRoleRepository eventRoleRepository;
    private AuditLogService auditLogService;
    private SubmissionRepository submissionRepository;
    private TeamService teamService;

    @BeforeEach
    void setUp() {
        teamRepository = Mockito.mock(TeamRepository.class);
        teamMemberRepository = Mockito.mock(TeamMemberRepository.class);
        eventRepository = Mockito.mock(EventRepository.class);
        userRepository = Mockito.mock(UserRepository.class);
        eventRoleRepository = Mockito.mock(EventRoleRepository.class);
        auditLogService = Mockito.mock(AuditLogService.class);
        submissionRepository = Mockito.mock(SubmissionRepository.class);

        teamService = new TeamService(
                teamRepository,
                teamMemberRepository,
                eventRepository,
                userRepository,
                eventRoleRepository,
                auditLogService,
                submissionRepository
        );
    }

    @Test
    void testJoinTeam_AllowsJoiningDuringRegistrationWindowWhenNotSubmitted() {
        Long eventId = 1L;
        Long newMemberUserId = 20L;
        String inviteCode = "TEAM2026";
        Instant now = Instant.now();

        Event event = new Event("Hackathon", "Desc", now.plus(10, ChronoUnit.DAYS));
        event.setId(eventId);
        event.setStatus("OPEN");
        event.setTeamFormationStart(now.minus(2, ChronoUnit.DAYS));
        event.setTeamFormationEnd(now.plus(3, ChronoUnit.DAYS)); // Still open

        Team team = new Team(eventId, "Super Team", inviteCode, 10L);
        team.setId(100L);

        User newMember = new User("new_dev", "dev@dogfood.local", "hash");
        newMember.setId(newMemberUserId);

        when(teamRepository.findByInviteCode(inviteCode)).thenReturn(Optional.of(team));
        when(eventRepository.findById(eventId)).thenReturn(Optional.of(event));
        when(submissionRepository.existsByTeamIdAndStatus(100L, "SUBMITTED")).thenReturn(false);
        when(userRepository.findById(newMemberUserId)).thenReturn(Optional.of(newMember));
        when(teamRepository.findByEventId(eventId)).thenReturn(List.of(team));
        when(teamMemberRepository.existsByTeamIdAndUserId(100L, newMemberUserId)).thenReturn(false);
        when(teamMemberRepository.findByTeamId(100L)).thenReturn(List.of(new TeamMember(team, 10L), new TeamMember(team, newMemberUserId)));
        when(userRepository.findAllById(anyList())).thenReturn(List.of(newMember));

        TeamResponse response = teamService.joinTeam(new JoinTeamRequest(inviteCode), newMemberUserId);

        assertNotNull(response);
        assertEquals("Super Team", response.getName());
        assertEquals(inviteCode, response.getInviteCode());
        verify(teamMemberRepository).save(any(TeamMember.class));
        verify(eventRoleRepository).save(any(EventRole.class));
    }

    @Test
    void testJoinTeam_FailsWhenTeamHasAlreadySubmitted() {
        Long eventId = 1L;
        Long newMemberUserId = 20L;
        String inviteCode = "TEAM2026";
        Instant now = Instant.now();

        Event event = new Event("Hackathon", "Desc", now.plus(10, ChronoUnit.DAYS));
        event.setId(eventId);
        event.setStatus("OPEN");
        event.setRegistrationStart(now.minus(2, ChronoUnit.DAYS));
        event.setRegistrationEnd(now.plus(3, ChronoUnit.DAYS));

        Team team = new Team(eventId, "Super Team", inviteCode, 10L);
        team.setId(100L);

        when(teamRepository.findByInviteCode(inviteCode)).thenReturn(Optional.of(team));
        when(eventRepository.findById(eventId)).thenReturn(Optional.of(event));
        when(submissionRepository.existsByTeamIdAndStatus(100L, "SUBMITTED")).thenReturn(true);

        IllegalStateException ex = assertThrows(IllegalStateException.class, () ->
                teamService.joinTeam(new JoinTeamRequest(inviteCode), newMemberUserId)
        );
        assertTrue(ex.getMessage().contains("TEAM_MEMBERSHIP_LOCKED_AFTER_SUBMISSION"));
        verify(teamMemberRepository, never()).save(any());
    }

    @Test
    void testJoinTeam_FailsWhenTeamFormationHasClosed() {
        Long eventId = 1L;
        Long newMemberUserId = 20L;
        String inviteCode = "TEAM2026";
        Instant now = Instant.now();

        Event event = new Event("Hackathon", "Desc", now.plus(5, ChronoUnit.DAYS));
        event.setId(eventId);
        event.setStatus("OPEN");
        event.setTeamFormationStart(now.minus(10, ChronoUnit.DAYS));
        event.setTeamFormationEnd(now.minus(1, ChronoUnit.DAYS)); // Closed yesterday

        Team team = new Team(eventId, "Super Team", inviteCode, 10L);
        team.setId(100L);

        when(teamRepository.findByInviteCode(inviteCode)).thenReturn(Optional.of(team));
        when(eventRepository.findById(eventId)).thenReturn(Optional.of(event));

        IllegalStateException ex = assertThrows(IllegalStateException.class, () ->
                teamService.joinTeam(new JoinTeamRequest(inviteCode), newMemberUserId)
        );
        assertTrue(ex.getMessage().contains("Team formation window has closed"));
        verify(teamMemberRepository, never()).save(any());
    }

    @Test
    void testJoinTeam_FailsWhenTeamFormationNotStarted() {
        Long eventId = 1L;
        Long newMemberUserId = 20L;
        String inviteCode = "TEAM2026";
        Instant now = Instant.now();

        Event event = new Event("Hackathon", "Desc", now.plus(10, ChronoUnit.DAYS));
        event.setId(eventId);
        event.setStatus("OPEN");
        event.setTeamFormationStart(now.plus(1, ChronoUnit.DAYS)); // Opens tomorrow
        event.setTeamFormationEnd(now.plus(5, ChronoUnit.DAYS));

        Team team = new Team(eventId, "Super Team", inviteCode, 10L);
        team.setId(100L);

        when(teamRepository.findByInviteCode(inviteCode)).thenReturn(Optional.of(team));
        when(eventRepository.findById(eventId)).thenReturn(Optional.of(event));

        IllegalStateException ex = assertThrows(IllegalStateException.class, () ->
                teamService.joinTeam(new JoinTeamRequest(inviteCode), newMemberUserId)
        );
        assertTrue(ex.getMessage().contains("Team formation period has not opened yet"));
        verify(teamMemberRepository, never()).save(any());
    }

    @Test
    void testJoinTeam_FailsWhenEventIsClosed() {
        Long eventId = 1L;
        Long newMemberUserId = 20L;
        String inviteCode = "TEAM2026";
        Instant now = Instant.now();

        Event event = new Event("Hackathon", "Desc", now.plus(5, ChronoUnit.DAYS));
        event.setId(eventId);
        event.setStatus("CLOSED");

        Team team = new Team(eventId, "Super Team", inviteCode, 10L);
        team.setId(100L);

        when(teamRepository.findByInviteCode(inviteCode)).thenReturn(Optional.of(team));
        when(eventRepository.findById(eventId)).thenReturn(Optional.of(event));

        IllegalStateException ex = assertThrows(IllegalStateException.class, () ->
                teamService.joinTeam(new JoinTeamRequest(inviteCode), newMemberUserId)
        );
        assertTrue(ex.getMessage().contains("closed"));
        verify(teamMemberRepository, never()).save(any());
    }

    @Test
    void testJoinTeam_FailsWhenUserAlreadyOnAnotherTeamInSameEvent() {
        Long eventId = 1L;
        Long userId = 20L;
        String inviteCode = "TEAM_B_CODE";
        Instant now = Instant.now();

        Event event = new Event("Hackathon", "Desc", now.plus(5, ChronoUnit.DAYS));
        event.setId(eventId);
        event.setStatus("OPEN");

        Team teamA = new Team(eventId, "Team Alpha", "CODE_A", 10L);
        teamA.setId(101L);

        Team teamB = new Team(eventId, "Team Beta", inviteCode, 11L);
        teamB.setId(102L);

        User user = new User("dev", "dev@dogfood.local", "hash");
        user.setId(userId);

        when(teamRepository.findByInviteCode(inviteCode)).thenReturn(Optional.of(teamB));
        when(eventRepository.findById(eventId)).thenReturn(Optional.of(event));
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(teamMemberRepository.existsByTeamIdAndUserId(102L, userId)).thenReturn(false);
        when(teamMemberRepository.findByUserId(userId)).thenReturn(List.of(new TeamMember(teamA, userId)));

        IllegalStateException ex = assertThrows(IllegalStateException.class, () ->
                teamService.joinTeam(new JoinTeamRequest(inviteCode), userId)
        );
        assertTrue(ex.getMessage().contains("already belongs to another team in this event"));
        verify(teamMemberRepository, never()).save(any());
    }

    @Test
    void testJoinTeam_FailsWhenUserAlreadyMemberOfSameTeam() {
        Long eventId = 1L;
        Long userId = 20L;
        String inviteCode = "TEAM_A_CODE";
        Instant now = Instant.now();

        Event event = new Event("Hackathon", "Desc", now.plus(5, ChronoUnit.DAYS));
        event.setId(eventId);
        event.setStatus("OPEN");

        Team teamA = new Team(eventId, "Team Alpha", inviteCode, 10L);
        teamA.setId(101L);

        User user = new User("dev", "dev@dogfood.local", "hash");
        user.setId(userId);

        when(teamRepository.findByInviteCode(inviteCode)).thenReturn(Optional.of(teamA));
        when(eventRepository.findById(eventId)).thenReturn(Optional.of(event));
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(teamRepository.findByEventId(eventId)).thenReturn(List.of(teamA));
        when(teamMemberRepository.existsByTeamIdAndUserId(101L, userId)).thenReturn(true);

        IllegalStateException ex = assertThrows(IllegalStateException.class, () ->
                teamService.joinTeam(new JoinTeamRequest(inviteCode), userId)
        );
        assertTrue(ex.getMessage().contains("already a member of this team"));
        verify(teamMemberRepository, never()).save(any());
    }

    @Test
    void testJoinTeam_SubmissionFreezeVersusOpenTeamFormationWindow() {
        // teamFormationEnd is in the future (e.g. 20:00)
        // Team A submitted earlier => Team A membership immediately locked
        // Team B has not submitted => Team B can still be joined
        Long eventId = 1L;
        Instant now = Instant.now();
        Event event = new Event("Hackathon", "Desc", now.plus(10, ChronoUnit.HOURS));
        event.setId(eventId);
        event.setStatus("OPEN");
        event.setTeamFormationStart(now.minus(5, ChronoUnit.HOURS));
        event.setTeamFormationEnd(now.plus(5, ChronoUnit.HOURS)); // Open until 20:00

        Team teamA = new Team(eventId, "Team A", "TEAM_A_CODE", 10L);
        teamA.setId(101L);
        Team teamB = new Team(eventId, "Team B", "TEAM_B_CODE", 11L);
        teamB.setId(102L);

        // Team A has submitted
        when(teamRepository.findByInviteCode("TEAM_A_CODE")).thenReturn(Optional.of(teamA));
        when(submissionRepository.existsByTeamIdAndStatus(101L, "SUBMITTED")).thenReturn(true);

        // Team B has not submitted
        when(teamRepository.findByInviteCode("TEAM_B_CODE")).thenReturn(Optional.of(teamB));
        when(submissionRepository.existsByTeamIdAndStatus(102L, "SUBMITTED")).thenReturn(false);

        when(eventRepository.findById(eventId)).thenReturn(Optional.of(event));

        User user1 = new User("dev1", "dev1@test.com", "hash");
        user1.setId(201L);
        User user2 = new User("dev2", "dev2@test.com", "hash");
        user2.setId(202L);
        when(userRepository.findById(201L)).thenReturn(Optional.of(user1));
        when(userRepository.findById(202L)).thenReturn(Optional.of(user2));

        when(teamMemberRepository.existsByTeamIdAndUserId(102L, 202L)).thenReturn(false);
        when(teamMemberRepository.findByUserId(202L)).thenReturn(Collections.emptyList());
        when(teamRepository.findByEventId(eventId)).thenReturn(List.of(teamA, teamB));
        when(teamMemberRepository.findByTeamId(102L)).thenReturn(List.of(new TeamMember(teamB, 11L), new TeamMember(teamB, 202L)));
        when(userRepository.findAllById(anyList())).thenReturn(List.of(user2));

        // Attempting to join Team A throws TEAM_MEMBERSHIP_LOCKED_AFTER_SUBMISSION
        IllegalStateException ex = assertThrows(IllegalStateException.class, () ->
                teamService.joinTeam(new JoinTeamRequest("TEAM_A_CODE"), 201L)
        );
        assertTrue(ex.getMessage().contains("TEAM_MEMBERSHIP_LOCKED_AFTER_SUBMISSION"));

        // Attempting to join Team B succeeds
        TeamResponse respB = teamService.joinTeam(new JoinTeamRequest("TEAM_B_CODE"), 202L);
        assertNotNull(respB);
        assertEquals("Team B", respB.getName());
    }
}
