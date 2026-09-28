package com.dogfood.teams.dto;

import java.time.Instant;
import java.util.List;

public class TeamResponse {

    private Long id;
    private Long eventId;
    private String name;
    private String inviteCode;
    private Long leaderId;
    private List<TeamMemberDto> members;
    private Instant createdAt;

    public TeamResponse() {}

    public TeamResponse(Long id, Long eventId, String name, String inviteCode, Long leaderId, List<TeamMemberDto> members, Instant createdAt) {
        this.id = id;
        this.eventId = eventId;
        this.name = name;
        this.inviteCode = inviteCode;
        this.leaderId = leaderId;
        this.members = members;
        this.createdAt = createdAt;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getEventId() { return eventId; }
    public void setEventId(Long eventId) { this.eventId = eventId; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getInviteCode() { return inviteCode; }
    public void setInviteCode(String inviteCode) { this.inviteCode = inviteCode; }

    public Long getLeaderId() { return leaderId; }
    public void setLeaderId(Long leaderId) { this.leaderId = leaderId; }

    public List<TeamMemberDto> getMembers() { return members; }
    public void setMembers(List<TeamMemberDto> members) { this.members = members; }

    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
}
