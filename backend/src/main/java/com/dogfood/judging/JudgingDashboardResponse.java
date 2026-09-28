package com.dogfood.judging;

import java.util.List;

public class JudgingDashboardResponse {
    private long projectsSubmitted;
    private long judgesCount;
    private double avgScore;
    private List<JudgeProgress> progressByJudge;
    private List<TrackProgress> progressByTrack;
    private List<AttentionItem> needsAttention;
    private List<String> activity;

    private long totalAssignments;
    private long totalEligibleAssignments;
    private long pendingAssignments;
    private long completedAssignments;
    private long removedCoiAssignments;
    private long judgesWithOutstandingWork;
    private long projectsWithZeroReviews;
    private long projectsWithOneReview;
    private long projectsWithMultipleReviews;

    public JudgingDashboardResponse() {}

    public JudgingDashboardResponse(long projectsSubmitted, long judgesCount, double avgScore,
                                    List<JudgeProgress> progressByJudge, List<TrackProgress> progressByTrack,
                                    List<AttentionItem> needsAttention, List<String> activity) {
        this.projectsSubmitted = projectsSubmitted;
        this.judgesCount = judgesCount;
        this.avgScore = avgScore;
        this.progressByJudge = progressByJudge;
        this.progressByTrack = progressByTrack;
        this.needsAttention = needsAttention;
        this.activity = activity;
    }

    public long getProjectsSubmitted() { return projectsSubmitted; }
    public void setProjectsSubmitted(long projectsSubmitted) { this.projectsSubmitted = projectsSubmitted; }

    public long getJudgesCount() { return judgesCount; }
    public void setJudgesCount(long judgesCount) { this.judgesCount = judgesCount; }

    public double getAvgScore() { return avgScore; }
    public void setAvgScore(double avgScore) { this.avgScore = avgScore; }

    public List<JudgeProgress> getProgressByJudge() { return progressByJudge; }
    public void setProgressByJudge(List<JudgeProgress> progressByJudge) { this.progressByJudge = progressByJudge; }

    public List<TrackProgress> getProgressByTrack() { return progressByTrack; }
    public void setProgressByTrack(List<TrackProgress> progressByTrack) { this.progressByTrack = progressByTrack; }

    public List<AttentionItem> getNeedsAttention() { return needsAttention; }
    public void setNeedsAttention(List<AttentionItem> needsAttention) { this.needsAttention = needsAttention; }

    public List<String> getActivity() { return activity; }
    public void setActivity(List<String> activity) { this.activity = activity; }

    public long getTotalAssignments() { return totalAssignments; }
    public void setTotalAssignments(long totalAssignments) { this.totalAssignments = totalAssignments; }

    public long getTotalEligibleAssignments() { return totalEligibleAssignments; }
    public void setTotalEligibleAssignments(long totalEligibleAssignments) { this.totalEligibleAssignments = totalEligibleAssignments; }

    public long getPendingAssignments() { return pendingAssignments; }
    public void setPendingAssignments(long pendingAssignments) { this.pendingAssignments = pendingAssignments; }

    public long getCompletedAssignments() { return completedAssignments; }
    public void setCompletedAssignments(long completedAssignments) { this.completedAssignments = completedAssignments; }

    public long getRemovedCoiAssignments() { return removedCoiAssignments; }
    public void setRemovedCoiAssignments(long removedCoiAssignments) { this.removedCoiAssignments = removedCoiAssignments; }

    public long getJudgesWithOutstandingWork() { return judgesWithOutstandingWork; }
    public void setJudgesWithOutstandingWork(long judgesWithOutstandingWork) { this.judgesWithOutstandingWork = judgesWithOutstandingWork; }

    public long getProjectsWithZeroReviews() { return projectsWithZeroReviews; }
    public void setProjectsWithZeroReviews(long projectsWithZeroReviews) { this.projectsWithZeroReviews = projectsWithZeroReviews; }

    public long getProjectsWithOneReview() { return projectsWithOneReview; }
    public void setProjectsWithOneReview(long projectsWithOneReview) { this.projectsWithOneReview = projectsWithOneReview; }

    public long getProjectsWithMultipleReviews() { return projectsWithMultipleReviews; }
    public void setProjectsWithMultipleReviews(long projectsWithMultipleReviews) { this.projectsWithMultipleReviews = projectsWithMultipleReviews; }

    public static class JudgeProgress {
        private String name;
        private long scored;
        private long total;

        public JudgeProgress() {}
        public JudgeProgress(String name, long scored, long total) {
            this.name = name;
            this.scored = scored;
            this.total = total;
        }
        public String getName() { return name; }
        public void setName(String name) { this.name = name; }
        public long getScored() { return scored; }
        public void setScored(long scored) { this.scored = scored; }
        public long getTotal() { return total; }
        public void setTotal(long total) { this.total = total; }
    }

    public static class TrackProgress {
        private String track;
        private long scored;
        private long total;

        public TrackProgress() {}
        public TrackProgress(String track, long scored, long total) {
            this.track = track;
            this.scored = scored;
            this.total = total;
        }
        public String getTrack() { return track; }
        public void setTrack(String track) { this.track = track; }
        public long getScored() { return scored; }
        public void setScored(long scored) { this.scored = scored; }
        public long getTotal() { return total; }
        public void setTotal(long total) { this.total = total; }
    }

    public static class AttentionItem {
        private String project;
        private String issue;
        private String status; // Behind, Blocked, Incomplete, Warning, Ready
        private String actionLabel;

        public AttentionItem() {}
        public AttentionItem(String project, String issue, String status, String actionLabel) {
            this.project = project;
            this.issue = issue;
            this.status = status;
            this.actionLabel = actionLabel;
        }
        public String getProject() { return project; }
        public void setProject(String project) { this.project = project; }
        public String getIssue() { return issue; }
        public void setIssue(String issue) { this.issue = issue; }
        public String getStatus() { return status; }
        public void setStatus(String status) { this.status = status; }
        public String getActionLabel() { return actionLabel; }
        public void setActionLabel(String actionLabel) { this.actionLabel = actionLabel; }
    }
}
