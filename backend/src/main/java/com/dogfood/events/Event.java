package com.dogfood.events;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "events")
public class Event {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 255)
    private String name;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(length = 50)
    private String status = "OPEN";

    @Column(name = "submission_deadline")
    private Instant submissionDeadline;

    @Column(name = "registration_start")
    private Instant registrationStart;

    @Column(name = "registration_end")
    private Instant registrationEnd;

    @Column(name = "event_start")
    private Instant eventStart;

    @Column(name = "event_end")
    private Instant eventEnd;

    @Column(name = "submission_start")
    private Instant submissionStart;

    @Column(name = "judging_start")
    private Instant judgingStart;

    @Column(name = "judging_end")
    private Instant judgingEnd;

    @Column(name = "team_formation_start")
    private Instant teamFormationStart;

    @Column(name = "team_formation_end")
    private Instant teamFormationEnd;

    @Column(name = "voting_start")
    private Instant votingStart;

    @Column(name = "voting_end")
    private Instant votingEnd;

    @Column(name = "voting_enabled")
    private Boolean votingEnabled = false;

    @Column(name = "voting_access_mode")
    private String votingAccessMode = "OPEN";

    @Column(name = "pairwise_judging_enabled")
    private Boolean pairwiseJudgingEnabled = false;

    @Column(name = "results_publish_at")
    private Instant resultsPublishAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    public Event() {}

    public Event(String name, String description, Instant submissionDeadline) {
        this.name = name;
        this.description = description;
        this.submissionDeadline = submissionDeadline;
        this.status = "OPEN";
        this.createdAt = Instant.now();
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

    public Instant getSubmissionStart() { return submissionStart; }
    public void setSubmissionStart(Instant submissionStart) { this.submissionStart = submissionStart; }

    public Instant getJudgingStart() { return judgingStart; }
    public void setJudgingStart(Instant judgingStart) { this.judgingStart = judgingStart; }

    public Instant getJudgingEnd() { return judgingEnd; }
    public void setJudgingEnd(Instant judgingEnd) { this.judgingEnd = judgingEnd; }

    public Instant getTeamFormationStart() { return teamFormationStart; }
    public void setTeamFormationStart(Instant teamFormationStart) { this.teamFormationStart = teamFormationStart; }

    public Instant getTeamFormationEnd() { return teamFormationEnd; }
    public void setTeamFormationEnd(Instant teamFormationEnd) { this.teamFormationEnd = teamFormationEnd; }

    public Instant getVotingStart() { return votingStart; }
    public void setVotingStart(Instant votingStart) { this.votingStart = votingStart; }

    public Instant getVotingEnd() { return votingEnd; }
    public void setVotingEnd(Instant votingEnd) { this.votingEnd = votingEnd; }

    public Instant getResultsPublishAt() { return resultsPublishAt; }
    public void setResultsPublishAt(Instant resultsPublishAt) { this.resultsPublishAt = resultsPublishAt; }

    public Boolean getVotingEnabled() { return votingEnabled; }
    public void setVotingEnabled(Boolean votingEnabled) { this.votingEnabled = votingEnabled; }

    public String getVotingAccessMode() { return votingAccessMode; }
    public void setVotingAccessMode(String votingAccessMode) { this.votingAccessMode = votingAccessMode; }

    public Boolean getPairwiseJudgingEnabled() { return pairwiseJudgingEnabled != null && pairwiseJudgingEnabled; }
    public void setPairwiseJudgingEnabled(Boolean pairwiseJudgingEnabled) { this.pairwiseJudgingEnabled = pairwiseJudgingEnabled; }

    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
}
