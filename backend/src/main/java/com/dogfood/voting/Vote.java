package com.dogfood.voting;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "votes", uniqueConstraints = {
    @UniqueConstraint(name = "uq_event_voter", columnNames = {"event_id", "voter_identifier"})
})
public class Vote {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "event_id", nullable = false)
    private Long eventId;

    @Column(name = "submission_id", nullable = false)
    private Long submissionId;

    @Column(name = "voter_identifier", nullable = false)
    private String voterIdentifier;

    @Column(name = "voter_type", nullable = false)
    private String voterType; // 'OPEN', 'EMAIL', 'AUTHENTICATED'

    @Column(name = "user_id")
    private Long userId;

    @Column(name = "voter_email")
    private String voterEmail;

    @Column(name = "ip_address")
    private String ipAddress;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    public Vote() {}

    public Vote(Long eventId, Long submissionId, String voterIdentifier, String voterType, Long userId, String voterEmail, String ipAddress) {
        this.eventId = eventId;
        this.submissionId = submissionId;
        this.voterIdentifier = voterIdentifier;
        this.voterType = voterType != null ? voterType : "OPEN";
        this.userId = userId;
        this.voterEmail = voterEmail;
        this.ipAddress = ipAddress;
        this.createdAt = Instant.now();
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getEventId() { return eventId; }
    public void setEventId(Long eventId) { this.eventId = eventId; }

    public Long getSubmissionId() { return submissionId; }
    public void setSubmissionId(Long submissionId) { this.submissionId = submissionId; }

    public String getVoterIdentifier() { return voterIdentifier; }
    public void setVoterIdentifier(String voterIdentifier) { this.voterIdentifier = voterIdentifier; }

    public String getVoterType() { return voterType; }
    public void setVoterType(String voterType) { this.voterType = voterType; }

    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }

    public String getVoterEmail() { return voterEmail; }
    public void setVoterEmail(String voterEmail) { this.voterEmail = voterEmail; }

    public String getIpAddress() { return ipAddress; }
    public void setIpAddress(String ipAddress) { this.ipAddress = ipAddress; }

    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
}
