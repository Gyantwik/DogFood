package com.dogfood.webhooks;

import com.dogfood.auth.RoleType;
import com.dogfood.common.audit.AuditLogService;
import com.dogfood.security.EventAuthorizationPolicy;
import com.dogfood.webhooks.dto.CreateWebhookRequest;
import com.dogfood.webhooks.dto.WebhookDeliveryDto;
import com.dogfood.webhooks.dto.WebhookDto;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.*;
import java.util.concurrent.CompletableFuture;
import java.util.stream.Collectors;

@Service
public class WebhookService {

    private static final Logger log = LoggerFactory.getLogger(WebhookService.class);

    private final WebhookRepository webhookRepository;
    private final WebhookDeliveryRepository deliveryRepository;
    private final EventAuthorizationPolicy authorizationPolicy;
    private final AuditLogService auditLogService;
    private final ObjectMapper objectMapper;
    private final HttpClient httpClient;

    public WebhookService(
            WebhookRepository webhookRepository,
            WebhookDeliveryRepository deliveryRepository,
            EventAuthorizationPolicy authorizationPolicy,
            AuditLogService auditLogService,
            ObjectMapper objectMapper) {
        this.webhookRepository = webhookRepository;
        this.deliveryRepository = deliveryRepository;
        this.authorizationPolicy = authorizationPolicy;
        this.auditLogService = auditLogService;
        this.objectMapper = objectMapper;
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(5))
                .build();
    }

    @Transactional
    public WebhookDto registerWebhook(Long eventId, CreateWebhookRequest request, Long userId) {
        authorizationPolicy.requireEventRole(userId, eventId, RoleType.ORGANIZER);

        String secret = request.getSecret();
        if (secret == null || secret.isBlank()) {
            secret = generateSecret();
        }

        String events = request.getEvents();
        if (events == null || events.isBlank()) {
            events = "*";
        }

        Webhook webhook = new Webhook(eventId, request.getUrl().trim(), secret.trim(), events.trim());
        webhook = webhookRepository.save(webhook);

        auditLogService.logAction(userId, eventId, "WEBHOOK_REGISTERED", "Registered webhook: " + webhook.getUrl());

        return mapToDto(webhook);
    }

    @Transactional(readOnly = true)
    public List<WebhookDto> listWebhooks(Long eventId, Long userId) {
        authorizationPolicy.requireEventRole(userId, eventId, RoleType.ORGANIZER);
        return webhookRepository.findByEventId(eventId).stream()
                .map(this::mapToDto)
                .collect(Collectors.toList());
    }

    @Transactional
    public void deleteWebhook(Long eventId, Long webhookId, Long userId) {
        authorizationPolicy.requireEventRole(userId, eventId, RoleType.ORGANIZER);
        Webhook webhook = webhookRepository.findById(webhookId)
                .orElseThrow(() -> new IllegalArgumentException("Webhook not found: " + webhookId));
        if (!webhook.getEventId().equals(eventId)) {
            throw new IllegalArgumentException("Webhook does not belong to this event");
        }
        webhookRepository.delete(webhook);
        auditLogService.logAction(userId, eventId, "WEBHOOK_DELETED", "Deleted webhook ID: " + webhookId);
    }

    @Transactional(readOnly = true)
    public List<WebhookDeliveryDto> listDeliveries(Long eventId, Long webhookId, Long userId) {
        authorizationPolicy.requireEventRole(userId, eventId, RoleType.ORGANIZER);
        List<WebhookDelivery> deliveries;
        if (webhookId != null) {
            deliveries = deliveryRepository.findByWebhookIdOrderByCreatedAtDesc(webhookId);
        } else {
            deliveries = deliveryRepository.findByEventIdOrderByCreatedAtDesc(eventId);
        }
        return deliveries.stream().map(this::mapToDeliveryDto).collect(Collectors.toList());
    }

    public void dispatch(Long eventId, String eventType, Object payloadData) {
        CompletableFuture.runAsync(() -> {
            try {
                List<Webhook> webhooks = webhookRepository.findByEventIdAndActiveTrue(eventId);
                if (webhooks.isEmpty()) {
                    return;
                }

                Map<String, Object> envelope = new LinkedHashMap<>();
                envelope.put("event", eventType);
                envelope.put("eventId", eventId);
                envelope.put("timestamp", Instant.now().toString());
                envelope.put("data", payloadData);

                String payloadJson = objectMapper.writeValueAsString(envelope);

                for (Webhook wh : webhooks) {
                    if (isSubscribed(wh.getEvents(), eventType)) {
                        deliver(wh, eventType, payloadJson);
                    }
                }
            } catch (Exception e) {
                log.error("Failed to dispatch webhooks for event {} type {}: {}", eventId, eventType, e.getMessage());
            }
        });
    }

    @Transactional
    public WebhookDeliveryDto testDelivery(Long eventId, Long webhookId, Long userId) {
        authorizationPolicy.requireEventRole(userId, eventId, RoleType.ORGANIZER);
        Webhook webhook = webhookRepository.findById(webhookId)
                .orElseThrow(() -> new IllegalArgumentException("Webhook not found: " + webhookId));
        if (!webhook.getEventId().equals(eventId)) {
            throw new IllegalArgumentException("Webhook does not belong to this event");
        }

        Map<String, Object> envelope = new LinkedHashMap<>();
        envelope.put("event", "test.ping");
        envelope.put("eventId", eventId);
        envelope.put("timestamp", Instant.now().toString());
        envelope.put("data", Map.of("message", "This is a test webhook delivery from DogFood platform"));

        try {
            String payloadJson = objectMapper.writeValueAsString(envelope);
            WebhookDelivery delivery = deliver(webhook, "test.ping", payloadJson);
            return mapToDeliveryDto(delivery);
        } catch (Exception e) {
            throw new RuntimeException("Test delivery failed: " + e.getMessage(), e);
        }
    }

    private WebhookDelivery deliver(Webhook webhook, String eventType, String payloadJson) {
        String signature = computeHmacSha256(payloadJson, webhook.getSecret());
        Integer statusCode = null;
        String responseBody = null;
        String status = "FAILED";

        try {
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(webhook.getUrl()))
                    .header("Content-Type", "application/json")
                    .header("X-DogFood-Event", eventType)
                    .header("X-DogFood-Signature", "sha256=" + signature)
                    .timeout(Duration.ofSeconds(5))
                    .POST(HttpRequest.BodyPublishers.ofString(payloadJson, StandardCharsets.UTF_8))
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            statusCode = response.statusCode();
            responseBody = response.body();
            if (responseBody != null && responseBody.length() > 2000) {
                responseBody = responseBody.substring(0, 2000) + "... [truncated]";
            }
            if (statusCode >= 200 && statusCode < 300) {
                status = "SUCCESS";
            }
        } catch (Exception e) {
            log.warn("Webhook delivery failed for url {}: {}", webhook.getUrl(), e.getMessage());
            responseBody = "Error: " + e.getMessage();
        }

        WebhookDelivery delivery = new WebhookDelivery(
                webhook.getId(),
                webhook.getEventId(),
                eventType,
                payloadJson,
                statusCode,
                responseBody,
                status
        );
        return deliveryRepository.save(delivery);
    }

    public static String computeHmacSha256(String data, String key) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            SecretKeySpec secretKeySpec = new SecretKeySpec(key.getBytes(StandardCharsets.UTF_8), "HmacSHA256");
            mac.init(secretKeySpec);
            byte[] rawHmac = mac.doFinal(data.getBytes(StandardCharsets.UTF_8));
            StringBuilder sb = new StringBuilder();
            for (byte b : rawHmac) {
                sb.append(String.format("%02x", b));
            }
            return sb.toString();
        } catch (Exception e) {
            throw new RuntimeException("Failed to calculate HMAC-SHA256", e);
        }
    }

    private boolean isSubscribed(String registeredEvents, String eventType) {
        if ("*".equals(registeredEvents) || registeredEvents == null) {
            return true;
        }
        String[] events = registeredEvents.split(",");
        for (String ev : events) {
            if (ev.trim().equalsIgnoreCase(eventType) || ev.trim().equals("*")) {
                return true;
            }
        }
        return false;
    }

    private String generateSecret() {
        SecureRandom random = new SecureRandom();
        byte[] bytes = new byte[24];
        random.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private WebhookDto mapToDto(Webhook webhook) {
        String masked = maskSecret(webhook.getSecret());
        return new WebhookDto(
                webhook.getId(),
                webhook.getEventId(),
                webhook.getUrl(),
                masked,
                webhook.getEvents(),
                webhook.getActive(),
                webhook.getCreatedAt()
        );
    }

    private WebhookDeliveryDto mapToDeliveryDto(WebhookDelivery delivery) {
        return new WebhookDeliveryDto(
                delivery.getId(),
                delivery.getWebhookId(),
                delivery.getEventId(),
                delivery.getEventType(),
                delivery.getPayload(),
                delivery.getResponseStatus(),
                delivery.getResponseBody(),
                delivery.getStatus(),
                delivery.getCreatedAt()
        );
    }

    private String maskSecret(String secret) {
        if (secret == null || secret.length() <= 6) {
            return "******";
        }
        return secret.substring(0, 3) + "..." + secret.substring(secret.length() - 3);
    }
}
