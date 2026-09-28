package com.dogfood.teams;

import com.dogfood.auth.EventRole;
import com.dogfood.auth.EventRoleRepository;
import com.dogfood.auth.RoleType;
import com.dogfood.auth.User;
import com.dogfood.auth.UserRepository;
import com.dogfood.common.audit.AuditLogService;
import com.dogfood.events.EventRepository;
import com.dogfood.events.SubmissionRepository;
import com.dogfood.teams.dto.CreateTeamRequest;
import com.dogfood.teams.dto.JoinTeamRequest;
import com.dogfood.teams.dto.TeamResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

import java.util.Collections;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class TeamServiceTest {

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
    void testCreateTeam_Success() {
        Long eventId = 1L;
        Long userId = 4L;
        CreateTeamRequest request = new CreateTeamRequest("Team Alpha");

        User user = new User("participant", "participant@dogfood.local", "hash");
        user.setId(userId);

        Team savedTeam = new Team(eventId, "Team Alpha", "ABC12345", userId);
        savedTeam.setId(10L);

        when(eventRepository.existsById(eventId)).thenReturn(true);
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(teamRepository.existsByInviteCode(anyString())).thenReturn(false);
        when(teamRepository.save(any(Team.class))).thenReturn(savedTeam);
        when(teamMemberRepository.findByTeamId(10L)).thenReturn(Collections.singletonList(new TeamMember(savedTeam, userId)));
        when(userRepository.findAllById(anyList())).thenReturn(Collections.singletonList(user));

        TeamResponse response = teamService.createTeam(eventId, request, userId);

        assertNotNull(response);
        assertEquals("Team Alpha", response.getName());
        assertNotNull(response.getInviteCode());
        verify(teamMemberRepository).save(any(TeamMember.class));
        verify(eventRoleRepository).save(any(EventRole.class));
    }

    @Test
    void testJoinTeam_Success() {
        Long userId = 5L;
        String inviteCode = "ABC12345";
        JoinTeamRequest request = new JoinTeamRequest(inviteCode);

        User user = new User("user2", "user2@dogfood.local", "hash");
        user.setId(userId);

        Team team = new Team(1L, "Team Alpha", inviteCode, 4L);
        team.setId(10L);

        when(teamRepository.findByInviteCode(inviteCode)).thenReturn(Optional.of(team));
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(teamMemberRepository.existsByTeamIdAndUserId(10L, userId)).thenReturn(false);
        when(teamMemberRepository.findByTeamId(10L)).thenReturn(Collections.singletonList(new TeamMember(team, userId)));
        when(userRepository.findAllById(anyList())).thenReturn(Collections.singletonList(user));

        TeamResponse response = teamService.joinTeam(request, userId);

        assertNotNull(response);
        assertEquals("Team Alpha", response.getName());
        verify(teamMemberRepository).save(any(TeamMember.class));
    }

    @Test
    void testJoinTeam_AlreadyMember() {
        Long userId = 5L;
        String inviteCode = "ABC12345";
        JoinTeamRequest request = new JoinTeamRequest(inviteCode);

        User user = new User("user2", "user2@dogfood.local", "hash");
        user.setId(userId);

        Team team = new Team(1L, "Team Alpha", inviteCode, 4L);
        team.setId(10L);

        when(teamRepository.findByInviteCode(inviteCode)).thenReturn(Optional.of(team));
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(teamMemberRepository.existsByTeamIdAndUserId(10L, userId)).thenReturn(true);

        assertThrows(IllegalStateException.class, () -> teamService.joinTeam(request, userId));
    }

    @Test
    void testJoinTeam_InvalidInviteCode() {
        JoinTeamRequest request = new JoinTeamRequest("INVALID");
        when(teamRepository.findByInviteCode("INVALID")).thenReturn(Optional.empty());

        assertThrows(IllegalArgumentException.class, () -> teamService.joinTeam(request, 1L));
    }

    @Test
    void testGetTeam_InviteCodeMaskedForNonMember() {
        Long teamId = 10L;
        Long nonMemberUserId = 99L;
        Team team = new Team(1L, "Team Alpha", "SECRET123", 4L);
        team.setId(teamId);

        when(teamRepository.findById(teamId)).thenReturn(Optional.of(team));
        when(teamMemberRepository.findByTeamId(teamId)).thenReturn(Collections.emptyList());
        when(userRepository.findAllById(anyList())).thenReturn(Collections.emptyList());
        when(eventRoleRepository.findByUserIdAndEventIdAndRole(nonMemberUserId, 1L, RoleType.ORGANIZER))
                .thenReturn(Optional.empty());

        TeamResponse response = teamService.getTeam(teamId, nonMemberUserId);
        assertNotNull(response);
        assertEquals("Team Alpha", response.getName());
        assertNull(response.getInviteCode(), "Invite code must be null for non-members");
    }

    @Test
    void testGetTeam_InviteCodeVisibleToMember() {
        Long teamId = 10L;
        Long memberUserId = 4L;
        Team team = new Team(1L, "Team Alpha", "SECRET123", memberUserId);
        team.setId(teamId);

        User memberUser = new User("leader", "leader@dogfood.local", "hash");
        memberUser.setId(memberUserId);

        when(teamRepository.findById(teamId)).thenReturn(Optional.of(team));
        when(teamMemberRepository.findByTeamId(teamId)).thenReturn(Collections.singletonList(new TeamMember(team, memberUserId)));
        when(userRepository.findAllById(anyList())).thenReturn(Collections.singletonList(memberUser));

        TeamResponse response = teamService.getTeam(teamId, memberUserId);
        assertNotNull(response);
        assertEquals("SECRET123", response.getInviteCode(), "Invite code must be visible to team member/leader");
    }

    @Test
    void testGetTeam_InviteCodeVisibleToOrganizer() {
        Long teamId = 10L;
        Long organizerUserId = 1L;
        Team team = new Team(1L, "Team Alpha", "SECRET123", 4L);
        team.setId(teamId);

        User organizer = new User("organizer", "org@dogfood.local", "hash");
        organizer.setId(organizerUserId);

        when(teamRepository.findById(teamId)).thenReturn(Optional.of(team));
        when(teamMemberRepository.findByTeamId(teamId)).thenReturn(Collections.emptyList());
        when(userRepository.findAllById(anyList())).thenReturn(Collections.emptyList());
        when(eventRoleRepository.findByUserIdAndEventIdAndRole(organizerUserId, 1L, RoleType.ORGANIZER))
                .thenReturn(Optional.of(new EventRole(organizer, 1L, RoleType.ORGANIZER)));

        TeamResponse response = teamService.getTeam(teamId, organizerUserId);
        assertNotNull(response);
        assertEquals("SECRET123", response.getInviteCode(), "Invite code must be visible to event organizers");
    }

    @Test
    void testJoinTeam_LockedAfterSubmission() {
        Long userId = 5L;
        String inviteCode = "ABC12345";
        JoinTeamRequest request = new JoinTeamRequest(inviteCode);

        Team team = new Team(1L, "Team Alpha", inviteCode, 4L);
        team.setId(10L);

        when(teamRepository.findByInviteCode(inviteCode)).thenReturn(Optional.of(team));
        when(submissionRepository.existsByTeamIdAndStatus(10L, "SUBMITTED")).thenReturn(true);

        IllegalStateException ex = assertThrows(IllegalStateException.class, () ->
                teamService.joinTeam(request, userId)
        );
        assertTrue(ex.getMessage().contains("TEAM_MEMBERSHIP_LOCKED_AFTER_SUBMISSION"));
        verify(teamMemberRepository, never()).save(any());
    }
}
