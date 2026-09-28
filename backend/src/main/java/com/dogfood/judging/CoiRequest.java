package com.dogfood.judging;

import com.fasterxml.jackson.annotation.JsonSetter;
import jakarta.validation.constraints.NotNull;

public class CoiRequest {

    private Long submissionId;
    private Long projectId;

    @NotNull
    private CoiReason reason; // SAME_TEAM, SAME_ORGANIZATION, PERSONAL_RELATIONSHIP, OTHER

    private String notes;
    private Long eventId;

    public Long getEventId() { return eventId; }
    public void setEventId(Long eventId) { this.eventId = eventId; }

    public CoiRequest() {}

    public CoiRequest(Long submissionId, CoiReason reason, String notes) {
        this.submissionId = submissionId;
        this.projectId = submissionId;
        this.reason = reason;
        this.notes = notes;
    }

    public Long getSubmissionId() {
        return submissionId != null ? submissionId : projectId;
    }

    public void setSubmissionId(Long submissionId) {
        this.submissionId = submissionId;
        if (this.projectId == null) {
            this.projectId = submissionId;
        }
    }

    public Long getProjectId() {
        return projectId != null ? projectId : submissionId;
    }

    public void setProjectId(Long projectId) {
        this.projectId = projectId;
        if (this.submissionId == null) {
            this.submissionId = projectId;
        }
    }

    public CoiReason getReason() {
        return reason;
    }

    public void setReason(CoiReason reason) {
        this.reason = reason;
    }

    @JsonSetter("reason")
    public void setReasonString(String reasonStr) {
        if (reasonStr != null) {
            try {
                this.reason = CoiReason.valueOf(reasonStr.trim().toUpperCase());
            } catch (Exception e) {
                this.reason = CoiReason.OTHER;
            }
        }
    }

    public String getNotes() {
        return notes;
    }

    public void setNotes(String notes) {
        this.notes = notes;
    }
}
