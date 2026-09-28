package com.dogfood.webhooks.dto;

import java.time.Instant;

public class WebhookDto {

    private Long id;
    private Long eventId;
    private String url;
    private String maskedSecret;
    private String events;
    private Boolean active;
    private Instant createdAt;

    public WebhookDto() {}

    public WebhookDto(Long id, Long eventId, String url, String maskedSecret, String events, Boolean active, Instant createdAt) {
        this.id = id;
        this.eventId = eventId;
        this.url = url;
        this.maskedSecret = maskedSecret;
        this.events = events;
        this.active = active;
        this.createdAt = createdAt;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getEventId() { return eventId; }
    public void setEventId(Long eventId) { this.eventId = eventId; }

    public String getUrl() { return url; }
    public void setUrl(String url) { this.url = url; }

    public String getMaskedSecret() { return maskedSecret; }
    public void setMaskedSecret(String maskedSecret) { this.maskedSecret = maskedSecret; }

    public String getEvents() { return events; }
    public void setEvents(String events) { this.events = events; }

    public Boolean getActive() { return active; }
    public void setActive(Boolean active) { this.active = active; }

    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
}
