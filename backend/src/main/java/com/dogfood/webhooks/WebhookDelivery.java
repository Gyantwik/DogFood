package com.dogfood.webhooks;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "webhook_deliveries")
public class WebhookDelivery {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "webhook_id")
    private Long webhookId;

    @Column(name = "event_id", nullable = false)
    private Long eventId;

    @Column(name = "event_type", nullable = false)
    private String eventType;

    @Column(name = "payload", nullable = false, columnDefinition = "TEXT")
    private String payload;

    @Column(name = "response_status")
    private Integer responseStatus;

    @Column(name = "response_body", columnDefinition = "TEXT")
    private String responseBody;

    @Column(name = "status", nullable = false)
    private String status; // 'SUCCESS', 'FAILED'

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    public WebhookDelivery() {}

    public WebhookDelivery(Long webhookId, Long eventId, String eventType, String payload, Integer responseStatus, String responseBody, String status) {
        this.webhookId = webhookId;
        this.eventId = eventId;
        this.eventType = eventType;
        this.payload = payload;
        this.responseStatus = responseStatus;
        this.responseBody = responseBody;
        this.status = status;
        this.createdAt = Instant.now();
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
