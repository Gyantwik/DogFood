package com.dogfood.submissions;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

public class SubmissionReadinessResponse {

    private Long submissionId;
    private Long eventId;
    private boolean titleValid;
    private boolean taglineValid;
    private boolean descriptionValid;
    private boolean trackValid;
    private boolean repoUrlValid;
    private boolean windowOpen;
    private boolean userRegistered;
    private boolean teamValid;
    private boolean isReady;
    private Long remainingSeconds;
    private String windowStatus; // "OPEN", "ENDING_SOON", "CLOSED", "NOT_STARTED"
    private List<String> missingFields = new ArrayList<>();
    private Map<String, String> fieldErrors = new HashMap<>();

    public SubmissionReadinessResponse() {}

    public Long getSubmissionId() { return submissionId; }
    public void setSubmissionId(Long submissionId) { this.submissionId = submissionId; }

    public Long getEventId() { return eventId; }
    public void setEventId(Long eventId) { this.eventId = eventId; }

    public boolean isTitleValid() { return titleValid; }
    public void setTitleValid(boolean titleValid) { this.titleValid = titleValid; }

    public boolean isTaglineValid() { return taglineValid; }
    public void setTaglineValid(boolean taglineValid) { this.taglineValid = taglineValid; }

    public boolean isDescriptionValid() { return descriptionValid; }
    public void setDescriptionValid(boolean descriptionValid) { this.descriptionValid = descriptionValid; }

    public boolean isTrackValid() { return trackValid; }
    public void setTrackValid(boolean trackValid) { this.trackValid = trackValid; }

    public boolean isRepoUrlValid() { return repoUrlValid; }
    public void setRepoUrlValid(boolean repoUrlValid) { this.repoUrlValid = repoUrlValid; }

    public boolean isWindowOpen() { return windowOpen; }
    public void setWindowOpen(boolean windowOpen) { this.windowOpen = windowOpen; }

    public boolean isUserRegistered() { return userRegistered; }
    public void setUserRegistered(boolean userRegistered) { this.userRegistered = userRegistered; }

    public boolean isTeamValid() { return teamValid; }
    public void setTeamValid(boolean teamValid) { this.teamValid = teamValid; }

    public boolean isReady() { return isReady; }
    public void setReady(boolean ready) { isReady = ready; }

    public Long getRemainingSeconds() { return remainingSeconds; }
    public void setRemainingSeconds(Long remainingSeconds) { this.remainingSeconds = remainingSeconds; }

    public String getWindowStatus() { return windowStatus; }
    public void setWindowStatus(String windowStatus) { this.windowStatus = windowStatus; }

    public List<String> getMissingFields() { return missingFields; }
    public void setMissingFields(List<String> missingFields) { this.missingFields = missingFields; }

    public Map<String, String> getFieldErrors() { return fieldErrors; }
    public void setFieldErrors(Map<String, String> fieldErrors) { this.fieldErrors = fieldErrors; }
}
