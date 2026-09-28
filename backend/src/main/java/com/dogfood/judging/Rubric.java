package com.dogfood.judging;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "rubrics", uniqueConstraints = {
    @UniqueConstraint(name = "uk_event_rubric", columnNames = {"event_id"})
})
public class Rubric {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "event_id", nullable = false)
    private Long eventId;

    @Column(nullable = false)
    private boolean locked = false;

    @OneToMany(mappedBy = "rubric", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    private List<RubricCriterion> criteria = new ArrayList<>();

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    public Rubric() {}

    public Rubric(Long eventId, boolean locked) {
        this.eventId = eventId;
        this.locked = locked;
        this.createdAt = Instant.now();
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getEventId() { return eventId; }
    public void setEventId(Long eventId) { this.eventId = eventId; }

    public boolean isLocked() { return locked; }
    public void setLocked(boolean locked) { this.locked = locked; }

    public List<RubricCriterion> getCriteria() { return criteria; }
    public void setCriteria(List<RubricCriterion> criteria) { this.criteria = criteria; }

    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
}
