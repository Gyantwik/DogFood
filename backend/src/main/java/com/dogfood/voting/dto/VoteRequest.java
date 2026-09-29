package com.dogfood.voting.dto;

import jakarta.validation.constraints.NotNull;

public class VoteRequest {

    @NotNull(message = "Submission ID is required")
    private Long submissionId;

    private String voterIdentifier;
    private String voterAlias;
    private String voterEmail;
    private String voterPhone;
    private String sessionToken;
    private String verificationCode;

    public VoteRequest() {}

    public VoteRequest(Long submissionId, String voterIdentifier, String voterEmail) {
        this.submissionId = submissionId;
        this.voterIdentifier = voterIdentifier;
        this.voterEmail = voterEmail;
    }

    public Long getSubmissionId() { return submissionId; }
    public void setSubmissionId(Long submissionId) { this.submissionId = submissionId; }

    public String getVoterIdentifier() {
        if (voterIdentifier != null && !voterIdentifier.isBlank()) return voterIdentifier;
        if (sessionToken != null && !sessionToken.isBlank()) return sessionToken;
        if (voterAlias != null && !voterAlias.isBlank()) return voterAlias;
        return null;
    }
    public void setVoterIdentifier(String voterIdentifier) { this.voterIdentifier = voterIdentifier; }

    public String getSessionToken() { return sessionToken; }
    public void setSessionToken(String sessionToken) { this.sessionToken = sessionToken; }

    public String getVerificationCode() { return verificationCode; }
    public void setVerificationCode(String verificationCode) { this.verificationCode = verificationCode; }

    public String getVoterAlias() { return voterAlias; }
    public void setVoterAlias(String voterAlias) { this.voterAlias = voterAlias; }

    public String getVoterEmail() { return voterEmail; }
    public void setVoterEmail(String voterEmail) { this.voterEmail = voterEmail; }

    public String getVoterPhone() { return voterPhone; }
    public void setVoterPhone(String voterPhone) { this.voterPhone = voterPhone; }
}
