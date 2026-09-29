package com.dogfood.webhooks;

import com.dogfood.common.ApiResponse;
import com.dogfood.security.UserPrincipal;
import com.dogfood.webhooks.dto.CreateWebhookRequest;
import com.dogfood.webhooks.dto.WebhookDeliveryDto;
import com.dogfood.webhooks.dto.WebhookDto;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/events/{eventId}/webhooks")
public class WebhookController {

    private final WebhookService webhookService;

    public WebhookController(WebhookService webhookService) {
        this.webhookService = webhookService;
    }

    @PostMapping
    public ResponseEntity<ApiResponse<WebhookDto>> registerWebhook(
            @PathVariable Long eventId,
            @Valid @RequestBody CreateWebhookRequest request,
            @AuthenticationPrincipal UserPrincipal currentUser) {
        if (currentUser == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(ApiResponse.error("Authentication required"));
        }
        WebhookDto dto = webhookService.registerWebhook(eventId, request, currentUser.getId());
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok("Webhook registered successfully", dto));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<WebhookDto>>> listWebhooks(
            @PathVariable Long eventId,
            @AuthenticationPrincipal UserPrincipal currentUser) {
        if (currentUser == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(ApiResponse.error("Authentication required"));
        }
        List<WebhookDto> webhooks = webhookService.listWebhooks(eventId, currentUser.getId());
        return ResponseEntity.ok(ApiResponse.ok(webhooks));
    }

    @DeleteMapping("/{webhookId}")
    public ResponseEntity<ApiResponse<Void>> deleteWebhook(
            @PathVariable Long eventId,
            @PathVariable Long webhookId,
            @AuthenticationPrincipal UserPrincipal currentUser) {
        if (currentUser == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(ApiResponse.error("Authentication required"));
        }
        webhookService.deleteWebhook(eventId, webhookId, currentUser.getId());
        return ResponseEntity.ok(ApiResponse.ok("Webhook deleted successfully", null));
    }

    @GetMapping("/{webhookId}/deliveries")
    public ResponseEntity<ApiResponse<List<WebhookDeliveryDto>>> listDeliveries(
            @PathVariable Long eventId,
            @PathVariable Long webhookId,
            @AuthenticationPrincipal UserPrincipal currentUser) {
        if (currentUser == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(ApiResponse.error("Authentication required"));
        }
        List<WebhookDeliveryDto> deliveries = webhookService.listDeliveries(eventId, webhookId, currentUser.getId());
        return ResponseEntity.ok(ApiResponse.ok(deliveries));
    }

    @PostMapping("/{webhookId}/test")
    public ResponseEntity<ApiResponse<WebhookDeliveryDto>> testWebhook(
            @PathVariable Long eventId,
            @PathVariable Long webhookId,
            @RequestParam(required = false, defaultValue = "test.ping") String event,
            @AuthenticationPrincipal UserPrincipal currentUser) {
        if (currentUser == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(ApiResponse.error("Authentication required"));
        }
        WebhookDeliveryDto delivery = webhookService.testDelivery(eventId, webhookId, event, currentUser.getId());
        return ResponseEntity.ok(ApiResponse.ok("Test webhook dispatched", delivery));
    }

    @PostMapping("/{webhookId}/deliveries/{deliveryId}/retry")
    public ResponseEntity<ApiResponse<WebhookDeliveryDto>> retryDelivery(
            @PathVariable Long eventId,
            @PathVariable Long webhookId,
            @PathVariable Long deliveryId,
            @AuthenticationPrincipal UserPrincipal currentUser) {
        if (currentUser == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(ApiResponse.error("Authentication required"));
        }
        WebhookDeliveryDto delivery = webhookService.retryDelivery(eventId, webhookId, deliveryId, currentUser.getId());
        return ResponseEntity.ok(ApiResponse.ok("Webhook delivery retried successfully", delivery));
    }
}
