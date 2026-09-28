package com.dogfood.comments;

import com.dogfood.comments.dto.CommentDto;
import com.dogfood.comments.dto.CreateCommentRequest;
import com.dogfood.common.ApiResponse;
import com.dogfood.security.UserPrincipal;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/events/{eventId}/submissions/{submissionId}/comments")
public class CommentController {

    private final CommentService commentService;

    public CommentController(CommentService commentService) {
        this.commentService = commentService;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<CommentDto>>> getComments(
            @PathVariable Long eventId,
            @PathVariable Long submissionId) {
        List<CommentDto> comments = commentService.getCommentsForSubmission(eventId, submissionId);
        return ResponseEntity.ok(ApiResponse.ok(comments));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<CommentDto>> addComment(
            @PathVariable Long eventId,
            @PathVariable Long submissionId,
            @Valid @RequestBody CreateCommentRequest request,
            @AuthenticationPrincipal UserPrincipal currentUser,
            HttpServletRequest servletRequest) {
        String ipAddress = getClientIp(servletRequest);
        CommentDto created = commentService.addComment(eventId, submissionId, request, currentUser, ipAddress);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok("Comment added successfully", created));
    }

    private String getClientIp(HttpServletRequest request) {
        String xf = request.getHeader("X-Forwarded-For");
        if (xf != null && !xf.isBlank()) {
            return xf.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }
}
