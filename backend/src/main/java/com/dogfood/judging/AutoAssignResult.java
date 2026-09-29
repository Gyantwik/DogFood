package com.dogfood.judging;

import java.util.ArrayList;
import java.util.List;

public class AutoAssignResult {
    private int totalAssignmentsCreated;
    private int submissionsCovered;
    private int judgesUtilized;
    private int unassignedSubmissions;
    private List<String> warnings = new ArrayList<>();
    private int count;
    private String message;

    private int projectsFullyCovered;
    private int projectsUnderCovered;
    private int assignmentsCreated;
    private int assignmentsSkipped;
    private List<String> skipReasons = new ArrayList<>();

    public AutoAssignResult() {}

    public AutoAssignResult(int totalAssignmentsCreated, int submissionsCovered, int judgesUtilized, int unassignedSubmissions, List<String> warnings) {
        this.totalAssignmentsCreated = totalAssignmentsCreated;
        this.assignmentsCreated = totalAssignmentsCreated;
        this.submissionsCovered = submissionsCovered;
        this.judgesUtilized = judgesUtilized;
        this.unassignedSubmissions = unassignedSubmissions;
        this.warnings = warnings != null ? warnings : new ArrayList<>();
        this.count = totalAssignmentsCreated;
        this.message = "Auto-assigned " + totalAssignmentsCreated + " assignments";
    }

    public int getTotalAssignmentsCreated() { return totalAssignmentsCreated; }
    public void setTotalAssignmentsCreated(int totalAssignmentsCreated) {
        this.totalAssignmentsCreated = totalAssignmentsCreated;
        this.assignmentsCreated = totalAssignmentsCreated;
        this.count = totalAssignmentsCreated;
    }

    public int getSubmissionsCovered() { return submissionsCovered; }
    public void setSubmissionsCovered(int submissionsCovered) { this.submissionsCovered = submissionsCovered; }

    public int getJudgesUtilized() { return judgesUtilized; }
    public void setJudgesUtilized(int judgesUtilized) { this.judgesUtilized = judgesUtilized; }

    public int getUnassignedSubmissions() { return unassignedSubmissions; }
    public void setUnassignedSubmissions(int unassignedSubmissions) { this.unassignedSubmissions = unassignedSubmissions; }

    public List<String> getWarnings() { return warnings; }
    public void setWarnings(List<String> warnings) { this.warnings = warnings; }

    public int getCount() { return count; }
    public void setCount(int count) {
        this.count = count;
        this.totalAssignmentsCreated = count;
        this.assignmentsCreated = count;
    }

    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }

    public int getProjectsFullyCovered() { return projectsFullyCovered; }
    public void setProjectsFullyCovered(int projectsFullyCovered) { this.projectsFullyCovered = projectsFullyCovered; }

    public int getProjectsUnderCovered() { return projectsUnderCovered; }
    public void setProjectsUnderCovered(int projectsUnderCovered) { this.projectsUnderCovered = projectsUnderCovered; }

    public int getAssignmentsCreated() { return assignmentsCreated; }
    public void setAssignmentsCreated(int assignmentsCreated) {
        this.assignmentsCreated = assignmentsCreated;
        this.totalAssignmentsCreated = assignmentsCreated;
        this.count = assignmentsCreated;
    }

    public int getAssignmentsSkipped() { return assignmentsSkipped; }
    public void setAssignmentsSkipped(int assignmentsSkipped) { this.assignmentsSkipped = assignmentsSkipped; }

    public List<String> getSkipReasons() { return skipReasons; }
    public void setSkipReasons(List<String> skipReasons) { this.skipReasons = skipReasons; }
}
