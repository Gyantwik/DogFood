package com.dogfood.webhooks;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface WebhookDeliveryRepository extends JpaRepository<WebhookDelivery, Long> {
    List<WebhookDelivery> findByEventIdOrderByCreatedAtDesc(Long eventId);
    List<WebhookDelivery> findByWebhookIdOrderByCreatedAtDesc(Long webhookId);
}
