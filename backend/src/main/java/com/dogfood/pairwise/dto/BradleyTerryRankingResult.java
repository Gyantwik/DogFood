package com.dogfood.pairwise.dto;

import java.util.ArrayList;
import java.util.List;

public class BradleyTerryRankingResult {

    private Long eventId;
    private String status;
    private String message;
    private boolean connected;
    private int componentCount;
    private int totalProjects;
    private int totalComparisons;
    private int uniquePairsCompared;
    private double coveragePercentage;
    private int iterations;
    private double convergenceDelta;
    private List<ProjectBradleyTerryDto> rankings = new ArrayList<>();

    public BradleyTerryRankingResult() {}

    public Long getEventId() { return eventId; }
    public void setEventId(Long eventId) { this.eventId = eventId; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }

    public boolean isConnected() { return connected; }
    public void setConnected(boolean connected) { this.connected = connected; }

    public int getComponentCount() { return componentCount; }
    public void setComponentCount(int componentCount) { this.componentCount = componentCount; }

    public int getTotalProjects() { return totalProjects; }
    public void setTotalProjects(int totalProjects) { this.totalProjects = totalProjects; }

    public int getTotalComparisons() { return totalComparisons; }
    public void setTotalComparisons(int totalComparisons) { this.totalComparisons = totalComparisons; }

    public int getUniquePairsCompared() { return uniquePairsCompared; }
    public void setUniquePairsCompared(int uniquePairsCompared) { this.uniquePairsCompared = uniquePairsCompared; }

    public double getCoveragePercentage() { return coveragePercentage; }
    public void setCoveragePercentage(double coveragePercentage) { this.coveragePercentage = coveragePercentage; }

    public int getIterations() { return iterations; }
    public void setIterations(int iterations) { this.iterations = iterations; }

    public double getConvergenceDelta() { return convergenceDelta; }
    public void setConvergenceDelta(double convergenceDelta) { this.convergenceDelta = convergenceDelta; }

    public List<ProjectBradleyTerryDto> getRankings() { return rankings; }
    public void setRankings(List<ProjectBradleyTerryDto> rankings) { this.rankings = rankings; }
}
