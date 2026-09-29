package com.dogfood.webhooks;

import com.dogfood.common.ApiResponse;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.BufferedReader;
import java.io.IOException;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/webhooks")
public class WebhookReceiverController {

    private final MockWebhookReceiver mockWebhookReceiver;

    public WebhookReceiverController(MockWebhookReceiver mockWebhookReceiver) {
        this.mockWebhookReceiver = mockWebhookReceiver;
    }

    @PostMapping("/receiver")
    public ResponseEntity<Map<String, Object>> receiveWebhook(
            HttpServletRequest request,
            @RequestBody(required = false) String payload) {
        String event = request.getHeader("X-DogFood-Event");
        if (event == null) event = "unknown";

        String signature = request.getHeader("X-DogFood-Signature");
        if (signature == null) signature = "none";

        String contentType = request.getContentType();
        if (contentType == null) contentType = "application/json";

        String body = payload != null ? payload : "{}";

        MockWebhookReceiver.ReceivedItem item = mockWebhookReceiver.record(event, signature, contentType, body);

        return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Webhook received by DogFood Local Test Receiver",
                "id", item.getId(),
                "event", item.getEvent(),
                "signature", item.getSignature(),
                "receivedAt", item.getReceivedAt().toString()
        ));
    }

    @GetMapping("/received")
    public ResponseEntity<ApiResponse<List<MockWebhookReceiver.ReceivedItem>>> getReceived() {
        return ResponseEntity.ok(ApiResponse.ok(mockWebhookReceiver.getReceived()));
    }

    @DeleteMapping("/received")
    public ResponseEntity<ApiResponse<Void>> clearReceived() {
        mockWebhookReceiver.clear();
        return ResponseEntity.ok(ApiResponse.ok("Local webhook receiver buffer cleared", null));
    }
}
