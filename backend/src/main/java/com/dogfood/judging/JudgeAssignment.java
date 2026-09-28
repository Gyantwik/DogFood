package com.dogfood.judging;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "judge_assignments", uniqueConstraints = {
    @UniqueConstraint(name = "uk_judge_assignment", columnNames = {"judge_id", "submission_id"})
})
public class JudgeAssignment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "event_id", nullable = false)
    private Long eventId;

    @Column(name = "judge_id", nullable = false)
    private Long judgeId;

    @Column(name = "submission_id", nullable = false)
    private Long submissionId;

    @Column(nullable = false, length = 50)
    private String status = "ASSIGNED"; // ASSIGNED, COMPLETED, REMOVED_COI

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    public JudgeAssignment() {}

    public JudgeAssignment(Long eventId, Long judgeId, Long submissionId, String status) {
        this.eventId = eventId;
        this.judgeId = judgeId;
        this.submissionId = submissionId;
        this.status = status != null ? status : "ASSIGNED";
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

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
}
