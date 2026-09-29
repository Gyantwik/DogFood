package com.dogfood.pairwise.dto;

public class NextPairResponse {

    private boolean hasPair;
    private String message;
    private Long eventId;
    private Long trackId;
    private String trackName;
    private ProjectCardDto projectA;
    private ProjectCardDto projectB;
    private int completedCount;
    private int remainingAvailable;
    private int totalEligibleProjects;

    public NextPairResponse() {}

    public static NextPairResponse noMorePairs(String message, int completedCount, int totalEligible) {
        NextPairResponse res = new NextPairResponse();
        res.setHasPair(false);
        res.setMessage(message);
        res.setCompletedCount(completedCount);
        res.setRemainingAvailable(0);
        res.setTotalEligibleProjects(totalEligible);
        return res;
    }

    public static class ProjectCardDto {
        private Long id;
        private String title;
        private String tagline;
        private String description;
        private String track;
        private String repoUrl;
        private String demoUrl;
        private String techStack;
        private String thumbnailUrl;

        public ProjectCardDto() {}

        public ProjectCardDto(Long id, String title, String tagline, String description, String track, String repoUrl, String demoUrl, String techStack, String thumbnailUrl) {
            this.id = id;
            this.title = title;
            this.tagline = tagline;
            this.description = description;
            this.track = track;
            this.repoUrl = repoUrl;
            this.demoUrl = demoUrl;
            this.techStack = techStack;
            this.thumbnailUrl = thumbnailUrl;
        }

        public Long getId() { return id; }
        public void setId(Long id) { this.id = id; }

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

        public String getThumbnailUrl() { return thumbnailUrl; }
        public void setThumbnailUrl(String thumbnailUrl) { this.thumbnailUrl = thumbnailUrl; }
    }

    public boolean isHasPair() { return hasPair; }
    public void setHasPair(boolean hasPair) { this.hasPair = hasPair; }

    public boolean isPairAvailable() { return hasPair; }
    public void setPairAvailable(boolean pairAvailable) { this.hasPair = pairAvailable; }

    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }

    public Long getEventId() { return eventId; }
    public void setEventId(Long eventId) { this.eventId = eventId; }

    public Long getTrackId() { return trackId; }
    public void setTrackId(Long trackId) { this.trackId = trackId; }

    public String getTrackName() { return trackName; }
    public void setTrackName(String trackName) { this.trackName = trackName; }

    public ProjectCardDto getProjectA() { return projectA; }
    public void setProjectA(ProjectCardDto projectA) { this.projectA = projectA; }

    public ProjectCardDto getProjectB() { return projectB; }
    public void setProjectB(ProjectCardDto projectB) { this.projectB = projectB; }

    public int getCompletedCount() { return completedCount; }
    public void setCompletedCount(int completedCount) { this.completedCount = completedCount; }

    public int getRemainingAvailable() { return remainingAvailable; }
    public void setRemainingAvailable(int remainingAvailable) { this.remainingAvailable = remainingAvailable; }

    public int getTotalEligibleProjects() { return totalEligibleProjects; }
    public void setTotalEligibleProjects(int totalEligibleProjects) { this.totalEligibleProjects = totalEligibleProjects; }
}
