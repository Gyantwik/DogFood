package com.dogfood.judging;

import java.util.ArrayList;
import java.util.List;

public class ScoringHealthDto {

    private Long eventId;
    private int totalProjects;
    private int targetReviewsPerProject;
    private int totalReviewsRequired;
    private int completedReviews;
    private double overallCompletionRate;

    private int projectsZeroReviews;
    private int projectsSingleReview;
    private int projectsFullyReviewed;
    private int judgesWithIncompleteQueues;

    private List<JudgeScoringHealthItem> judgeStats = new ArrayList<>();

    public ScoringHealthDto() {}

    public static class JudgeScoringHealthItem {
        private Long judgeId;
        private String judgeName;
        private int assignedCount;
        private int completedCount;
        private double averageScore;
        private double stdDevScore;
        private boolean queueCompleted;

        public JudgeScoringHealthItem() {}

        public JudgeScoringHealthItem(Long judgeId, String judgeName, int assignedCount, int completedCount, double averageScore, double stdDevScore) {
            this.judgeId = judgeId;
            this.judgeName = judgeName;
            this.assignedCount = assignedCount;
            this.completedCount = completedCount;
            this.averageScore = averageScore;
            this.stdDevScore = stdDevScore;
            this.queueCompleted = assignedCount > 0 && completedCount >= assignedCount;
        }

        public Long getJudgeId() { return judgeId; }
        public void setJudgeId(Long judgeId) { this.judgeId = judgeId; }

        public String getJudgeName() { return judgeName; }
        public void setJudgeName(String judgeName) { this.judgeName = judgeName; }

        public int getAssignedCount() { return assignedCount; }
        public void setAssignedCount(int assignedCount) { this.assignedCount = assignedCount; }

        public int getCompletedCount() { return completedCount; }
        public void setCompletedCount(int completedCount) { this.completedCount = completedCount; }

        public double getAverageScore() { return averageScore; }
        public void setAverageScore(double averageScore) { this.averageScore = averageScore; }

        public double getStdDevScore() { return stdDevScore; }
        public void setStdDevScore(double stdDevScore) { this.stdDevScore = stdDevScore; }

        public boolean isQueueCompleted() { return queueCompleted; }
        public void setQueueCompleted(boolean queueCompleted) { this.queueCompleted = queueCompleted; }
    }

    public Long getEventId() { return eventId; }
    public void setEventId(Long eventId) { this.eventId = eventId; }

    public int getTotalProjects() { return totalProjects; }
    public void setTotalProjects(int totalProjects) { this.totalProjects = totalProjects; }

    public int getTargetReviewsPerProject() { return targetReviewsPerProject; }
    public void setTargetReviewsPerProject(int targetReviewsPerProject) { this.targetReviewsPerProject = targetReviewsPerProject; }

    public int getTotalReviewsRequired() { return totalReviewsRequired; }
    public void setTotalReviewsRequired(int totalReviewsRequired) { this.totalReviewsRequired = totalReviewsRequired; }

    public int getCompletedReviews() { return completedReviews; }
    public void setCompletedReviews(int completedReviews) { this.completedReviews = completedReviews; }

    public double getOverallCompletionRate() { return overallCompletionRate; }
    public void setOverallCompletionRate(double overallCompletionRate) { this.overallCompletionRate = overallCompletionRate; }

    public int getProjectsZeroReviews() { return projectsZeroReviews; }
    public void setProjectsZeroReviews(int projectsZeroReviews) { this.projectsZeroReviews = projectsZeroReviews; }

    public int getProjectsSingleReview() { return projectsSingleReview; }
    public void setProjectsSingleReview(int projectsSingleReview) { this.projectsSingleReview = projectsSingleReview; }

    public int getProjectsFullyReviewed() { return projectsFullyReviewed; }
    public void setProjectsFullyReviewed(int projectsFullyReviewed) { this.projectsFullyReviewed = projectsFullyReviewed; }

    public int getJudgesWithIncompleteQueues() { return judgesWithIncompleteQueues; }
    public void setJudgesWithIncompleteQueues(int judgesWithIncompleteQueues) { this.judgesWithIncompleteQueues = judgesWithIncompleteQueues; }

    public List<JudgeScoringHealthItem> getJudgeStats() { return judgeStats; }
    public void setJudgeStats(List<JudgeScoringHealthItem> judgeStats) { this.judgeStats = judgeStats; }
}
