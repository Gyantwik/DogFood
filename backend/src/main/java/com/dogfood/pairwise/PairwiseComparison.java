package com.dogfood.pairwise;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "pairwise_comparisons", uniqueConstraints = {
    @UniqueConstraint(name = "uk_judge_event_pair", columnNames = {"judge_id", "event_id", "project_a_id", "project_b_id"})
})
public class PairwiseComparison {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "event_id", nullable = false)
    private Long eventId;

    @Column(name = "track_id")
    private Long trackId;

    @Column(name = "judge_id", nullable = false)
    private Long judgeId;

    @Column(name = "project_a_id", nullable = false)
    private Long projectAId;

    @Column(name = "project_b_id", nullable = false)
    private Long projectBId;

    @Column(name = "winner_project_id", nullable = false)
    private Long winnerProjectId;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    public PairwiseComparison() {}

    public PairwiseComparison(Long eventId, Long trackId, Long judgeId, Long projectAId, Long projectBId, Long winnerProjectId) {
        this.eventId = eventId;
        this.trackId = trackId;
        this.judgeId = judgeId;
        // Enforce canonical ordering projectAId < projectBId
        if (projectAId.compareTo(projectBId) < 0) {
            this.projectAId = projectAId;
            this.projectBId = projectBId;
        } else {
            this.projectAId = projectBId;
            this.projectBId = projectAId;
        }
        this.winnerProjectId = winnerProjectId;
        this.createdAt = Instant.now();
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getEventId() { return eventId; }
    public void setEventId(Long eventId) { this.eventId = eventId; }

    public Long getTrackId() { return trackId; }
    public void setTrackId(Long trackId) { this.trackId = trackId; }

    public Long getJudgeId() { return judgeId; }
    public void setJudgeId(Long judgeId) { this.judgeId = judgeId; }

    public Long getProjectAId() { return projectAId; }
    public void setProjectAId(Long projectAId) { this.projectAId = projectAId; }

    public Long getProjectBId() { return projectBId; }
    public void setProjectBId(Long projectBId) { this.projectBId = projectBId; }

    public Long getWinnerProjectId() { return winnerProjectId; }
    public void setWinnerProjectId(Long winnerProjectId) { this.winnerProjectId = winnerProjectId; }

    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
}
