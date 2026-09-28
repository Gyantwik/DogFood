package com.dogfood.judging;

import java.time.Instant;
import java.util.List;

public class JudgeAssignmentResponse {

    private Long assignmentId;
    private Long id; // alias
    private Long eventId;
    private Long judgeId;
    private Long submissionId;
    private Long projectId; // alias
    private String title;
    private String name; // alias
    private String tagline;
    private String description;
    private String track;
    private String repoUrl;
    private String demoUrl;
    private List<String> techStack;
    private String status;

    private String thumbnailUrl;
    private String thumbnail;
    private List<String> galleryImages;
    private String demoVideoUrl;
    private String videoUrl;
    private String liveLink;
    private String liveUrl;
    private Object customAnswers;
    private String teamName;
    private String submissionStatus;

    private Instant createdAt;

    public JudgeAssignmentResponse() {}

    public Long getAssignmentId() { return assignmentId != null ? assignmentId : id; }
    public void setAssignmentId(Long assignmentId) {
        this.assignmentId = assignmentId;
        this.id = assignmentId;
    }

    public Long getId() { return id != null ? id : assignmentId; }
    public void setId(Long id) {
        this.id = id;
        this.assignmentId = id;
    }

    public Long getEventId() { return eventId; }
    public void setEventId(Long eventId) { this.eventId = eventId; }

    public Long getJudgeId() { return judgeId; }
    public void setJudgeId(Long judgeId) { this.judgeId = judgeId; }

    public Long getSubmissionId() { return submissionId != null ? submissionId : projectId; }
    public void setSubmissionId(Long submissionId) {
        this.submissionId = submissionId;
        this.projectId = submissionId;
    }

    public Long getProjectId() { return projectId != null ? projectId : submissionId; }
    public void setProjectId(Long projectId) {
        this.projectId = projectId;
        this.submissionId = projectId;
    }

    public String getTitle() { return title != null ? title : name; }
    public void setTitle(String title) {
        this.title = title;
        this.name = title;
    }

    public String getName() { return name != null ? name : title; }
    public void setName(String name) { this.name = name; }

    public String getTagline() { return tagline; }
    public void setTagline(String tagline) { this.tagline = tagline; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public String getTrack() { return track; }
    public void setTrack(String track) { this.track = track; }

    public String getRepoUrl() { return repoUrl; }
    public void setRepoUrl(String repoUrl) { this.repoUrl = repoUrl; }

    public String getDemoUrl() { return demoUrl; }
    public void setDemoUrl(String demoUrl) { this.demoUrl = demoUrl; }

    public List<String> getTechStack() { return techStack; }
    public void setTechStack(List<String> techStack) { this.techStack = techStack; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getThumbnailUrl() { return thumbnailUrl != null ? thumbnailUrl : thumbnail; }
    public void setThumbnailUrl(String thumbnailUrl) {
        this.thumbnailUrl = thumbnailUrl;
        this.thumbnail = thumbnailUrl;
    }
    public String getThumbnail() { return getThumbnailUrl(); }
    public void setThumbnail(String thumbnail) { setThumbnailUrl(thumbnail); }

    public List<String> getGalleryImages() { return galleryImages; }
    public void setGalleryImages(List<String> galleryImages) { this.galleryImages = galleryImages; }

    public String getDemoVideoUrl() { return demoVideoUrl != null ? demoVideoUrl : videoUrl; }
    public void setDemoVideoUrl(String demoVideoUrl) {
        this.demoVideoUrl = demoVideoUrl;
        this.videoUrl = demoVideoUrl;
    }
    public String getVideoUrl() { return getDemoVideoUrl(); }
    public void setVideoUrl(String videoUrl) { setDemoVideoUrl(videoUrl); }

    public String getLiveLink() { return liveLink != null ? liveLink : liveUrl; }
    public void setLiveLink(String liveLink) {
        this.liveLink = liveLink;
        this.liveUrl = liveLink;
    }
    public String getLiveUrl() { return getLiveLink(); }
    public void setLiveUrl(String liveUrl) { setLiveLink(liveUrl); }

    public Object getCustomAnswers() { return customAnswers; }
    public void setCustomAnswers(Object customAnswers) { this.customAnswers = customAnswers; }

    public String getTeamName() { return teamName; }
    public void setTeamName(String teamName) { this.teamName = teamName; }

    public String getSubmissionStatus() { return submissionStatus; }
    public void setSubmissionStatus(String submissionStatus) { this.submissionStatus = submissionStatus; }

    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }

    private Double rawScore;
    private String comment;
    private java.util.Map<String, Double> criteria;

    public Double getRawScore() { return rawScore; }
    public void setRawScore(Double rawScore) { this.rawScore = rawScore; }

    public String getComment() { return comment; }
    public void setComment(String comment) { this.comment = comment; }

    public java.util.Map<String, Double> getCriteria() { return criteria; }
    public void setCriteria(java.util.Map<String, Double> criteria) { this.criteria = criteria; }
}
