package com.dogfood.certificates;

import com.dogfood.certificates.dto.*;
import com.dogfood.common.ApiResponse;
import com.dogfood.security.UserPrincipal;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
public class VerificationController {

    private final CertificateService certificateService;
    private final JudgeRecordService judgeRecordService;

    public VerificationController(CertificateService certificateService, JudgeRecordService judgeRecordService) {
        this.certificateService = certificateService;
        this.judgeRecordService = judgeRecordService;
    }

    // Public Certificate Verification Endpoint
    @GetMapping("/api/certificates/{certificateId}")
    public ResponseEntity<ApiResponse<CertificateVerificationResponse>> verifyCertificate(
            @PathVariable String certificateId) {
        CertificateVerificationResponse res = certificateService.verifyCertificate(certificateId);
        if (!res.isValid()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(ApiResponse.error(res.getMessage()));
        }
        return ResponseEntity.ok(ApiResponse.ok(res));
    }

    // Public Signed Judge Record Verification Endpoint
    @PostMapping("/api/verify/judge-record")
    public ResponseEntity<ApiResponse<JudgeRecordVerificationResponse>> verifyJudgeRecord(
            @Valid @RequestBody JudgeRecordVerificationRequest request) {
        JudgeRecordVerificationResponse res = judgeRecordService.verifyJudgeRecord(request);
        if (!res.isValid()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(ApiResponse.error(res.getMessage()));
        }
        return ResponseEntity.ok(ApiResponse.ok(res));
    }

    // Public endpoint to obtain a valid sample judge participation record for verification demonstrations
    @GetMapping({"/api/verify/judge-record/sample", "/api/verify/judge-record/demo"})
    public ResponseEntity<ApiResponse<JudgeRecordDto>> getSampleJudgeRecord(
            @RequestParam(required = false, defaultValue = "1") Long eventId,
            @RequestParam(required = false) Long judgeId) {
        JudgeRecordDto record = judgeRecordService.generateSampleJudgeRecord(eventId, judgeId);
        return ResponseEntity.ok(ApiResponse.ok("Sample authentic judge record generated", record));
    }

    // Organizer generates certificates for an event
    @PostMapping("/api/events/{eventId}/certificates/generate")
    public ResponseEntity<ApiResponse<List<CertificateDto>>> generateCertificates(
            @PathVariable Long eventId,
            @AuthenticationPrincipal UserPrincipal currentUser) {
        if (currentUser == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(ApiResponse.error("Authentication required"));
        }
        List<CertificateDto> certs = certificateService.generateCertificatesForEvent(eventId, currentUser.getId());
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok("Certificates generated successfully", certs));
    }

    // List certificates for an event
    @GetMapping("/api/events/{eventId}/certificates")
    public ResponseEntity<ApiResponse<List<CertificateDto>>> listCertificates(
            @PathVariable Long eventId) {
        List<CertificateDto> certs = certificateService.listCertificatesForEvent(eventId);
        return ResponseEntity.ok(ApiResponse.ok(certs));
    }

    // Authenticated user fetches all certificates issued to them
    @GetMapping({"/api/certificates/me", "/api/users/me/certificates"})
    public ResponseEntity<ApiResponse<List<CertificateDto>>> getMyCertificates(
            @AuthenticationPrincipal UserPrincipal currentUser) {
        if (currentUser == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(ApiResponse.error("Authentication required"));
        }
        List<CertificateDto> certs = certificateService.listCertificatesForUser(currentUser.getId());
        return ResponseEntity.ok(ApiResponse.ok(certs));
    }

    // Judge fetches their own signed participation record
    @GetMapping("/api/events/{eventId}/judges/me/record")
    public ResponseEntity<ApiResponse<JudgeRecordDto>> getMyJudgeRecord(
            @PathVariable Long eventId,
            @AuthenticationPrincipal UserPrincipal currentUser) {
        if (currentUser == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(ApiResponse.error("Authentication required"));
        }
        JudgeRecordDto record = judgeRecordService.generateJudgeRecord(eventId, currentUser.getId());
        return ResponseEntity.ok(ApiResponse.ok(record));
    }
}
