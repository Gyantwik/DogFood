package com.dogfood.certificates;

import com.dogfood.auth.RoleType;
import com.dogfood.auth.User;
import com.dogfood.auth.UserRepository;
import com.dogfood.certificates.dto.JudgeRecordDto;
import com.dogfood.certificates.dto.JudgeRecordVerificationRequest;
import com.dogfood.certificates.dto.JudgeRecordVerificationResponse;
import com.dogfood.events.Event;
import com.dogfood.events.EventRepository;
import com.dogfood.judging.JudgeAssignmentRepository;
import com.dogfood.security.EventAuthorizationPolicy;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;

@Service
public class JudgeRecordService {

    private static final String SIGNING_KEY = "DogFoodJudgeRecordCryptographicKeySecret2026";

    private final JudgeAssignmentRepository judgeAssignmentRepository;
    private final EventRepository eventRepository;
    private final UserRepository userRepository;
    private final EventAuthorizationPolicy authorizationPolicy;

    public JudgeRecordService(
            JudgeAssignmentRepository judgeAssignmentRepository,
            EventRepository eventRepository,
            UserRepository userRepository,
            EventAuthorizationPolicy authorizationPolicy) {
        this.judgeAssignmentRepository = judgeAssignmentRepository;
        this.eventRepository = eventRepository;
        this.userRepository = userRepository;
        this.authorizationPolicy = authorizationPolicy;
    }

    @Transactional(readOnly = true)
    public JudgeRecordDto generateJudgeRecord(Long eventId, Long judgeUserId) {
        Event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new IllegalArgumentException("Event not found: " + eventId));

        User user = userRepository.findById(judgeUserId)
                .orElseThrow(() -> new IllegalArgumentException("User not found: " + judgeUserId));

        boolean isJudge = authorizationPolicy.hasEventRole(judgeUserId, eventId, RoleType.JUDGE) ||
                          authorizationPolicy.hasEventRole(judgeUserId, eventId, RoleType.ORGANIZER) ||
                          authorizationPolicy.hasEventRole(judgeUserId, eventId, RoleType.ADMIN);

        if (!isJudge) {
            throw new AccessDeniedException("User is not a judge for this event");
        }

        long completedCount = judgeAssignmentRepository.countByEventIdAndJudgeIdAndStatus(eventId, judgeUserId, "COMPLETED");
        Instant now = Instant.now();

        String payload = buildPayload(judgeUserId, eventId, (int) completedCount, now.toString());
        String signature = computeHmacSha256(payload, SIGNING_KEY);

        String judgeName = user.getUsername();

        return new JudgeRecordDto(
                judgeUserId,
                judgeName,
                eventId,
                event.getName(),
                (int) completedCount,
                now,
                signature
        );
    }

    @Transactional(readOnly = true)
    public JudgeRecordVerificationResponse verifyJudgeRecord(JudgeRecordVerificationRequest request) {
        if (request.getSignature() == null || request.getSignature().isBlank()) {
            return JudgeRecordVerificationResponse.invalid("Signature is missing");
        }

        String payload = buildPayload(request.getJudgeId(), request.getEventId(), request.getEvaluatedCount(), request.getCompletedAt());
        String expectedSignature = computeHmacSha256(payload, SIGNING_KEY);

        byte[] expectedBytes = expectedSignature.getBytes(StandardCharsets.UTF_8);
        byte[] actualBytes = request.getSignature().trim().getBytes(StandardCharsets.UTF_8);

        if (!MessageDigest.isEqual(expectedBytes, actualBytes)) {
            return JudgeRecordVerificationResponse.invalid("Cryptographic signature mismatch! The judge record has been modified or falsified.");
        }

        String eventName = eventRepository.findById(request.getEventId())
                .map(Event::getName)
                .orElse("Event " + request.getEventId());

        String judgeName = userRepository.findById(request.getJudgeId())
                .map(User::getUsername)
                .orElse("Judge #" + request.getJudgeId());

        return JudgeRecordVerificationResponse.valid(
                request.getJudgeId(),
                judgeName,
                request.getEventId(),
                eventName,
                request.getEvaluatedCount(),
                request.getCompletedAt()
        );
    }

    private String buildPayload(Long judgeId, Long eventId, int evaluatedCount, String completedAt) {
        return "judge:" + judgeId + "|event:" + eventId + "|evalCount:" + evaluatedCount + "|completedAt:" + completedAt;
    }

    private String computeHmacSha256(String data, String key) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            SecretKeySpec secretKeySpec = new SecretKeySpec(key.getBytes(StandardCharsets.UTF_8), "HmacSHA256");
            mac.init(secretKeySpec);
            byte[] rawHmac = mac.doFinal(data.getBytes(StandardCharsets.UTF_8));
            StringBuilder sb = new StringBuilder();
            for (byte b : rawHmac) {
                sb.append(String.format("%02x", b));
            }
            return sb.toString();
        } catch (Exception e) {
            throw new RuntimeException("Failed to calculate HMAC-SHA256", e);
        }
    }
}
