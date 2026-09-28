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

    public AutoAssignResult() {}

    public AutoAssignResult(int totalAssignmentsCreated, int submissionsCovered, int judgesUtilized, int unassignedSubmissions, List<String> warnings) {
        this.totalAssignmentsCreated = totalAssignmentsCreated;
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
    }

    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }
}
