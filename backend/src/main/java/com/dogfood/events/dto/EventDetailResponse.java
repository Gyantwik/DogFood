package com.dogfood.events.dto;

import java.time.Instant;
import java.util.List;

public class EventDetailResponse {

    private Long id;
    private String name;
    private String description;
    private String status;
    private Instant submissionDeadline;
    private Instant registrationStart;
    private Instant registrationEnd;
    private Instant eventStart;
    private Instant eventEnd;
    private Instant teamFormationStart;
    private Instant teamFormationEnd;
    private Instant submissionStart;
    private Instant judgingStart;
    private Instant judgingEnd;
    private Instant votingStart;
    private Instant votingEnd;
    private Boolean votingEnabled;
    private String votingAccessMode;
    private Instant resultsPublishAt;
    private List<TrackDto> tracks;
    private Instant createdAt;

    public EventDetailResponse() {}

    public EventDetailResponse(Long id, String name, String description, String status, Instant submissionDeadline, List<TrackDto> tracks, Instant createdAt) {
        this.id = id;
        this.name = name;
        this.description = description;
        this.status = status;
        this.submissionDeadline = submissionDeadline;
        this.tracks = tracks;
        this.createdAt = createdAt;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public Instant getSubmissionDeadline() { return submissionDeadline; }
    public void setSubmissionDeadline(Instant submissionDeadline) { this.submissionDeadline = submissionDeadline; }

    public Instant getRegistrationStart() { return registrationStart; }
    public void setRegistrationStart(Instant registrationStart) { this.registrationStart = registrationStart; }

    public Instant getRegistrationEnd() { return registrationEnd; }
    public void setRegistrationEnd(Instant registrationEnd) { this.registrationEnd = registrationEnd; }

    public Instant getEventStart() { return eventStart; }
    public void setEventStart(Instant eventStart) { this.eventStart = eventStart; }

    public Instant getEventEnd() { return eventEnd; }
    public void setEventEnd(Instant eventEnd) { this.eventEnd = eventEnd; }

    public Instant getTeamFormationStart() { return teamFormationStart; }
    public void setTeamFormationStart(Instant teamFormationStart) { this.teamFormationStart = teamFormationStart; }

    public Instant getTeamFormationEnd() { return teamFormationEnd; }
    public void setTeamFormationEnd(Instant teamFormationEnd) { this.teamFormationEnd = teamFormationEnd; }

    public Instant getSubmissionStart() { return submissionStart; }
    public void setSubmissionStart(Instant submissionStart) { this.submissionStart = submissionStart; }

    public Instant getJudgingStart() { return judgingStart; }
    public void setJudgingStart(Instant judgingStart) { this.judgingStart = judgingStart; }

    public Instant getJudgingEnd() { return judgingEnd; }
    public void setJudgingEnd(Instant judgingEnd) { this.judgingEnd = judgingEnd; }

    public Instant getVotingStart() { return votingStart; }
    public void setVotingStart(Instant votingStart) { this.votingStart = votingStart; }

    public Instant getVotingEnd() { return votingEnd; }
    public void setVotingEnd(Instant votingEnd) { this.votingEnd = votingEnd; }

    public Boolean getVotingEnabled() { return votingEnabled; }
    public void setVotingEnabled(Boolean votingEnabled) { this.votingEnabled = votingEnabled; }

    public String getVotingAccessMode() { return votingAccessMode; }
    public void setVotingAccessMode(String votingAccessMode) { this.votingAccessMode = votingAccessMode; }

    public Instant getResultsPublishAt() { return resultsPublishAt; }
    public void setResultsPublishAt(Instant resultsPublishAt) { this.resultsPublishAt = resultsPublishAt; }

    public List<TrackDto> getTracks() { return tracks; }
    public void setTracks(List<TrackDto> tracks) { this.tracks = tracks; }

    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
}
