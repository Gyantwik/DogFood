package com.dogfood.webhooks;

import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Deque;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.ConcurrentLinkedDeque;

@Component
public class MockWebhookReceiver {

    public static class ReceivedItem {
        private String id = UUID.randomUUID().toString();
        private String event;
        private String signature;
        private String contentType;
        private String payload;
        private Instant receivedAt = Instant.now();

        public ReceivedItem() {}

        public ReceivedItem(String event, String signature, String contentType, String payload) {
            this.event = event;
            this.signature = signature;
            this.contentType = contentType;
            this.payload = payload;
            this.receivedAt = Instant.now();
        }

        public String getId() { return id; }
        public String getEvent() { return event; }
        public String getSignature() { return signature; }
        public String getContentType() { return contentType; }
        public String getPayload() { return payload; }
        public Instant getReceivedAt() { return receivedAt; }
    }

    private final Deque<ReceivedItem> receivedItems = new ConcurrentLinkedDeque<>();
    private static final int MAX_ITEMS = 50;

    public ReceivedItem record(String event, String signature, String contentType, String payload) {
        ReceivedItem item = new ReceivedItem(event, signature, contentType, payload);
        receivedItems.addFirst(item);
        while (receivedItems.size() > MAX_ITEMS) {
            receivedItems.removeLast();
        }
        return item;
    }

    public List<ReceivedItem> getReceived() {
        return new ArrayList<>(receivedItems);
    }

    public void clear() {
        receivedItems.clear();
    }
}
