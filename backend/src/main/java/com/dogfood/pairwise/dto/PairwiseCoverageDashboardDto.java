package com.dogfood.pairwise.dto;

import java.util.ArrayList;
import java.util.List;

public class PairwiseCoverageDashboardDto {

    private Long eventId;
    private boolean pairwiseEnabled;
    private int totalEligibleProjects;
    private int totalPossiblePairs;
    private int uniquePairsCompared;
    private double coveragePercentage;
    private int participatingJudges;
    private int totalComparisonsCompleted;
    private List<Long> projectsWithNoComparisons = new ArrayList<>();
    private List<Long> projectsWithLowComparisons = new ArrayList<>();
    private int disconnectedComponents;
    private boolean graphConnected;
    private String coverageHealthStatus;

    public PairwiseCoverageDashboardDto() {}

    public Long getEventId() { return eventId; }
    public void setEventId(Long eventId) { this.eventId = eventId; }

    public boolean isPairwiseEnabled() { return pairwiseEnabled; }
    public void setPairwiseEnabled(boolean pairwiseEnabled) { this.pairwiseEnabled = pairwiseEnabled; }

    public int getTotalEligibleProjects() { return totalEligibleProjects; }
    public void setTotalEligibleProjects(int totalEligibleProjects) { this.totalEligibleProjects = totalEligibleProjects; }

    public int getTotalPossiblePairs() { return totalPossiblePairs; }
    public void setTotalPossiblePairs(int totalPossiblePairs) { this.totalPossiblePairs = totalPossiblePairs; }

    public int getUniquePairsCompared() { return uniquePairsCompared; }
    public void setUniquePairsCompared(int uniquePairsCompared) { this.uniquePairsCompared = uniquePairsCompared; }

    public double getCoveragePercentage() { return coveragePercentage; }
    public void setCoveragePercentage(double coveragePercentage) { this.coveragePercentage = coveragePercentage; }

    public int getParticipatingJudges() { return participatingJudges; }
    public void setParticipatingJudges(int participatingJudges) { this.participatingJudges = participatingJudges; }

    public int getTotalComparisonsCompleted() { return totalComparisonsCompleted; }
    public void setTotalComparisonsCompleted(int totalComparisonsCompleted) { this.totalComparisonsCompleted = totalComparisonsCompleted; }

    public List<Long> getProjectsWithNoComparisons() { return projectsWithNoComparisons; }
    public void setProjectsWithNoComparisons(List<Long> projectsWithNoComparisons) { this.projectsWithNoComparisons = projectsWithNoComparisons; }

    public List<Long> getProjectsWithLowComparisons() { return projectsWithLowComparisons; }
    public void setProjectsWithLowComparisons(List<Long> projectsWithLowComparisons) { this.projectsWithLowComparisons = projectsWithLowComparisons; }

    public int getDisconnectedComponents() { return disconnectedComponents; }
    public void setDisconnectedComponents(int disconnectedComponents) { this.disconnectedComponents = disconnectedComponents; }

    public boolean isGraphConnected() { return graphConnected; }
    public void setGraphConnected(boolean graphConnected) { this.graphConnected = graphConnected; }

    public String getCoverageHealthStatus() { return coverageHealthStatus; }
    public void setCoverageHealthStatus(String coverageHealthStatus) { this.coverageHealthStatus = coverageHealthStatus; }

    public int getTotalProjects() { return totalEligibleProjects; }
    public void setTotalProjects(int totalProjects) { this.totalEligibleProjects = totalProjects; }

    public int getComponentCount() { return disconnectedComponents; }
    public void setComponentCount(int componentCount) { this.disconnectedComponents = componentCount; }

    public boolean isConnected() { return graphConnected; }
    public void setConnected(boolean connected) { this.graphConnected = connected; }
}
