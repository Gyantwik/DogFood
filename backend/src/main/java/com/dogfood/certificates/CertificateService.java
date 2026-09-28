package com.dogfood.certificates;

import com.dogfood.auth.RoleType;
import com.dogfood.auth.User;
import com.dogfood.auth.UserRepository;
import com.dogfood.certificates.dto.CertificateDto;
import com.dogfood.certificates.dto.CertificateVerificationResponse;
import com.dogfood.common.audit.AuditLogService;
import com.dogfood.events.Event;
import com.dogfood.events.EventRepository;
import com.dogfood.events.Submission;
import com.dogfood.events.SubmissionRepository;
import com.dogfood.normalization.LeaderboardEntryDto;
import com.dogfood.normalization.ZScoreNormalizationService;
import com.dogfood.security.EventAuthorizationPolicy;
import com.dogfood.teams.TeamMember;
import com.dogfood.teams.TeamMemberRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class CertificateService {

    private final CertificateRepository certificateRepository;
    private final EventRepository eventRepository;
    private final SubmissionRepository submissionRepository;
    private final UserRepository userRepository;
    private final TeamMemberRepository teamMemberRepository;
    private final ZScoreNormalizationService normalizationService;
    private final EventAuthorizationPolicy authorizationPolicy;
    private final AuditLogService auditLogService;

    public CertificateService(
            CertificateRepository certificateRepository,
            EventRepository eventRepository,
            SubmissionRepository submissionRepository,
            UserRepository userRepository,
            TeamMemberRepository teamMemberRepository,
            ZScoreNormalizationService normalizationService,
            EventAuthorizationPolicy authorizationPolicy,
            AuditLogService auditLogService) {
        this.certificateRepository = certificateRepository;
        this.eventRepository = eventRepository;
        this.submissionRepository = submissionRepository;
        this.userRepository = userRepository;
        this.teamMemberRepository = teamMemberRepository;
        this.normalizationService = normalizationService;
        this.authorizationPolicy = authorizationPolicy;
        this.auditLogService = auditLogService;
    }

    @Transactional
    public List<CertificateDto> generateCertificatesForEvent(Long eventId, Long organizerUserId) {
        authorizationPolicy.requireEventRole(organizerUserId, eventId, RoleType.ORGANIZER);

        Event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new IllegalArgumentException("Event not found: " + eventId));

        List<Submission> submissions = submissionRepository.findByEventIdAndStatus(eventId, "SUBMITTED");
        Set<Long> participantUserIds = new HashSet<>();

        for (Submission sub : submissions) {
            if (sub.getTeamId() != null) {
                List<TeamMember> members = teamMemberRepository.findByTeamId(sub.getTeamId());
                for (TeamMember m : members) {
                    if (m.getUserId() != null) participantUserIds.add(m.getUserId());
                }
            }
            if (sub.getCreatedBy() != null) {
                participantUserIds.add(sub.getCreatedBy());
            }
        }

        // Generate participation certificates
        for (Long uId : participantUserIds) {
            User user = userRepository.findById(uId).orElse(null);
            if (user == null) continue;

            String certId = "CERT-PART-" + eventId + "-" + user.getId();
            String recipientName = user.getUsername();
            String awardTitle = "Certificate of Participation - " + event.getName();

            if (!certificateRepository.existsByCertificateId(certId)) {
                String hash = computeSha256(certId + ":" + recipientName + ":" + eventId + ":" + awardTitle);
                Certificate cert = new Certificate(
                        certId,
                        eventId,
                        user.getId(),
                        recipientName,
                        user.getEmail(),
                        "PARTICIPANT",
                        awardTitle,
                        hash
                );
                certificateRepository.save(cert);
            }
        }

        // Generate winner certificates from leaderboard
        try {
            List<LeaderboardEntryDto> leaderboard = normalizationService.getLeaderboard(eventId, "raw");
            int rank = 1;
            for (LeaderboardEntryDto entry : leaderboard) {
                if (rank > 3) break;
                Submission sub = submissionRepository.findById(entry.getSubmissionId()).orElse(null);
                if (sub != null) {
                    String awardTitle = (rank == 1 ? "1st Place Winner" : (rank == 2 ? "2nd Place Winner" : "3rd Place Winner")) + " - " + event.getName();

                    Set<Long> winnerUserIds = new HashSet<>();
                    if (sub.getTeamId() != null) {
                        List<TeamMember> members = teamMemberRepository.findByTeamId(sub.getTeamId());
                        for (TeamMember m : members) {
                            if (m.getUserId() != null) winnerUserIds.add(m.getUserId());
                        }
                    }
                    if (sub.getCreatedBy() != null) {
                        winnerUserIds.add(sub.getCreatedBy());
                    }

                    for (Long wId : winnerUserIds) {
                        User wUser = userRepository.findById(wId).orElse(null);
                        if (wUser == null) continue;

                        String certId = "CERT-WIN-" + eventId + "-R" + rank + "-" + wUser.getId();
                        String recipientName = wUser.getUsername();

                        if (!certificateRepository.existsByCertificateId(certId)) {
                            String hash = computeSha256(certId + ":" + recipientName + ":" + eventId + ":" + awardTitle);
                            Certificate cert = new Certificate(
                                    certId,
                                    eventId,
                                    wUser.getId(),
                                    recipientName,
                                    wUser.getEmail(),
                                    "WINNER",
                                    awardTitle,
                                    hash
                            );
                            certificateRepository.save(cert);
                        }
                    }
                }
                rank++;
            }
        } catch (Exception e) {
            // Leaderboard might not have scores yet
        }

        auditLogService.logAction(organizerUserId, eventId, "CERTIFICATES_GENERATED", "Generated participant and winner certificates for event: " + event.getName());

        return listCertificatesForEvent(eventId);
    }

    @Transactional(readOnly = true)
    public CertificateVerificationResponse verifyCertificate(String certificateId) {
        if (certificateId == null || certificateId.isBlank()) {
            return CertificateVerificationResponse.invalid(certificateId, "Certificate ID cannot be blank");
        }

        Optional<Certificate> opt = certificateRepository.findByCertificateId(certificateId.trim());
        if (opt.isEmpty()) {
            return CertificateVerificationResponse.invalid(certificateId, "Certificate not found in registry");
        }

        Certificate cert = opt.get();
        String expectedHash = computeSha256(cert.getCertificateId() + ":" + cert.getRecipientName() + ":" + cert.getEventId() + ":" + cert.getAwardTitle());

        if (!expectedHash.equalsIgnoreCase(cert.getVerificationHash())) {
            return CertificateVerificationResponse.invalid(certificateId, "Certificate verification hash mismatch! Record may have been tampered with.");
        }

        String eventName = eventRepository.findById(cert.getEventId())
                .map(Event::getName)
                .orElse("DogFood Hackathon");

        CertificateDto dto = new CertificateDto(
                cert.getCertificateId(),
                cert.getEventId(),
                eventName,
                cert.getRecipientId(),
                cert.getRecipientName(),
                cert.getRecipientEmail(),
                cert.getRecipientType(),
                cert.getAwardTitle(),
                cert.getVerificationHash(),
                cert.getCreatedAt()
        );

        return CertificateVerificationResponse.valid(dto);
    }

    @Transactional(readOnly = true)
    public List<CertificateDto> listCertificatesForEvent(Long eventId) {
        String eventName = eventRepository.findById(eventId)
                .map(Event::getName)
                .orElse("Event " + eventId);

        return certificateRepository.findByEventId(eventId).stream()
                .map(cert -> new CertificateDto(
                        cert.getCertificateId(),
                        cert.getEventId(),
                        eventName,
                        cert.getRecipientId(),
                        cert.getRecipientName(),
                        cert.getRecipientEmail(),
                        cert.getRecipientType(),
                        cert.getAwardTitle(),
                        cert.getVerificationHash(),
                        cert.getCreatedAt()
                ))
                .collect(Collectors.toList());
    }

    public static String computeSha256(String input) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(input.getBytes(StandardCharsets.UTF_8));
            StringBuilder hexString = new StringBuilder();
            for (byte b : hash) {
                String hex = Integer.toHexString(0xff & b);
                if (hex.length() == 1) hexString.append('0');
                hexString.append(hex);
            }
            return hexString.toString();
        } catch (NoSuchAlgorithmException e) {
            throw new RuntimeException("SHA-256 algorithm not available", e);
        }
    }
}
