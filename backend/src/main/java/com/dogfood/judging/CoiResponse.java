package com.dogfood.judging;

import java.time.Instant;

public class CoiResponse {

    private Long id;
    private Long eventId;
    private Long judgeId;
    private Long submissionId;
    private String reason;
    private String notes;
    private Instant createdAt;

    public CoiResponse() {}

    public CoiResponse(Long id, Long eventId, Long judgeId, Long submissionId, String reason, String notes, Instant createdAt) {
        this.id = id;
        this.eventId = eventId;
        this.judgeId = judgeId;
        this.submissionId = submissionId;
        this.reason = reason;
        this.notes = notes;
        this.createdAt = createdAt;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getEventId() { return eventId; }
    public void setEventId(Long eventId) { this.eventId = eventId; }

    public Long getJudgeId() { return judgeId; }
    public void setJudgeId(Long judgeId) { this.judgeId = judgeId; }

    public Long getSubmissionId() { return submissionId; }
    public void setSubmissionId(Long submissionId) { this.submissionId = submissionId; }

    public String getReason() { return reason; }
    public void setReason(String reason) { this.reason = reason; }

    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }

    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
}
