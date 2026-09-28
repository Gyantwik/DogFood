package com.dogfood.voting.dto;

public class VotingResultItemDto {

    private Long submissionId;
    private String submissionTitle;
    private String trackName;
    private long voteCount;

    public VotingResultItemDto() {}

    public VotingResultItemDto(Long submissionId, String submissionTitle, String trackName, long voteCount) {
        this.submissionId = submissionId;
        this.submissionTitle = submissionTitle;
        this.trackName = trackName;
        this.voteCount = voteCount;
    }

    public Long getSubmissionId() { return submissionId; }
    public void setSubmissionId(Long submissionId) { this.submissionId = submissionId; }

    public String getSubmissionTitle() { return submissionTitle; }
    public void setSubmissionTitle(String submissionTitle) { this.submissionTitle = submissionTitle; }

    public String getTrackName() { return trackName; }
    public void setTrackName(String trackName) { this.trackName = trackName; }

    public long getVoteCount() { return voteCount; }
    public void setVoteCount(long voteCount) { this.voteCount = voteCount; }
}
