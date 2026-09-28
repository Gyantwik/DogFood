package com.dogfood.submissions;

public class UpdateSubmissionRequest {

    private String title;
    private String name;
    private String tagline;
    private String description;
    private String track;
    private String repoUrl;
    private String repo_url;
    private String demoUrl;
    private String demo_url;
    private Object techStack;
    private String status;

    private String thumbnailUrl;
    private String thumbnail;
    private String thumbnail_url;

    private Object galleryImages;
    private Object gallery_images;

    private String demoVideoUrl;
    private String demo_video_url;
    private String videoUrl;

    private String liveLink;
    private String live_link;
    private String liveUrl;

    private Object customAnswers;
    private Object custom_answers;

    public UpdateSubmissionRequest() {}

    public UpdateSubmissionRequest(String title, String tagline, String description, String track,
                                   String repoUrl, String demoUrl, Object techStack, String status) {
        this.title = title;
        this.tagline = tagline;
        this.description = description;
        this.track = track;
        this.repoUrl = repoUrl;
        this.demoUrl = demoUrl;
        this.techStack = techStack;
        this.status = status;
    }

    public String getTitle() {
        return (title != null && !title.isBlank()) ? title : name;
    }
    public void setTitle(String title) { this.title = title; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getTagline() { return tagline; }
    public void setTagline(String tagline) { this.tagline = tagline; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public String getTrack() { return track; }
    public void setTrack(String track) { this.track = track; }

    public String getRepoUrl() {
        return (repoUrl != null && !repoUrl.isBlank()) ? repoUrl : repo_url;
    }
    public void setRepoUrl(String repoUrl) { this.repoUrl = repoUrl; }

    public String getRepo_url() { return repo_url; }
    public void setRepo_url(String repo_url) { this.repo_url = repo_url; }

    public String getDemoUrl() {
        return (demoUrl != null && !demoUrl.isBlank()) ? demoUrl : demo_url;
    }
    public void setDemoUrl(String demoUrl) { this.demoUrl = demoUrl; }

    public String getDemo_url() { return demo_url; }
    public void setDemo_url(String demo_url) { this.demo_url = demo_url; }

    public Object getTechStack() { return techStack; }
    public void setTechStack(Object techStack) { this.techStack = techStack; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getThumbnailUrl() {
        if (thumbnailUrl != null && !thumbnailUrl.isBlank()) return thumbnailUrl;
        if (thumbnail != null && !thumbnail.isBlank()) return thumbnail;
        return thumbnail_url;
    }
    public void setThumbnailUrl(String thumbnailUrl) { this.thumbnailUrl = thumbnailUrl; }
    public String getThumbnail() { return getThumbnailUrl(); }
    public void setThumbnail(String thumbnail) { this.thumbnailUrl = thumbnail; }
    public String getThumbnail_url() { return thumbnail_url; }
    public void setThumbnail_url(String thumbnail_url) { this.thumbnail_url = thumbnail_url; }

    public Object getGalleryImages() {
        return galleryImages != null ? galleryImages : gallery_images;
    }
    public void setGalleryImages(Object galleryImages) { this.galleryImages = galleryImages; }
    public Object getGallery_images() { return gallery_images; }
    public void setGallery_images(Object gallery_images) { this.gallery_images = gallery_images; }

    public String getDemoVideoUrl() {
        if (demoVideoUrl != null && !demoVideoUrl.isBlank()) return demoVideoUrl;
        if (demo_video_url != null && !demo_video_url.isBlank()) return demo_video_url;
        return videoUrl;
    }
    public void setDemoVideoUrl(String demoVideoUrl) { this.demoVideoUrl = demoVideoUrl; }
    public String getDemo_video_url() { return demo_video_url; }
    public void setDemo_video_url(String demo_video_url) { this.demo_video_url = demo_video_url; }
    public String getVideoUrl() { return videoUrl; }
    public void setVideoUrl(String videoUrl) { this.videoUrl = videoUrl; }

    public String getLiveLink() {
        if (liveLink != null && !liveLink.isBlank()) return liveLink;
        if (live_link != null && !live_link.isBlank()) return live_link;
        return liveUrl;
    }
    public void setLiveLink(String liveLink) { this.liveLink = liveLink; }
    public String getLive_link() { return live_link; }
    public void setLive_link(String live_link) { this.live_link = live_link; }
    public String getLiveUrl() { return liveUrl; }
    public void setLiveUrl(String liveUrl) { this.liveUrl = liveUrl; }

    public Object getCustomAnswers() {
        return customAnswers != null ? customAnswers : custom_answers;
    }
    public void setCustomAnswers(Object customAnswers) { this.customAnswers = customAnswers; }
    public Object getCustom_answers() { return custom_answers; }
    public void setCustom_answers(Object custom_answers) { this.custom_answers = custom_answers; }
}
