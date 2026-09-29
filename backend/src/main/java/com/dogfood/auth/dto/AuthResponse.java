package com.dogfood.auth.dto;

import java.util.Map;

public class AuthResponse {

    private String token;
    private UserDto user;
    private Map<Long, String> rolesByEvent;

    public AuthResponse() {}

    public AuthResponse(String token, UserDto user, Map<Long, String> rolesByEvent) {
        this.token = token;
        this.user = user;
        this.rolesByEvent = rolesByEvent;
    }

    public String getToken() { return token; }
    public void setToken(String token) { this.token = token; }

    public UserDto getUser() { return user; }
    public void setUser(UserDto user) { this.user = user; }

    public Map<Long, String> getRolesByEvent() { return rolesByEvent; }
    public void setRolesByEvent(Map<Long, String> rolesByEvent) { this.rolesByEvent = rolesByEvent; }

    public static class UserDto {
        private Long id;
        private String username;
        private String email;
        private String phone;

        public UserDto() {}

        public UserDto(Long id, String username, String email) {
            this.id = id;
            this.username = username;
            this.email = email;
        }

        public Long getId() { return id; }
        public void setId(Long id) { this.id = id; }

        public String getUsername() { return username; }
        public void setUsername(String username) { this.username = username; }

        public String getEmail() { return email; }
        public void setEmail(String email) { this.email = email; }

        public String getPhone() { return phone; }
        public void setPhone(String phone) { this.phone = phone; }
    }
}
