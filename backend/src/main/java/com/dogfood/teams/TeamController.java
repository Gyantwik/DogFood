package com.dogfood.teams;

import com.dogfood.common.ApiResponse;
import com.dogfood.security.UserPrincipal;
import com.dogfood.teams.dto.CreateTeamRequest;
import com.dogfood.teams.dto.JoinTeamRequest;
import com.dogfood.teams.dto.TeamResponse;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api")
public class TeamController {

    private final TeamService teamService;

    public TeamController(TeamService teamService) {
        this.teamService = teamService;
    }

    @PostMapping("/events/{eventId}/teams")
    public ResponseEntity<ApiResponse<TeamResponse>> createTeam(
            @PathVariable Long eventId,
            @Valid @RequestBody CreateTeamRequest request,
            @AuthenticationPrincipal UserPrincipal currentUser) {
        if (currentUser == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(ApiResponse.error("Authentication required"));
        }
        TeamResponse response = teamService.createTeam(eventId, request, currentUser.getId());
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok("Team created successfully", response));
    }

    @PostMapping({"/teams/join", "/events/{eventId}/teams/join"})
    public ResponseEntity<ApiResponse<TeamResponse>> joinTeam(
            @PathVariable(required = false) Long eventId,
            @Valid @RequestBody JoinTeamRequest request,
            @AuthenticationPrincipal UserPrincipal currentUser) {
        if (currentUser == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(ApiResponse.error("Authentication required"));
        }
        TeamResponse response = teamService.joinTeam(request, currentUser.getId(), eventId);
        return ResponseEntity.ok(ApiResponse.ok("Successfully joined team", response));
    }

    @GetMapping("/events/{eventId}/teams")
    public ResponseEntity<ApiResponse<List<TeamResponse>>> getTeamsByEvent(
            @PathVariable Long eventId,
            @AuthenticationPrincipal UserPrincipal currentUser) {
        Long userId = currentUser != null ? currentUser.getId() : null;
        List<TeamResponse> teams = teamService.getTeamsByEvent(eventId, userId);
        return ResponseEntity.ok(ApiResponse.ok(teams));
    }

    @GetMapping("/teams/{teamId}")
    public ResponseEntity<ApiResponse<TeamResponse>> getTeam(
            @PathVariable Long teamId,
            @AuthenticationPrincipal UserPrincipal currentUser) {
        Long userId = currentUser != null ? currentUser.getId() : null;
        TeamResponse team = teamService.getTeam(teamId, userId);
        return ResponseEntity.ok(ApiResponse.ok(team));
    }
}
