package com.dogfood.certificates.dto;

import java.time.Instant;

public class CertificateVerificationResponse {

    private boolean valid;
    private String certificateId;
    private String recipientName;
    private String recipientType;
    private String awardTitle;
    private String eventName;
    private Long eventId;
    private Instant issueDate;
    private String verificationHash;
    private String message;

    public CertificateVerificationResponse() {}

    public static CertificateVerificationResponse valid(CertificateDto cert) {
        CertificateVerificationResponse res = new CertificateVerificationResponse();
        res.setValid(true);
        res.setCertificateId(cert.getCertificateId());
        res.setRecipientName(cert.getRecipientName());
        res.setRecipientType(cert.getRecipientType());
        res.setAwardTitle(cert.getAwardTitle());
        res.setEventName(cert.getEventName());
        res.setEventId(cert.getEventId());
        res.setIssueDate(cert.getCreatedAt());
        res.setVerificationHash(cert.getVerificationHash());
        res.setMessage("Certificate is authentic, verified, and recorded on-chain/ledger.");
        return res;
    }

    public static CertificateVerificationResponse invalid(String certificateId, String message) {
        CertificateVerificationResponse res = new CertificateVerificationResponse();
        res.setValid(false);
        res.setCertificateId(certificateId);
        res.setMessage(message != null ? message : "Certificate could not be verified or does not exist.");
        return res;
    }

    public boolean isValid() { return valid; }
    public void setValid(boolean valid) { this.valid = valid; }

    public String getCertificateId() { return certificateId; }
    public void setCertificateId(String certificateId) { this.certificateId = certificateId; }

    public String getRecipientName() { return recipientName; }
    public void setRecipientName(String recipientName) { this.recipientName = recipientName; }

    public String getRecipientType() { return recipientType; }
    public void setRecipientType(String recipientType) { this.recipientType = recipientType; }

    public String getAwardTitle() { return awardTitle; }
    public void setAwardTitle(String awardTitle) { this.awardTitle = awardTitle; }

    public String getEventName() { return eventName; }
    public void setEventName(String eventName) { this.eventName = eventName; }

    public Long getEventId() { return eventId; }
    public void setEventId(Long eventId) { this.eventId = eventId; }

    public Instant getIssueDate() { return issueDate; }
    public void setIssueDate(Instant issueDate) { this.issueDate = issueDate; }

    public String getVerificationHash() { return verificationHash; }
    public void setVerificationHash(String verificationHash) { this.verificationHash = verificationHash; }

    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }

    public String getId() { return certificateId; }
    public String getChecksum() { return verificationHash; }
}
