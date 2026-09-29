package com.dogfood.events;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "submissions")
public class Submission {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "event_id", nullable = false)
    private Long eventId;

    @Column(name = "team_id")
    private Long teamId;

    @Column(nullable = false, length = 255)
    private String title;

    @Column(length = 255)
    private String tagline;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(length = 100)
    private String track;

    @Column(name = "repo_url", length = 500)
    private String repoUrl;

    @Column(name = "demo_url", length = 500)
    private String demoUrl;

    @Column(name = "tech_stack", columnDefinition = "TEXT")
    private String techStack;

    @Column(name = "thumbnail_url", length = 1000)
    private String thumbnailUrl;

    @Column(name = "gallery_images", columnDefinition = "TEXT")
    private String galleryImages;

    @Column(name = "demo_video_url", length = 1000)
    private String demoVideoUrl;

    @Column(name = "live_link", length = 1000)
    private String liveLink;

    @Column(name = "custom_answers", columnDefinition = "TEXT")
    private String customAnswers;

    @Column(length = 50)
    private String status = "DRAFT";

    @Column(name = "duplicate_flag")
    private boolean duplicateFlag = false;

    @Column(name = "content_hash", length = 64)
    private String contentHash;

    @Column(name = "created_by")
    private Long createdBy;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();

    @Column(name = "version_number")
    private Integer versionNumber = 1;

    @Column(name = "updated_by")
    private Long updatedBy;

    public Submission() {}

    public Submission(Long eventId, String title, String tagline, String description, String repoUrl, String status) {
        this.eventId = eventId;
        this.title = title;
        this.tagline = tagline;
        this.description = description;
        this.repoUrl = repoUrl;
        this.status = status != null ? status : "DRAFT";
        this.createdAt = Instant.now();
        this.updatedAt = Instant.now();
    }

    public Submission(Long eventId, Long teamId, Long createdBy, String title, String tagline, String description,
                      String track, String repoUrl, String demoUrl, String techStack, String status,
                      boolean duplicateFlag, String contentHash) {
        this(null, eventId, teamId, title, tagline, description, track, repoUrl, demoUrl, techStack, status, duplicateFlag, contentHash, createdBy, Instant.now(), Instant.now());
    }

    public Submission(Long id, Long eventId, Long teamId, String title, String tagline, String description,
                      String track, String repoUrl, String demoUrl, String techStack, String status,
                      boolean duplicateFlag, String contentHash, Long createdBy, Instant createdAt, Instant updatedAt) {
        this.id = id;
        this.eventId = eventId;
        this.teamId = teamId;
        this.title = title;
        this.tagline = tagline;
        this.description = description;
        this.track = track;
        this.repoUrl = repoUrl;
        this.demoUrl = demoUrl;
        this.techStack = techStack;
        this.status = status != null ? status : "DRAFT";
        this.duplicateFlag = duplicateFlag;
        this.contentHash = contentHash;
        this.createdBy = createdBy;
        this.createdAt = createdAt != null ? createdAt : Instant.now();
        this.updatedAt = updatedAt != null ? updatedAt : Instant.now();
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getEventId() { return eventId; }
    public void setEventId(Long eventId) { this.eventId = eventId; }

    public Long getTeamId() { return teamId; }
    public void setTeamId(Long teamId) { this.teamId = teamId; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

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

    public String getTechStack() { return techStack; }
    public void setTechStack(String techStack) { this.techStack = techStack; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public boolean isDuplicateFlag() { return duplicateFlag; }
    public void setDuplicateFlag(boolean duplicateFlag) { this.duplicateFlag = duplicateFlag; }

    public String getContentHash() { return contentHash; }
    public void setContentHash(String contentHash) { this.contentHash = contentHash; }

    public Long getCreatedBy() { return createdBy; }
    public void setCreatedBy(Long createdBy) { this.createdBy = createdBy; }

    public String getThumbnailUrl() { return thumbnailUrl; }
    public void setThumbnailUrl(String thumbnailUrl) { this.thumbnailUrl = thumbnailUrl; }
    public String getThumbnail() { return thumbnailUrl; }
    public void setThumbnail(String thumbnail) { this.thumbnailUrl = thumbnail; }

    public String getGalleryImages() { return galleryImages; }
    public void setGalleryImages(String galleryImages) { this.galleryImages = galleryImages; }

    public String getDemoVideoUrl() { return demoVideoUrl; }
    public void setDemoVideoUrl(String demoVideoUrl) { this.demoVideoUrl = demoVideoUrl; }
    public String getVideoUrl() { return demoVideoUrl; }
    public void setVideoUrl(String videoUrl) { this.demoVideoUrl = videoUrl; }

    public String getLiveLink() { return liveLink; }
    public void setLiveLink(String liveLink) { this.liveLink = liveLink; }
    public String getLiveUrl() { return liveLink; }
    public void setLiveUrl(String liveUrl) { this.liveLink = liveUrl; }

    public String getCustomAnswers() { return customAnswers; }
    public void setCustomAnswers(String customAnswers) { this.customAnswers = customAnswers; }

    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }

    public Instant getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }

    public Integer getVersionNumber() { return versionNumber != null ? versionNumber : 1; }
    public void setVersionNumber(Integer versionNumber) { this.versionNumber = versionNumber; }

    public Long getUpdatedBy() { return updatedBy; }
    public void setUpdatedBy(Long updatedBy) { this.updatedBy = updatedBy; }
}
