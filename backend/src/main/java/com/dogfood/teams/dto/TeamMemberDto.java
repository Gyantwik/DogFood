package com.dogfood.teams.dto;

import java.time.Instant;

public class TeamMemberDto {

    private Long userId;
    private String username;
    private String email;
    private boolean isLeader;
    private Instant joinedAt;

    public TeamMemberDto() {}

    public TeamMemberDto(Long userId, String username, String email, boolean isLeader, Instant joinedAt) {
        this.userId = userId;
        this.username = username;
        this.email = email;
        this.isLeader = isLeader;
        this.joinedAt = joinedAt;
    }

    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }

    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public boolean isLeader() { return isLeader; }
    public void setLeader(boolean leader) { isLeader = leader; }

    public Instant getJoinedAt() { return joinedAt; }
    public void setJoinedAt(Instant joinedAt) { this.joinedAt = joinedAt; }
}
