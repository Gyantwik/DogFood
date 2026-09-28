package com.dogfood.auth;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "event_roles", uniqueConstraints = {
    @UniqueConstraint(name = "uk_user_event_role", columnNames = {"user_id", "event_id", "role"})
})
public class EventRole {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "event_id", nullable = false)
    private Long eventId;

    @Enumerated(EnumType.STRING)
    @Column(name = "role", nullable = false, length = 50)
    private RoleType role;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    public EventRole() {}

    public EventRole(User user, Long eventId, RoleType role) {
        this.user = user;
        this.eventId = eventId;
        this.role = role;
        this.createdAt = Instant.now();
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public User getUser() { return user; }
    public void setUser(User user) { this.user = user; }

    public Long getEventId() { return eventId; }
    public void setEventId(Long eventId) { this.eventId = eventId; }

    public RoleType getRole() { return role; }
    public void setRole(RoleType role) { this.role = role; }

    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
}
