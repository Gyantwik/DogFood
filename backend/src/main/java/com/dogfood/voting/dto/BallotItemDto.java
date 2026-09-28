package com.dogfood.voting.dto;

public class BallotItemDto {

    private Long submissionId;
    private String title;
    private String tagline;
    private String description;
    private String trackName;
    private String demoUrl;
    private String repoUrl;

    public BallotItemDto() {}

    public BallotItemDto(Long submissionId, String title, String tagline, String description, String trackName, String demoUrl, String repoUrl) {
        this.submissionId = submissionId;
        this.title = title;
        this.tagline = tagline;
        this.description = description;
        this.trackName = trackName;
        this.demoUrl = demoUrl;
        this.repoUrl = repoUrl;
    }

    public Long getSubmissionId() { return submissionId; }
    public void setSubmissionId(Long submissionId) { this.submissionId = submissionId; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public String getTagline() { return tagline; }
    public void setTagline(String tagline) { this.tagline = tagline; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public String getTrackName() { return trackName; }
    public void setTrackName(String trackName) { this.trackName = trackName; }

    public String getDemoUrl() { return demoUrl; }
    public void setDemoUrl(String demoUrl) { this.demoUrl = demoUrl; }

    public String getRepoUrl() { return repoUrl; }
    public void setRepoUrl(String repoUrl) { this.repoUrl = repoUrl; }
}
