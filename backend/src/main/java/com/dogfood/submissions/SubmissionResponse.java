package com.dogfood.submissions;

import java.time.Instant;
import java.util.List;

public class SubmissionResponse {

    private Long id;
    private Long projectId; // alias
    private Long submissionId; // alias
    private Long eventId;
    private Long teamId;
    private String title;
    private String name; // alias
    private String tagline;
    private String description;
    private String track;
    private String repoUrl;
    private String repo_url;
    private String demoUrl;
    private String demo_url;
    private List<String> techStack;
    private String status;
    private boolean duplicateFlag;
    private String contentHash;
    private Long createdBy;

    private String thumbnailUrl;
    private String thumbnail;
    private List<String> galleryImages;
    private String demoVideoUrl;
    private String videoUrl;
    private String liveLink;
    private String liveUrl;
    private Object customAnswers;

    private Instant createdAt;
    private Instant updatedAt;

    public SubmissionResponse() {}

    public Long getId() { return id; }
    public void setId(Long id) {
        this.id = id;
        this.projectId = id;
        this.submissionId = id;
    }

    public Long getProjectId() { return projectId != null ? projectId : id; }
    public void setProjectId(Long projectId) { this.projectId = projectId; }

    public Long getSubmissionId() { return submissionId != null ? submissionId : id; }
    public void setSubmissionId(Long submissionId) { this.submissionId = submissionId; }

    public Long getEventId() { return eventId; }
    public void setEventId(Long eventId) { this.eventId = eventId; }

    public Long getTeamId() { return teamId; }
    public void setTeamId(Long teamId) { this.teamId = teamId; }

    public String getTitle() { return title; }
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
    public void setRepoUrl(String repoUrl) {
        this.repoUrl = repoUrl;
        this.repo_url = repoUrl;
    }

    public String getRepo_url() { return repo_url != null ? repo_url : repoUrl; }
    public void setRepo_url(String repo_url) { this.repo_url = repo_url; }

    public String getDemoUrl() { return demoUrl; }
    public void setDemoUrl(String demoUrl) {
        this.demoUrl = demoUrl;
        this.demo_url = demoUrl;
    }

    public String getDemo_url() { return demo_url != null ? demo_url : demoUrl; }
    public void setDemo_url(String demo_url) { this.demo_url = demo_url; }

    public List<String> getTechStack() { return techStack; }
    public void setTechStack(List<String> techStack) { this.techStack = techStack; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public boolean isDuplicateFlag() { return duplicateFlag; }
    public void setDuplicateFlag(boolean duplicateFlag) { this.duplicateFlag = duplicateFlag; }

    public String getContentHash() { return contentHash; }
    public void setContentHash(String contentHash) { this.contentHash = contentHash; }

    public Long getCreatedBy() { return createdBy; }
    public void setCreatedBy(Long createdBy) { this.createdBy = createdBy; }

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

    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }

    public Instant getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }
}
