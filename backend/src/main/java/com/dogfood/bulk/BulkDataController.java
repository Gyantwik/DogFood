package com.dogfood.bulk;

import com.dogfood.auth.RoleType;
import com.dogfood.common.ApiResponse;
import com.dogfood.common.audit.AuditLog;
import com.dogfood.common.audit.AuditLogRepository;
import com.dogfood.security.EventAuthorizationPolicy;
import com.dogfood.security.UserPrincipal;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/events/{eventId}")
public class BulkDataController {

    private final BulkDataService bulkDataService;
    private final AuditLogRepository auditLogRepository;
    private final EventAuthorizationPolicy authorizationPolicy;

    public BulkDataController(
            BulkDataService bulkDataService,
            AuditLogRepository auditLogRepository,
            EventAuthorizationPolicy authorizationPolicy) {
        this.bulkDataService = bulkDataService;
        this.auditLogRepository = auditLogRepository;
        this.authorizationPolicy = authorizationPolicy;
    }

    @GetMapping("/export/bundle")
    public ResponseEntity<ApiResponse<Map<String, Object>>> exportBundle(
            @PathVariable Long eventId,
            @AuthenticationPrincipal UserPrincipal currentUser) {
        if (currentUser == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(ApiResponse.error("Authentication required"));
        }
        Map<String, Object> bundle = bulkDataService.exportBundle(eventId, currentUser.getId());
        return ResponseEntity.ok(ApiResponse.ok("Event bundle exported successfully", bundle));
    }

    @PostMapping("/import")
    public ResponseEntity<ApiResponse<Map<String, Object>>> importBundle(
            @PathVariable Long eventId,
            @RequestBody Map<String, Object> bundle,
            @AuthenticationPrincipal UserPrincipal currentUser) {
        if (currentUser == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(ApiResponse.error("Authentication required"));
        }
        Map<String, Object> result = bulkDataService.importBundle(eventId, bundle, currentUser.getId());
        return ResponseEntity.ok(ApiResponse.ok("Event bundle imported successfully", result));
    }

    @GetMapping("/audit-logs")
    public ResponseEntity<ApiResponse<List<AuditLog>>> getAuditLogs(
            @PathVariable Long eventId,
            @AuthenticationPrincipal UserPrincipal currentUser) {
        if (currentUser == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(ApiResponse.error("Authentication required"));
        }
        authorizationPolicy.requireEventRole(currentUser.getId(), eventId, RoleType.ORGANIZER);
        List<AuditLog> logs = auditLogRepository.findByEventIdOrderByCreatedAtDesc(eventId);
        return ResponseEntity.ok(ApiResponse.ok(logs));
    }
}
