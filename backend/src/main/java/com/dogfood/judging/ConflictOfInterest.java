package com.dogfood.judging;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "conflict_of_interests", uniqueConstraints = {
    @UniqueConstraint(name = "uk_judge_submission_coi", columnNames = {"judge_id", "submission_id"})
})
public class ConflictOfInterest {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "event_id", nullable = false)
    private Long eventId;

    @Column(name = "judge_id", nullable = false)
    private Long judgeId;

    @Column(name = "submission_id", nullable = false)
    private Long submissionId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 50)
    private CoiReason reason;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    public ConflictOfInterest() {}

    public ConflictOfInterest(Long eventId, Long judgeId, Long submissionId, CoiReason reason, String notes) {
        this.eventId = eventId;
        this.judgeId = judgeId;
        this.submissionId = submissionId;
        this.reason = reason;
        this.notes = notes;
        this.createdAt = Instant.now();
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getEventId() { return eventId; }
    public void setEventId(Long eventId) { this.eventId = eventId; }

    public Long getJudgeId() { return judgeId; }
    public void setJudgeId(Long judgeId) { this.judgeId = judgeId; }

    public Long getSubmissionId() { return submissionId; }
    public void setSubmissionId(Long submissionId) { this.submissionId = submissionId; }

    public CoiReason getReason() { return reason; }
    public void setReason(CoiReason reason) { this.reason = reason; }

    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }

    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
}
