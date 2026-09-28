package com.dogfood.judging;

import java.time.Instant;
import java.util.Map;

public class ScoreResponse {

    private Long id;
    private Long submissionId;
    private Long projectId; // alias
    private Long judgeId;
    private Double rawScore;
    private Double normalizedScore;
    private String comment;
    private Map<String, Double> criteria;
    private Instant createdAt;

    public ScoreResponse() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

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

    public Long getJudgeId() { return judgeId; }
    public void setJudgeId(Long judgeId) { this.judgeId = judgeId; }

    public Double getRawScore() { return rawScore; }
    public void setRawScore(Double rawScore) { this.rawScore = rawScore; }

    public Double getNormalizedScore() { return normalizedScore; }
    public void setNormalizedScore(Double normalizedScore) { this.normalizedScore = normalizedScore; }

    public String getComment() { return comment; }
    public void setComment(String comment) { this.comment = comment; }

    public Map<String, Double> getCriteria() { return criteria; }
    public void setCriteria(Map<String, Double> criteria) { this.criteria = criteria; }

    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
}
