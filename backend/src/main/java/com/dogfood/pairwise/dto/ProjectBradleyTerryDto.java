package com.dogfood.pairwise.dto;

public class ProjectBradleyTerryDto {

    private Long submissionId;
    private String title;
    private String track;
    private int rank;
    private double strength;
    private double rawStrength;
    private int comparisonCount;
    private int wins;
    private int losses;
    private double winRate;

    public ProjectBradleyTerryDto() {}

    public ProjectBradleyTerryDto(Long submissionId, String title, String track, int rank, double strength, double rawStrength, int comparisonCount, int wins, int losses) {
        this.submissionId = submissionId;
        this.title = title;
        this.track = track;
        this.rank = rank;
        this.strength = strength;
        this.rawStrength = rawStrength;
        this.comparisonCount = comparisonCount;
        this.wins = wins;
        this.losses = losses;
        this.winRate = comparisonCount > 0 ? (wins * 100.0 / comparisonCount) : 0.0;
    }

    public Long getSubmissionId() { return submissionId; }
    public void setSubmissionId(Long submissionId) { this.submissionId = submissionId; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public String getTrack() { return track; }
    public void setTrack(String track) { this.track = track; }

    public int getRank() { return rank; }
    public void setRank(int rank) { this.rank = rank; }

    public double getStrength() { return strength; }
    public void setStrength(double strength) { this.strength = strength; }

    public double getRawStrength() { return rawStrength; }
    public void setRawStrength(double rawStrength) { this.rawStrength = rawStrength; }

    public int getComparisonCount() { return comparisonCount; }
    public void setComparisonCount(int comparisonCount) { this.comparisonCount = comparisonCount; }

    public int getWins() { return wins; }
    public void setWins(int wins) { this.wins = wins; }

    public int getLosses() { return losses; }
    public void setLosses(int losses) { this.losses = losses; }

    public double getWinRate() { return winRate; }
    public void setWinRate(double winRate) { this.winRate = winRate; }
}
