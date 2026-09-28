package com.dogfood.teams;

import com.dogfood.auth.*;
import com.dogfood.common.audit.AuditLogService;
import com.dogfood.events.Event;
import com.dogfood.events.EventRepository;
import com.dogfood.events.Submission;
import com.dogfood.events.SubmissionRepository;
import com.dogfood.teams.dto.CreateTeamRequest;
import com.dogfood.teams.dto.JoinTeamRequest;
import com.dogfood.teams.dto.TeamMemberDto;
import com.dogfood.teams.dto.TeamResponse;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.Instant;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class TeamService {

    private final TeamRepository teamRepository;
    private final TeamMemberRepository teamMemberRepository;
    private final EventRepository eventRepository;
    private final UserRepository userRepository;
    private final EventRoleRepository eventRoleRepository;
    private final AuditLogService auditLogService;
    private final SubmissionRepository submissionRepository;

    private static final String ALPHANUM = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    private final SecureRandom random = new SecureRandom();

    public TeamService(
            TeamRepository teamRepository,
            TeamMemberRepository teamMemberRepository,
            EventRepository eventRepository,
            UserRepository userRepository,
            EventRoleRepository eventRoleRepository,
            AuditLogService auditLogService,
            SubmissionRepository submissionRepository) {
        this.teamRepository = teamRepository;
        this.teamMemberRepository = teamMemberRepository;
        this.eventRepository = eventRepository;
        this.userRepository = userRepository;
        this.eventRoleRepository = eventRoleRepository;
        this.auditLogService = auditLogService;
        this.submissionRepository = submissionRepository;
    }

    @Transactional
    public TeamResponse createTeam(Long eventId, CreateTeamRequest request, Long userId) {
        Event event = eventRepository.findById(eventId).orElse(null);
        if (event == null && !eventRepository.existsById(eventId)) {
            throw new IllegalArgumentException("Event not found with id: " + eventId);
        }

        if (event != null) {
            if (event.getStatus() != null && !"OPEN".equalsIgnoreCase(event.getStatus())) {
                throw new IllegalStateException("Event is closed");
            }

            Instant now = Instant.now();
            if (event.getTeamFormationStart() != null && now.isBefore(event.getTeamFormationStart())) {
                throw new IllegalStateException("Team formation period has not opened yet");
            }
            if (event.getTeamFormationEnd() != null && now.isAfter(event.getTeamFormationEnd())) {
                throw new IllegalStateException("Team formation window has closed");
            }
        }

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found with id: " + userId));

        // One team per user per event rule
        List<TeamMember> userMemberships = teamMemberRepository.findByUserId(userId);
        for (TeamMember m : userMemberships) {
            Team t = m.getTeam();
            if (t == null && m.getTeamId() != null) {
                t = teamRepository.findById(m.getTeamId()).orElse(null);
            }
            if (t != null && eventId.equals(t.getEventId())) {
                throw new IllegalStateException("User already belongs to another team in this event");
            }
        }

        // Generate unique invite code
        String inviteCode;
        do {
            inviteCode = generateInviteCode();
        } while (teamRepository.existsByInviteCode(inviteCode));

        Team team = new Team(eventId, request.getName().trim(), inviteCode, userId);
        team = teamRepository.save(team);

        // Add creator as leader member
        TeamMember member = new TeamMember(team, userId);
        teamMemberRepository.save(member);

        // Ensure user has PARTICIPANT role in event
        ensureParticipantRole(user, eventId);

        auditLogService.logAction(userId, eventId, "CREATE_TEAM", "Created team: " + team.getName());

        return mapToTeamResponse(team, userId);
    }

    @Transactional
    public TeamResponse joinTeam(JoinTeamRequest request, Long userId) {
        return joinTeam(request, userId, null);
    }

    @Transactional
    public TeamResponse joinTeam(JoinTeamRequest request, Long userId, Long eventContextId) {
        String code = request.getInviteCode().trim().toUpperCase();
        Team team = teamRepository.findByInviteCode(code)
                .orElseThrow(() -> new IllegalArgumentException("Invalid invite code: " + code));

        if (eventContextId != null && !team.getEventId().equals(eventContextId)) {
            throw new IllegalArgumentException("Team does not belong to the specified event");
        }

        Event event = eventRepository.findById(team.getEventId()).orElse(null);

        if (event != null) {
            if (event.getStatus() != null && !"OPEN".equalsIgnoreCase(event.getStatus())) {
                throw new IllegalStateException("Event is closed");
            }

            Instant now = Instant.now();
            if (event.getTeamFormationStart() != null && now.isBefore(event.getTeamFormationStart())) {
                throw new IllegalStateException("Team formation period has not opened yet");
            }
            if (event.getTeamFormationEnd() != null && now.isAfter(event.getTeamFormationEnd())) {
                throw new IllegalStateException("Team formation window has closed");
            }
        }

        boolean hasSubmittedProject = submissionRepository.existsByTeamIdAndStatus(team.getId(), "SUBMITTED")
                || submissionRepository.existsByTeamIdAndStatus(team.getId(), "LOCKED");
        if (!hasSubmittedProject) {
            List<TeamMember> existingMembers = teamMemberRepository.findByTeamId(team.getId());
            for (TeamMember tm : existingMembers) {
                Optional<Submission> memberSub = submissionRepository.findFirstByEventIdAndCreatedByOrderByUpdatedAtDesc(team.getEventId(), tm.getUserId());
                if (memberSub.isPresent() && ("SUBMITTED".equalsIgnoreCase(memberSub.get().getStatus()) || "LOCKED".equalsIgnoreCase(memberSub.get().getStatus()))) {
                    hasSubmittedProject = true;
                    if (memberSub.get().getTeamId() == null) {
                        memberSub.get().setTeamId(team.getId());
                        submissionRepository.save(memberSub.get());
                    }
                    break;
                }
            }
        }
        if (hasSubmittedProject) {
            throw new IllegalStateException("TEAM_MEMBERSHIP_LOCKED_AFTER_SUBMISSION: Team membership is locked after submission");
        }

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found with id: " + userId));

        if (teamMemberRepository.existsByTeamIdAndUserId(team.getId(), userId)) {
            throw new IllegalStateException("User is already a member of this team");
        }

        // One team per user per event rule
        List<TeamMember> userMemberships = teamMemberRepository.findByUserId(userId);
        for (TeamMember m : userMemberships) {
            Team t = m.getTeam();
            if (t == null && m.getTeamId() != null) {
                t = teamRepository.findById(m.getTeamId()).orElse(null);
            }
            if (t != null && team.getEventId().equals(t.getEventId())) {
                throw new IllegalStateException("User already belongs to another team in this event");
            }
        }

        TeamMember member = new TeamMember(team, userId);
        teamMemberRepository.save(member);

        // Ensure user has PARTICIPANT role in event
        ensureParticipantRole(user, team.getEventId());

        auditLogService.logAction(userId, team.getEventId(), "JOIN_TEAM", "Joined team: " + team.getName());

        return mapToTeamResponse(team, userId);
    }

    @Transactional(readOnly = true)
    public TeamResponse getTeam(Long teamId) {
        return getTeam(teamId, null);
    }

    @Transactional(readOnly = true)
    public TeamResponse getTeam(Long teamId, Long requestingUserId) {
        Team team = teamRepository.findById(teamId)
                .orElseThrow(() -> new IllegalArgumentException("Team not found with id: " + teamId));
        return mapToTeamResponse(team, requestingUserId);
    }

    @Transactional(readOnly = true)
    public List<TeamResponse> getTeamsByEvent(Long eventId) {
        return getTeamsByEvent(eventId, null);
    }

    @Transactional(readOnly = true)
    public List<TeamResponse> getTeamsByEvent(Long eventId, Long requestingUserId) {
        return teamRepository.findByEventId(eventId).stream()
                .map(team -> mapToTeamResponse(team, requestingUserId))
                .collect(Collectors.toList());
    }

    private void ensureParticipantRole(User user, Long eventId) {
        if (eventRoleRepository.findByUserIdAndEventIdAndRole(user.getId(), eventId, RoleType.PARTICIPANT).isEmpty()) {
            EventRole participantRole = new EventRole(user, eventId, RoleType.PARTICIPANT);
            eventRoleRepository.save(participantRole);
        }
    }

    private TeamResponse mapToTeamResponse(Team team) {
        return mapToTeamResponse(team, null);
    }

    private TeamResponse mapToTeamResponse(Team team, Long requestingUserId) {
        List<TeamMember> members = teamMemberRepository.findByTeamId(team.getId());
        Map<Long, User> userMap = userRepository.findAllById(
                members.stream().map(TeamMember::getUserId).collect(Collectors.toList())
        ).stream().collect(Collectors.toMap(User::getId, u -> u));

        List<TeamMemberDto> memberDtos = members.stream().map(m -> {
            User u = userMap.get(m.getUserId());
            String username = u != null ? u.getUsername() : "User #" + m.getUserId();
            String email = u != null ? u.getEmail() : "";
            boolean isLeader = Objects.equals(m.getUserId(), team.getLeaderId());
            return new TeamMemberDto(m.getUserId(), username, email, isLeader, m.getJoinedAt());
        }).collect(Collectors.toList());

        boolean canViewInviteCode = false;
        if (requestingUserId != null) {
            boolean isLeader = Objects.equals(team.getLeaderId(), requestingUserId);
            boolean isMember = members.stream().anyMatch(m -> Objects.equals(m.getUserId(), requestingUserId));
            boolean isOrganizer = eventRoleRepository.findByUserIdAndEventIdAndRole(requestingUserId, team.getEventId(), RoleType.ORGANIZER).isPresent();
            canViewInviteCode = isLeader || isMember || isOrganizer;
        }

        String inviteCode = canViewInviteCode ? team.getInviteCode() : null;

        return new TeamResponse(
                team.getId(),
                team.getEventId(),
                team.getName(),
                inviteCode,
                team.getLeaderId(),
                memberDtos,
                team.getCreatedAt()
        );
    }

    private String generateInviteCode() {
        StringBuilder sb = new StringBuilder(8);
        for (int i = 0; i < 8; i++) {
            sb.append(ALPHANUM.charAt(random.nextInt(ALPHANUM.length())));
        }
        return sb.toString();
    }
}
