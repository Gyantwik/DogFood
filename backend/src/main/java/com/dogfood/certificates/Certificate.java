package com.dogfood.certificates;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "certificates")
public class Certificate {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "certificate_id", unique = true, nullable = false, length = 100)
    private String certificateId;

    @Column(name = "event_id", nullable = false)
    private Long eventId;

    @Column(name = "recipient_id")
    private Long recipientId;

    @Column(name = "recipient_name", nullable = false)
    private String recipientName;

    @Column(name = "recipient_email")
    private String recipientEmail;

    @Column(name = "recipient_type", nullable = false, length = 50)
    private String recipientType; // 'PARTICIPANT', 'JUDGE', 'WINNER'

    @Column(name = "award_title", nullable = false)
    private String awardTitle;

    @Column(name = "verification_hash", nullable = false)
    private String verificationHash;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    public Certificate() {}

    public Certificate(String certificateId, Long eventId, Long recipientId, String recipientName, String recipientEmail, String recipientType, String awardTitle, String verificationHash) {
        this.certificateId = certificateId;
        this.eventId = eventId;
        this.recipientId = recipientId;
        this.recipientName = recipientName;
        this.recipientEmail = recipientEmail;
        this.recipientType = recipientType;
        this.awardTitle = awardTitle;
        this.verificationHash = verificationHash;
        this.createdAt = Instant.now();
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getCertificateId() { return certificateId; }
    public void setCertificateId(String certificateId) { this.certificateId = certificateId; }

    public Long getEventId() { return eventId; }
    public void setEventId(Long eventId) { this.eventId = eventId; }

    public Long getRecipientId() { return recipientId; }
    public void setRecipientId(Long recipientId) { this.recipientId = recipientId; }

    public String getRecipientName() { return recipientName; }
    public void setRecipientName(String recipientName) { this.recipientName = recipientName; }

    public String getRecipientEmail() { return recipientEmail; }
    public void setRecipientEmail(String recipientEmail) { this.recipientEmail = recipientEmail; }

    public String getRecipientType() { return recipientType; }
    public void setRecipientType(String recipientType) { this.recipientType = recipientType; }

    public String getAwardTitle() { return awardTitle; }
    public void setAwardTitle(String awardTitle) { this.awardTitle = awardTitle; }

    public String getVerificationHash() { return verificationHash; }
    public void setVerificationHash(String verificationHash) { this.verificationHash = verificationHash; }

    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
}
