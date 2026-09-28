package com.dogfood.voting;

import com.dogfood.common.ApiResponse;
import com.dogfood.security.UserPrincipal;
import com.dogfood.voting.dto.*;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/events/{eventId}")
public class VoteController {

    private final VotingService votingService;

    public VoteController(VotingService votingService) {
        this.votingService = votingService;
    }

    @PostMapping({"/vote", "/voting/vote"})
    public ResponseEntity<ApiResponse<VoteResponse>> submitVote(
            @PathVariable Long eventId,
            @Valid @RequestBody VoteRequest request,
            @AuthenticationPrincipal UserPrincipal currentUser,
            HttpServletRequest servletRequest) {
        Long userId = currentUser != null ? currentUser.getId() : null;
        String ipAddress = getClientIp(servletRequest);
        VoteResponse response = votingService.submitVote(eventId, request, userId, ipAddress);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok("Vote submitted successfully", response));
    }

    @GetMapping({"/voting/status", "/voting-status"})
    public ResponseEntity<ApiResponse<VotingStatusResponse>> getVotingStatus(
            @PathVariable Long eventId,
            @RequestParam(required = false) String voterIdentifier,
            @AuthenticationPrincipal UserPrincipal currentUser) {
        Long userId = currentUser != null ? currentUser.getId() : null;
        VotingStatusResponse response = votingService.getVotingStatus(eventId, voterIdentifier, userId);
        return ResponseEntity.ok(ApiResponse.ok(response));
    }

    @GetMapping({"/voting/ballot", "/ballot"})
    public ResponseEntity<ApiResponse<List<BallotItemDto>>> getBallot(@PathVariable Long eventId) {
        List<BallotItemDto> ballot = votingService.getBallot(eventId);
        return ResponseEntity.ok(ApiResponse.ok(ballot));
    }

    @GetMapping({"/voting/results", "/voting-results"})
    public ResponseEntity<ApiResponse<List<VotingResultItemDto>>> getVotingResults(
            @PathVariable Long eventId,
            @AuthenticationPrincipal UserPrincipal currentUser) {
        List<VotingResultItemDto> results = votingService.getVotingResults(eventId, currentUser);
        return ResponseEntity.ok(ApiResponse.ok(results));
    }

    private String getClientIp(HttpServletRequest request) {
        String xf = request.getHeader("X-Forwarded-For");
        if (xf != null && !xf.isBlank()) {
            return xf.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }
}
