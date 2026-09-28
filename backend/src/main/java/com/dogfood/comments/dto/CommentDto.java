package com.dogfood.comments.dto;

import java.time.Instant;

public class CommentDto {

    private Long id;
    private Long eventId;
    private Long submissionId;
    private Long userId;
    private String authorName;
    private String content;
    private Instant createdAt;

    public CommentDto() {}

    public CommentDto(Long id, Long eventId, Long submissionId, Long userId, String authorName, String content, Instant createdAt) {
        this.id = id;
        this.eventId = eventId;
        this.submissionId = submissionId;
        this.userId = userId;
        this.authorName = authorName;
        this.content = content;
        this.createdAt = createdAt;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getEventId() { return eventId; }
    public void setEventId(Long eventId) { this.eventId = eventId; }

    public Long getSubmissionId() { return submissionId; }
    public void setSubmissionId(Long submissionId) { this.submissionId = submissionId; }

    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }

    public String getAuthorName() { return authorName; }
    public void setAuthorName(String authorName) { this.authorName = authorName; }

    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }

    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
}
