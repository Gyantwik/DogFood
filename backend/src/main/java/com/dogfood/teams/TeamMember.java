package com.dogfood.teams;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "team_members", uniqueConstraints = {
    @UniqueConstraint(name = "uk_team_user", columnNames = {"team_id", "user_id"})
})
public class TeamMember {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "team_id", nullable = false)
    private Team team;

    @Column(name = "team_id", insertable = false, updatable = false)
    private Long teamId;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "joined_at", nullable = false, updatable = false)
    private Instant joinedAt = Instant.now();

    public TeamMember() {}

    public TeamMember(Team team, Long userId) {
        this.team = team;
        this.teamId = team != null ? team.getId() : null;
        this.userId = userId;
        this.joinedAt = Instant.now();
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Team getTeam() { return team; }
    public void setTeam(Team team) {
        this.team = team;
        if (team != null) this.teamId = team.getId();
    }

    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }

    public Long getTeamId() { return teamId != null ? teamId : (team != null ? team.getId() : null); }

    public Instant getJoinedAt() { return joinedAt; }
    public void setJoinedAt(Instant joinedAt) { this.joinedAt = joinedAt; }
}
