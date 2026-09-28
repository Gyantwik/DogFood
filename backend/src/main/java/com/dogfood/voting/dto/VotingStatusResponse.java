package com.dogfood.voting.dto;

import java.time.Instant;

public class VotingStatusResponse {

    private boolean enabled;
    private String accessMode;
    private Instant votingStart;
    private Instant votingEnd;
    private boolean open;
    private boolean hasVoted;
    private Long votedSubmissionId;
    private long totalVotes;

    public VotingStatusResponse() {}

    public VotingStatusResponse(boolean enabled, String accessMode, Instant votingStart, Instant votingEnd, boolean open, boolean hasVoted, Long votedSubmissionId, long totalVotes) {
        this.enabled = enabled;
        this.accessMode = accessMode;
        this.votingStart = votingStart;
        this.votingEnd = votingEnd;
        this.open = open;
        this.hasVoted = hasVoted;
        this.votedSubmissionId = votedSubmissionId;
        this.totalVotes = totalVotes;
    }

    public boolean isEnabled() { return enabled; }
    public boolean isVotingEnabled() { return enabled; }
    public void setEnabled(boolean enabled) { this.enabled = enabled; }

    public String getAccessMode() { return accessMode; }
    public void setAccessMode(String accessMode) { this.accessMode = accessMode; }

    public Instant getVotingStart() { return votingStart; }
    public void setVotingStart(Instant votingStart) { this.votingStart = votingStart; }

    public Instant getVotingEnd() { return votingEnd; }
    public void setVotingEnd(Instant votingEnd) { this.votingEnd = votingEnd; }

    public boolean isOpen() { return open; }
    public void setOpen(boolean open) { this.open = open; }

    public boolean isHasVoted() { return hasVoted; }
    public void setHasVoted(boolean hasVoted) { this.hasVoted = hasVoted; }

    public Long getVotedSubmissionId() { return votedSubmissionId; }
    public void setVotedSubmissionId(Long votedSubmissionId) { this.votedSubmissionId = votedSubmissionId; }

    public long getTotalVotes() { return totalVotes; }
    public void setTotalVotes(long totalVotes) { this.totalVotes = totalVotes; }
}
