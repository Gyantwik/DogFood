package com.dogfood.webhooks.dto;

import java.time.Instant;

public class WebhookDeliveryDto {

    private Long id;
    private Long webhookId;
    private Long eventId;
    private String eventType;
    private String payload;
    private Integer responseStatus;
    private String responseBody;
    private String status;
    private Instant createdAt;

    public WebhookDeliveryDto() {}

    public WebhookDeliveryDto(Long id, Long webhookId, Long eventId, String eventType, String payload, Integer responseStatus, String responseBody, String status, Instant createdAt) {
        this.id = id;
        this.webhookId = webhookId;
        this.eventId = eventId;
        this.eventType = eventType;
        this.payload = payload;
        this.responseStatus = responseStatus;
        this.responseBody = responseBody;
        this.status = status;
        this.createdAt = createdAt;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getWebhookId() { return webhookId; }
    public void setWebhookId(Long webhookId) { this.webhookId = webhookId; }

    public Long getEventId() { return eventId; }
    public void setEventId(Long eventId) { this.eventId = eventId; }

    public String getEventType() { return eventType; }
    public void setEventType(String eventType) { this.eventType = eventType; }

    public String getPayload() { return payload; }
    public void setPayload(String payload) { this.payload = payload; }

    public Integer getResponseStatus() { return responseStatus; }
    public void setResponseStatus(Integer responseStatus) { this.responseStatus = responseStatus; }

    public String getResponseBody() { return responseBody; }
    public void setResponseBody(String responseBody) { this.responseBody = responseBody; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
}
