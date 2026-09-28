package com.dogfood.auth.dto;

import java.util.Map;

public class UserProfileResponse {

    private AuthResponse.UserDto user;
    private Map<Long, String> rolesByEvent;

    public UserProfileResponse() {}

    public UserProfileResponse(AuthResponse.UserDto user, Map<Long, String> rolesByEvent) {
        this.user = user;
        this.rolesByEvent = rolesByEvent;
    }

    public AuthResponse.UserDto getUser() { return user; }
    public void setUser(AuthResponse.UserDto user) { this.user = user; }

    public Map<Long, String> getRolesByEvent() { return rolesByEvent; }
    public void setRolesByEvent(Map<Long, String> rolesByEvent) { this.rolesByEvent = rolesByEvent; }
}
