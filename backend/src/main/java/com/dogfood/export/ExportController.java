package com.dogfood.export;

import com.dogfood.auth.RoleType;
import com.dogfood.common.audit.AuditLogService;
import com.dogfood.security.EventAuthorizationPolicy;
import com.dogfood.security.UserPrincipal;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/events/{eventId}/export")
public class ExportController {

    private final CsvExportService csvExportService;
    private final EventAuthorizationPolicy authorizationPolicy;
    private final AuditLogService auditLogService;

    public ExportController(
            CsvExportService csvExportService,
            EventAuthorizationPolicy authorizationPolicy,
            AuditLogService auditLogService) {
        this.csvExportService = csvExportService;
        this.authorizationPolicy = authorizationPolicy;
        this.auditLogService = auditLogService;
    }

    @GetMapping({"/submissions", "/submissions.csv"})
    public ResponseEntity<byte[]> exportSubmissions(
            @PathVariable Long eventId,
            @AuthenticationPrincipal UserPrincipal currentUser) {
        if (currentUser == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        authorizationPolicy.requireEventRole(currentUser.getId(), eventId, RoleType.ORGANIZER);
        byte[] csvData = csvExportService.exportSubmissionsCsv(eventId);
        auditLogService.logAction(currentUser.getId(), eventId, "EXPORT_CSV", "Exported submissions CSV for event " + eventId);

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"event_" + eventId + "_submissions.csv\"")
                .contentType(MediaType.parseMediaType("text/csv"))
                .body(csvData);
    }

    @GetMapping({"/scores", "/scores.csv"})
    public ResponseEntity<byte[]> exportScores(
            @PathVariable Long eventId,
            @AuthenticationPrincipal UserPrincipal currentUser) {
        if (currentUser == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        authorizationPolicy.requireEventRole(currentUser.getId(), eventId, RoleType.ORGANIZER);
        byte[] csvData = csvExportService.exportScoresCsv(eventId);
        auditLogService.logAction(currentUser.getId(), eventId, "EXPORT_CSV", "Exported scores CSV for event " + eventId);

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"event_" + eventId + "_scores.csv\"")
                .contentType(MediaType.parseMediaType("text/csv"))
                .body(csvData);
    }

    @GetMapping({"/results", "/results.csv"})
    public ResponseEntity<byte[]> exportResults(
            @PathVariable Long eventId,
            @AuthenticationPrincipal UserPrincipal currentUser) {
        if (currentUser == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        authorizationPolicy.requireEventRole(currentUser.getId(), eventId, RoleType.ORGANIZER);
        byte[] csvData = csvExportService.exportResultsCsv(eventId);
        auditLogService.logAction(currentUser.getId(), eventId, "EXPORT_CSV", "Exported results CSV for event " + eventId);

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"event_" + eventId + "_results.csv\"")
                .contentType(MediaType.parseMediaType("text/csv"))
                .body(csvData);
    }
}
