package com.dogfood.pairwise.dto;

public class JudgePairwiseProgressResponse {

    private Long judgeId;
    private Long eventId;
    private int completedComparisons;
    private int remainingAvailable;
    private int totalEligibleProjects;
    private int totalPossiblePairs;
    private double completionPercentage;
    private boolean pairwiseEnabled;

    public JudgePairwiseProgressResponse() {}

    public JudgePairwiseProgressResponse(Long judgeId, Long eventId, int completedComparisons, int remainingAvailable, int totalEligibleProjects, int totalPossiblePairs) {
        this.judgeId = judgeId;
        this.eventId = eventId;
        this.completedComparisons = completedComparisons;
        this.remainingAvailable = remainingAvailable;
        this.totalEligibleProjects = totalEligibleProjects;
        this.totalPossiblePairs = totalPossiblePairs;
        int total = completedComparisons + remainingAvailable;
        this.completionPercentage = total > 0 ? (completedComparisons * 100.0 / total) : 0.0;
    }

    public Long getJudgeId() { return judgeId; }
    public void setJudgeId(Long judgeId) { this.judgeId = judgeId; }

    public Long getEventId() { return eventId; }
    public void setEventId(Long eventId) { this.eventId = eventId; }

    public int getCompletedComparisons() { return completedComparisons; }
    public void setCompletedComparisons(int completedComparisons) { this.completedComparisons = completedComparisons; }

    public int getRemainingAvailable() { return remainingAvailable; }
    public void setRemainingAvailable(int remainingAvailable) { this.remainingAvailable = remainingAvailable; }

    public int getTotalEligibleProjects() { return totalEligibleProjects; }
    public void setTotalEligibleProjects(int totalEligibleProjects) { this.totalEligibleProjects = totalEligibleProjects; }

    public int getTotalPossiblePairs() { return totalPossiblePairs; }
    public void setTotalPossiblePairs(int totalPossiblePairs) { this.totalPossiblePairs = totalPossiblePairs; }

    public double getCompletionPercentage() { return completionPercentage; }
    public void setCompletionPercentage(double completionPercentage) { this.completionPercentage = completionPercentage; }

    public boolean isPairwiseEnabled() { return pairwiseEnabled; }
    public void setPairwiseEnabled(boolean pairwiseEnabled) { this.pairwiseEnabled = pairwiseEnabled; }
}
