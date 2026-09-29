package com.dogfood.judging;

import java.util.ArrayList;
import java.util.List;

public class JudgeWorkloadDto {

    private Long eventId;
    private int totalJudges;
    private int totalAssignments;
    private int totalCompleted;
    private double overallCompletionRate;
    private List<JudgeWorkloadItem> judges = new ArrayList<>();

    public JudgeWorkloadDto() {}

    public static class JudgeWorkloadItem {
        private Long judgeId;
        private String judgeName;
        private String judgeEmail;
        private int assignedCount;
        private int completedCount;
        private int remainingCount;
        private double completionPercentage;

        public JudgeWorkloadItem() {}

        public JudgeWorkloadItem(Long judgeId, String judgeName, String judgeEmail, int assignedCount, int completedCount) {
            this.judgeId = judgeId;
            this.judgeName = judgeName;
            this.judgeEmail = judgeEmail;
            this.assignedCount = assignedCount;
            this.completedCount = completedCount;
            this.remainingCount = Math.max(0, assignedCount - completedCount);
            this.completionPercentage = assignedCount > 0
                    ? Math.round((double) completedCount / assignedCount * 1000.0) / 10.0
                    : 0.0;
        }

        public Long getJudgeId() { return judgeId; }
        public void setJudgeId(Long judgeId) { this.judgeId = judgeId; }

        public String getJudgeName() { return judgeName; }
        public void setJudgeName(String judgeName) { this.judgeName = judgeName; }

        public String getJudgeEmail() { return judgeEmail; }
        public void setJudgeEmail(String judgeEmail) { this.judgeEmail = judgeEmail; }

        public int getAssignedCount() { return assignedCount; }
        public void setAssignedCount(int assignedCount) { this.assignedCount = assignedCount; }

        public int getCompletedCount() { return completedCount; }
        public void setCompletedCount(int completedCount) { this.completedCount = completedCount; }

        public int getRemainingCount() { return remainingCount; }
        public void setRemainingCount(int remainingCount) { this.remainingCount = remainingCount; }

        public double getCompletionPercentage() { return completionPercentage; }
        public void setCompletionPercentage(double completionPercentage) { this.completionPercentage = completionPercentage; }
    }

    public Long getEventId() { return eventId; }
    public void setEventId(Long eventId) { this.eventId = eventId; }

    public int getTotalJudges() { return totalJudges; }
    public void setTotalJudges(int totalJudges) { this.totalJudges = totalJudges; }

    public int getTotalAssignments() { return totalAssignments; }
    public void setTotalAssignments(int totalAssignments) { this.totalAssignments = totalAssignments; }

    public int getTotalCompleted() { return totalCompleted; }
    public void setTotalCompleted(int totalCompleted) { this.totalCompleted = totalCompleted; }

    public double getOverallCompletionRate() { return overallCompletionRate; }
    public void setOverallCompletionRate(double overallCompletionRate) { this.overallCompletionRate = overallCompletionRate; }

    public List<JudgeWorkloadItem> getJudges() { return judges; }
    public void setJudges(List<JudgeWorkloadItem> judges) { this.judges = judges; }
}
