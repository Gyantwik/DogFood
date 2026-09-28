package com.dogfood.comments;

import com.dogfood.comments.dto.CommentDto;
import com.dogfood.comments.dto.CreateCommentRequest;
import com.dogfood.common.audit.AuditLogService;
import com.dogfood.events.Event;
import com.dogfood.events.EventRepository;
import com.dogfood.events.Submission;
import com.dogfood.events.SubmissionRepository;
import com.dogfood.security.UserPrincipal;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class CommentService {

    private final CommentRepository commentRepository;
    private final EventRepository eventRepository;
    private final SubmissionRepository submissionRepository;
    private final AuditLogService auditLogService;

    public CommentService(
            CommentRepository commentRepository,
            EventRepository eventRepository,
            SubmissionRepository submissionRepository,
            AuditLogService auditLogService) {
        this.commentRepository = commentRepository;
        this.eventRepository = eventRepository;
        this.submissionRepository = submissionRepository;
        this.auditLogService = auditLogService;
    }

    @Transactional
    public CommentDto addComment(Long eventId, Long submissionId, CreateCommentRequest request, UserPrincipal currentUser, String ipAddress) {
        if (!eventRepository.existsById(eventId)) {
            throw new IllegalArgumentException("Event not found: " + eventId);
        }

        Submission submission = submissionRepository.findById(submissionId)
                .orElseThrow(() -> new IllegalArgumentException("Submission not found: " + submissionId));

        if (!submission.getEventId().equals(eventId)) {
            throw new IllegalArgumentException("Submission does not belong to this event");
        }

        String content = request.getContent() != null ? request.getContent().trim() : "";
        if (content.isEmpty()) {
            throw new IllegalArgumentException("Comment content cannot be empty");
        }
        if (content.length() > 1000) {
            throw new IllegalArgumentException("Comment cannot exceed 1000 characters");
        }

        Long userId = currentUser != null ? currentUser.getId() : null;
        String authorName;
        String authorEmail;

        if (currentUser != null) {
            authorName = currentUser.getUsername();
            authorEmail = currentUser.getEmail();
        } else if (request.getAuthorName() != null && !request.getAuthorName().isBlank()) {
            authorName = request.getAuthorName().trim();
            authorEmail = request.getAuthorEmail() != null ? request.getAuthorEmail().trim() : null;
        } else {
            authorName = "Community Member";
            authorEmail = request.getAuthorEmail() != null ? request.getAuthorEmail().trim() : null;
        }

        Comment comment = new Comment(eventId, submissionId, userId, authorName, authorEmail, content);
        comment = commentRepository.save(comment);

        auditLogService.logAction(userId, eventId, "COMMENT_ADDED", "Added comment on submission: " + submission.getTitle() + " (ID: " + submissionId + ")", ipAddress);

        return mapToDto(comment);
    }

    @Transactional(readOnly = true)
    public List<CommentDto> getCommentsForSubmission(Long eventId, Long submissionId) {
        Submission submission = submissionRepository.findById(submissionId)
                .orElseThrow(() -> new IllegalArgumentException("Submission not found: " + submissionId));

        if (!submission.getEventId().equals(eventId)) {
            throw new IllegalArgumentException("Submission does not belong to this event");
        }

        return commentRepository.findBySubmissionIdOrderByCreatedAtDesc(submissionId).stream()
                .map(this::mapToDto)
                .collect(Collectors.toList());
    }

    private CommentDto mapToDto(Comment comment) {
        return new CommentDto(
                comment.getId(),
                comment.getEventId(),
                comment.getSubmissionId(),
                comment.getUserId(),
                comment.getAuthorName(),
                comment.getContent(),
                comment.getCreatedAt()
        );
    }
}
