package com.dogfood.judging;

import java.time.Instant;
import java.util.List;

public class RubricResponse {

    private Long id;
    private Long eventId;
    private boolean locked;
    private List<RubricCriterionDto> criteria;
    private Instant createdAt;

    public RubricResponse() {}

    public RubricResponse(Long id, Long eventId, boolean locked, List<RubricCriterionDto> criteria) {
        this.id = id;
        this.eventId = eventId;
        this.locked = locked;
        this.criteria = criteria;
        this.createdAt = Instant.now();
    }

    public RubricResponse(Long id, Long eventId, boolean locked, List<RubricCriterionDto> criteria, Instant createdAt) {
        this.id = id;
        this.eventId = eventId;
        this.locked = locked;
        this.criteria = criteria;
        this.createdAt = createdAt;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getEventId() { return eventId; }
    public void setEventId(Long eventId) { this.eventId = eventId; }

    public boolean isLocked() { return locked; }
    public void setLocked(boolean locked) { this.locked = locked; }

    public List<RubricCriterionDto> getCriteria() { return criteria; }
    public void setCriteria(List<RubricCriterionDto> criteria) { this.criteria = criteria; }

    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
}
