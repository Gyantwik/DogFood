package com.dogfood.teams.dto;

import jakarta.validation.constraints.NotBlank;

public class JoinTeamRequest {

    @NotBlank(message = "Invite code is required")
    private String inviteCode;

    public JoinTeamRequest() {}

    public JoinTeamRequest(String inviteCode) {
        this.inviteCode = inviteCode;
    }

    public String getInviteCode() { return inviteCode; }
    public void setInviteCode(String inviteCode) { this.inviteCode = inviteCode; }
}
