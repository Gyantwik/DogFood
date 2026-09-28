package com.dogfood.submissions;

import com.dogfood.common.ApiResponse;
import com.dogfood.security.UserPrincipal;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api")
public class SubmissionController {

    private final SubmissionService submissionService;

    public SubmissionController(SubmissionService submissionService) {
        this.submissionService = submissionService;
    }

    // Submit project (Participant) - dual route mapping
    @PostMapping(value = {"/events/{eventId}/submissions", "/events/{eventId}/submit"})
    public ResponseEntity<ApiResponse<SubmissionResponse>> createSubmission(
            @PathVariable Long eventId,
            @Valid @RequestBody CreateSubmissionRequest request,
            @AuthenticationPrincipal UserPrincipal currentUser) {
        if (currentUser == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(ApiResponse.error("Authentication required"));
        }
        SubmissionResponse response = submissionService.createSubmission(eventId, request, currentUser.getId());
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok("Submission created successfully", response));
    }

    // Update draft / submission
    @RequestMapping(value = {"/submissions/{submissionId}", "/events/{eventId}/submissions/{submissionId}"}, method = {RequestMethod.PUT, RequestMethod.PATCH})
    public ResponseEntity<ApiResponse<SubmissionResponse>> updateSubmission(
            @PathVariable(required = false) Long eventId,
            @PathVariable Long submissionId,
            @RequestBody UpdateSubmissionRequest request,
            @AuthenticationPrincipal UserPrincipal currentUser) {
        if (currentUser == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(ApiResponse.error("Authentication required"));
        }
        SubmissionResponse response = submissionService.updateSubmission(submissionId, request, currentUser.getId(), eventId);
        return ResponseEntity.ok(ApiResponse.ok("Submission updated successfully", response));
    }

    // Get authenticated user's submission / draft for event
    @GetMapping({"/events/{eventId}/submissions/mine", "/events/{eventId}/submissions/draft", "/events/{eventId}/draft"})
    public ResponseEntity<ApiResponse<SubmissionResponse>> getMySubmission(
            @PathVariable Long eventId,
            @AuthenticationPrincipal UserPrincipal currentUser) {
        if (currentUser == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(ApiResponse.error("Authentication required"));
        }
        SubmissionResponse response = submissionService.getMySubmission(eventId, currentUser.getId());
        return ResponseEntity.ok(ApiResponse.ok(response));
    }

    // Get single submission details
    @GetMapping({"/submissions/{submissionId}", "/events/{eventId}/submissions/{submissionId}"})
    public ResponseEntity<ApiResponse<SubmissionResponse>> getSubmission(
            @PathVariable(required = false) Long eventId,
            @PathVariable Long submissionId,
            @AuthenticationPrincipal UserPrincipal currentUser) {
        Long userId = currentUser != null ? currentUser.getId() : null;
        SubmissionResponse response = submissionService.getSubmission(submissionId, userId, eventId);
        return ResponseEntity.ok(ApiResponse.ok(response));
    }

    // Public Gallery - dual routes supported
    @GetMapping({"/events/{eventId}/submissions", "/events/{eventId}/projects"})
    public ResponseEntity<ApiResponse<List<SubmissionResponse>>> getGalleryForEvent(
            @PathVariable Long eventId,
            @RequestParam(required = false) String track,
            @RequestParam(required = false, name = "q") String query,
            @RequestParam(required = false, defaultValue = "top") String sort) {
        List<SubmissionResponse> gallery = submissionService.getGallery(eventId, track, query, sort);
        return ResponseEntity.ok(ApiResponse.ok(gallery));
    }

    @GetMapping("/submissions")
    public ResponseEntity<ApiResponse<List<SubmissionResponse>>> getGlobalGallery(
            @RequestParam(required = false) Long eventId,
            @RequestParam(required = false) String track,
            @RequestParam(required = false, name = "q") String query,
            @RequestParam(required = false, defaultValue = "top") String sort) {
        if (eventId == null) {
            return ResponseEntity.badRequest().body(ApiResponse.error("Event context (eventId) is required"));
        }
        List<SubmissionResponse> gallery = submissionService.getGallery(eventId, track, query, sort);
        return ResponseEntity.ok(ApiResponse.ok(gallery));
    }
}
