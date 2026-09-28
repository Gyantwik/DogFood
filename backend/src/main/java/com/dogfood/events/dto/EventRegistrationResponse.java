package com.dogfood.events.dto;

public class EventRegistrationResponse {
    private Long eventId;
    private Long userId;
    private String role;
    private String message;

    public EventRegistrationResponse() {}

    public EventRegistrationResponse(Long eventId, Long userId, String role, String message) {
        this.eventId = eventId;
        this.userId = userId;
        this.role = role;
        this.message = message;
    }

    public Long getEventId() {
        return eventId;
    }

    public void setEventId(Long eventId) {
        this.eventId = eventId;
    }

    public Long getUserId() {
        return userId;
    }

    public void setUserId(Long userId) {
        this.userId = userId;
    }

    public String getRole() {
        return role;
    }

    public void setRole(String role) {
        this.role = role;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }
}
