package com.dogfood.judging;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "judge_tracks", uniqueConstraints = {
    @UniqueConstraint(name = "uk_judge_event_track", columnNames = {"judge_id", "track_id"})
})
public class JudgeTrack {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "event_id", nullable = false)
    private Long eventId;

    @Column(name = "judge_id", nullable = false)
    private Long judgeId;

    @Column(name = "track_id", nullable = false)
    private Long trackId;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    public JudgeTrack() {}

    public JudgeTrack(Long eventId, Long judgeId, Long trackId) {
        this.eventId = eventId;
        this.judgeId = judgeId;
        this.trackId = trackId;
        this.createdAt = Instant.now();
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getEventId() { return eventId; }
    public void setEventId(Long eventId) { this.eventId = eventId; }

    public Long getJudgeId() { return judgeId; }
    public void setJudgeId(Long judgeId) { this.judgeId = judgeId; }

    public Long getTrackId() { return trackId; }
    public void setTrackId(Long trackId) { this.trackId = trackId; }

    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
}
