package com.dogfood.common.audit;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuditLogService {

    private static final Logger log = LoggerFactory.getLogger(AuditLogService.class);
    private final AuditLogRepository auditLogRepository;

    public AuditLogService(AuditLogRepository auditLogRepository) {
        this.auditLogRepository = auditLogRepository;
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void logAction(Long userId, Long eventId, String action, String details, String ipAddress) {
        try {
            AuditLog entry = new AuditLog(userId, eventId, action, details, ipAddress);
            auditLogRepository.saveAndFlush(entry);
        } catch (Exception e) {
            try {
                AuditLog fallback = new AuditLog(null, eventId, action, details + (userId != null ? " (user: " + userId + ")" : ""), ipAddress);
                auditLogRepository.save(fallback);
            } catch (Exception ignored) {}
        }
        log.info("[AUDIT] User: {} | Event: {} | Action: {} | Details: {}", userId, eventId, action, details);
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void logAction(Long userId, Long eventId, String action, String details) {
        logAction(userId, eventId, action, details, null);
    }

    public java.util.List<AuditLog> getRecentLogs() {
        return auditLogRepository.findTop10ByOrderByCreatedAtDesc();
    }

    public java.util.List<AuditLog> getLogsForEvent(Long eventId) {
        return auditLogRepository.findByEventIdOrderByCreatedAtDesc(eventId);
    }
}
