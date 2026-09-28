package com.dogfood.common.audit;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface AuditLogRepository extends JpaRepository<AuditLog, Long> {
    List<AuditLog> findByEventIdOrderByCreatedAtDesc(Long eventId);
    List<AuditLog> findByUserIdOrderByCreatedAtDesc(Long userId);
    List<AuditLog> findTop10ByOrderByCreatedAtDesc();
}
