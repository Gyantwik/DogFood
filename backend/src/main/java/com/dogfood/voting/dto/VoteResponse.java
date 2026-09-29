package com.dogfood.voting.dto;

public class VoteResponse {

    private Long voteId;
    private Long submissionId;
    private String voterIdentifier;
    private String sessionToken;
    private String voterType;
    private String message;

    public VoteResponse() {}

    public VoteResponse(Long voteId, Long submissionId, String voterIdentifier, String message) {
        this.voteId = voteId;
        this.submissionId = submissionId;
        this.voterIdentifier = voterIdentifier;
        this.message = message;
    }

    public VoteResponse(Long voteId, Long submissionId, String voterIdentifier, String message, String sessionToken, String voterType) {
        this.voteId = voteId;
        this.submissionId = submissionId;
        this.voterIdentifier = voterIdentifier;
        this.message = message;
        this.sessionToken = sessionToken;
        this.voterType = voterType;
    }

    public Long getVoteId() { return voteId; }
    public void setVoteId(Long voteId) { this.voteId = voteId; }

    public Long getSubmissionId() { return submissionId; }
    public void setSubmissionId(Long submissionId) { this.submissionId = submissionId; }

    public String getVoterIdentifier() { return voterIdentifier; }
    public void setVoterIdentifier(String voterIdentifier) { this.voterIdentifier = voterIdentifier; }

    public String getSessionToken() { return sessionToken; }
    public void setSessionToken(String sessionToken) { this.sessionToken = sessionToken; }

    public String getVoterType() { return voterType; }
    public void setVoterType(String voterType) { this.voterType = voterType; }

    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }
}
