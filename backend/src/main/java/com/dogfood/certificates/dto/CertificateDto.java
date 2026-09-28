package com.dogfood.certificates.dto;

import java.time.Instant;

public class CertificateDto {

    private String certificateId;
    private Long eventId;
    private String eventName;
    private Long recipientId;
    private String recipientName;
    private String recipientEmail;
    private String recipientType;
    private String awardTitle;
    private String verificationHash;
    private Instant createdAt;

    public CertificateDto() {}

    public CertificateDto(String certificateId, Long eventId, String eventName, Long recipientId, String recipientName, String recipientEmail, String recipientType, String awardTitle, String verificationHash, Instant createdAt) {
        this.certificateId = certificateId;
        this.eventId = eventId;
        this.eventName = eventName;
        this.recipientId = recipientId;
        this.recipientName = recipientName;
        this.recipientEmail = recipientEmail;
        this.recipientType = recipientType;
        this.awardTitle = awardTitle;
        this.verificationHash = verificationHash;
        this.createdAt = createdAt;
    }

    public String getCertificateId() { return certificateId; }
    public void setCertificateId(String certificateId) { this.certificateId = certificateId; }

    public Long getEventId() { return eventId; }
    public void setEventId(Long eventId) { this.eventId = eventId; }

    public String getEventName() { return eventName; }
    public void setEventName(String eventName) { this.eventName = eventName; }

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

    public String getId() { return certificateId; }
    public String getChecksum() { return verificationHash; }
}
