package com.dogfood.webhooks;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface WebhookRepository extends JpaRepository<Webhook, Long> {
    List<Webhook> findByEventId(Long eventId);
    List<Webhook> findByEventIdAndActiveTrue(Long eventId);
}
