package com.dogfood.events;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "scores", uniqueConstraints = {
    @UniqueConstraint(name = "uk_judge_submission", columnNames = {"judge_id", "submission_id"})
})
public class Score {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "event_id", nullable = false)
    private Long eventId;

    @Column(name = "submission_id", nullable = false)
    private Long submissionId;

    @Column(name = "judge_id", nullable = false)
    private Long judgeId;

    @Column(name = "raw_score", nullable = false)
    private Double rawScore;

    @Column(name = "normalized_score")
    private Double normalizedScore;

    @Column(columnDefinition = "TEXT")
    private String comment;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    public Score() {}

    public Score(Long eventId, Long submissionId, Long judgeId, Double rawScore, String comment) {
        this.eventId = eventId;
        this.submissionId = submissionId;
        this.judgeId = judgeId;
        this.rawScore = rawScore;
        this.comment = comment;
        this.createdAt = Instant.now();
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getEventId() { return eventId; }
    public void setEventId(Long eventId) { this.eventId = eventId; }

    public Long getSubmissionId() { return submissionId; }
    public void setSubmissionId(Long submissionId) { this.submissionId = submissionId; }

    public Long getJudgeId() { return judgeId; }
    public void setJudgeId(Long judgeId) { this.judgeId = judgeId; }

    public Double getRawScore() { return rawScore; }
    public void setRawScore(Double rawScore) { this.rawScore = rawScore; }

    public Double getNormalizedScore() { return normalizedScore; }
    public void setNormalizedScore(Double normalizedScore) { this.normalizedScore = normalizedScore; }

    public String getComment() { return comment; }
    public void setComment(String comment) { this.comment = comment; }

    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
}
