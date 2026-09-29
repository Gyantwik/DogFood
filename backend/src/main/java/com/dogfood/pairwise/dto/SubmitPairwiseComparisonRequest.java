package com.dogfood.pairwise.dto;

import jakarta.validation.constraints.NotNull;

public class SubmitPairwiseComparisonRequest {

    @NotNull(message = "projectAId is required")
    private Long projectAId;

    @NotNull(message = "projectBId is required")
    private Long projectBId;

    @NotNull(message = "winnerProjectId is required")
    private Long winnerProjectId;

    private Long trackId;

    public SubmitPairwiseComparisonRequest() {}

    public SubmitPairwiseComparisonRequest(Long projectAId, Long projectBId, Long winnerProjectId) {
        this.projectAId = projectAId;
        this.projectBId = projectBId;
        this.winnerProjectId = winnerProjectId;
    }

    public SubmitPairwiseComparisonRequest(Long projectAId, Long projectBId, Long winnerProjectId, Long trackId) {
        this.projectAId = projectAId;
        this.projectBId = projectBId;
        this.winnerProjectId = winnerProjectId;
        this.trackId = trackId;
    }

    public Long getProjectAId() { return projectAId; }
    public void setProjectAId(Long projectAId) { this.projectAId = projectAId; }

    public Long getProjectBId() { return projectBId; }
    public void setProjectBId(Long projectBId) { this.projectBId = projectBId; }

    public Long getWinnerProjectId() { return winnerProjectId; }
    public void setWinnerProjectId(Long winnerProjectId) { this.winnerProjectId = winnerProjectId; }

    public Long getTrackId() { return trackId; }
    public void setTrackId(Long trackId) { this.trackId = trackId; }
}
