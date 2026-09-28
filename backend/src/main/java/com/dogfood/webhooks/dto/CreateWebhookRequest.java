package com.dogfood.webhooks.dto;

import jakarta.validation.constraints.NotBlank;

public class CreateWebhookRequest {

    @NotBlank(message = "Webhook URL is required")
    private String url;

    private String secret;
    private String events;

    public CreateWebhookRequest() {}

    public CreateWebhookRequest(String url, String secret, String events) {
        this.url = url;
        this.secret = secret;
        this.events = events;
    }

    public String getUrl() { return url; }
    public void setUrl(String url) { this.url = url; }

    public String getSecret() { return secret; }
    public void setSecret(String secret) { this.secret = secret; }

    public String getEvents() { return events; }
    public void setEvents(String events) { this.events = events; }
}
