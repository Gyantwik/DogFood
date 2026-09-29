package com.dogfood.judging;

import java.util.ArrayList;
import java.util.List;

public class JudgeCoverageDto {

    private Long eventId;
    private int totalProjects;
    private int targetReviewsPerProject;
    private int fullyCoveredProjects;
    private int underAssignedProjects;
    private int overAssignedProjects;
    private double overallCoveragePercentage;
    private List<ProjectCoverageItem> projectCoverages = new ArrayList<>();

    public JudgeCoverageDto() {}

    public static class ProjectCoverageItem {
        private Long submissionId;
        private String projectTitle;
        private String track;
        private int assignedCount;
        private int completedCount;
        private int targetCount;
        private boolean fullyCovered;
        private String status; // "FULLY_COVERED" (✓), "UNDER_ASSIGNED" (⚠), "OVER_ASSIGNED"

        public ProjectCoverageItem() {}

        public ProjectCoverageItem(Long submissionId, String projectTitle, String track, int assignedCount, int completedCount, int targetCount) {
            this.submissionId = submissionId;
            this.projectTitle = projectTitle;
            this.track = track;
            this.assignedCount = assignedCount;
            this.completedCount = completedCount;
            this.targetCount = targetCount;
            this.fullyCovered = assignedCount >= targetCount;
            if (assignedCount >= targetCount) {
                this.status = assignedCount > targetCount ? "OVER_ASSIGNED" : "FULLY_COVERED";
            } else {
                this.status = "UNDER_ASSIGNED";
            }
        }

        public Long getSubmissionId() { return submissionId; }
        public void setSubmissionId(Long submissionId) { this.submissionId = submissionId; }

        public String getProjectTitle() { return projectTitle; }
        public void setProjectTitle(String projectTitle) { this.projectTitle = projectTitle; }

        public String getTrack() { return track; }
        public void setTrack(String track) { this.track = track; }

        public int getAssignedCount() { return assignedCount; }
        public void setAssignedCount(int assignedCount) { this.assignedCount = assignedCount; }

        public int getCompletedCount() { return completedCount; }
        public void setCompletedCount(int completedCount) { this.completedCount = completedCount; }

        public int getTargetCount() { return targetCount; }
        public void setTargetCount(int targetCount) { this.targetCount = targetCount; }

        public boolean isFullyCovered() { return fullyCovered; }
        public void setFullyCovered(boolean fullyCovered) { this.fullyCovered = fullyCovered; }

        public String getStatus() { return status; }
        public void setStatus(String status) { this.status = status; }
    }

    public Long getEventId() { return eventId; }
    public void setEventId(Long eventId) { this.eventId = eventId; }

    public int getTotalProjects() { return totalProjects; }
    public void setTotalProjects(int totalProjects) { this.totalProjects = totalProjects; }

    public int getTargetReviewsPerProject() { return targetReviewsPerProject; }
    public void setTargetReviewsPerProject(int targetReviewsPerProject) { this.targetReviewsPerProject = targetReviewsPerProject; }

    public int getFullyCoveredProjects() { return fullyCoveredProjects; }
    public void setFullyCoveredProjects(int fullyCoveredProjects) { this.fullyCoveredProjects = fullyCoveredProjects; }

    public int getUnderAssignedProjects() { return underAssignedProjects; }
    public void setUnderAssignedProjects(int underAssignedProjects) { this.underAssignedProjects = underAssignedProjects; }

    public int getOverAssignedProjects() { return overAssignedProjects; }
    public void setOverAssignedProjects(int overAssignedProjects) { this.overAssignedProjects = overAssignedProjects; }

    public double getOverallCoveragePercentage() { return overallCoveragePercentage; }
    public void setOverallCoveragePercentage(double overallCoveragePercentage) { this.overallCoveragePercentage = overallCoveragePercentage; }

    public List<ProjectCoverageItem> getProjectCoverages() { return projectCoverages; }
    public void setProjectCoverages(List<ProjectCoverageItem> projectCoverages) { this.projectCoverages = projectCoverages; }
}
