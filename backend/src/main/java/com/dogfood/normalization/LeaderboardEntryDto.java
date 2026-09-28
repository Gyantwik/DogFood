package com.dogfood.normalization;

public class LeaderboardEntryDto {

    private int rank;
    private Long submissionId;
    private String title;
    private String tagline;
    private double finalScore;
    private double rawScore;
    private double zScore;
    private int reviewsCount;

    public LeaderboardEntryDto() {}

    public LeaderboardEntryDto(int rank, Long submissionId, String title, String tagline, double finalScore, double rawScore, double zScore, int reviewsCount) {
        this.rank = rank;
        this.submissionId = submissionId;
        this.title = title;
        this.tagline = tagline;
        this.finalScore = finalScore;
        this.rawScore = rawScore;
        this.zScore = zScore;
        this.reviewsCount = reviewsCount;
    }

    public int getRank() { return rank; }
    public void setRank(int rank) { this.rank = rank; }

    public Long getSubmissionId() { return submissionId; }
    public void setSubmissionId(Long submissionId) { this.submissionId = submissionId; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public String getTagline() { return tagline; }
    public void setTagline(String tagline) { this.tagline = tagline; }

    public double getFinalScore() { return finalScore; }
    public void setFinalScore(double finalScore) { this.finalScore = finalScore; }

    public double getRawScore() { return rawScore; }
    public void setRawScore(double rawScore) { this.rawScore = rawScore; }

    public double getZScore() { return zScore; }
    public void setZScore(double zScore) { this.zScore = zScore; }

    public int getReviewsCount() { return reviewsCount; }
    public void setReviewsCount(int reviewsCount) { this.reviewsCount = reviewsCount; }
}
