package com.dogfood.judging;

import java.util.Map;

public class SubmitScoreRequest {

    private Long submissionId;
    private Long projectId; // alias
    private Double rawScore;
    private Double score; // alias
    private Map<String, Double> criteria;
    private Map<String, Double> criteriaBreakdown; // alias
    private String comment;
    private Long eventId;
    private Long judgeId;

    public Long getEventId() { return eventId; }
    public void setEventId(Long eventId) { this.eventId = eventId; }

    public Long getJudgeId() { return judgeId; }
    public void setJudgeId(Long judgeId) { this.judgeId = judgeId; }

    public SubmitScoreRequest() {}

    public Long getSubmissionId() {
        return submissionId != null ? submissionId : projectId;
    }
    public void setSubmissionId(Long submissionId) { this.submissionId = submissionId; }

    public Long getProjectId() { return projectId; }
    public void setProjectId(Long projectId) { this.projectId = projectId; }

    public Double getRawScore() {
        return rawScore != null ? rawScore : score;
    }
    public void setRawScore(Double rawScore) { this.rawScore = rawScore; }

    public Double getScore() { return score; }
    public void setScore(Double score) { this.score = score; }

    public Map<String, Double> getCriteria() {
        return criteria != null ? criteria : criteriaBreakdown;
    }
    public void setCriteria(Map<String, Double> criteria) { this.criteria = criteria; }

    public Map<String, Double> getCriteriaBreakdown() { return criteriaBreakdown; }
    public void setCriteriaBreakdown(Map<String, Double> criteriaBreakdown) { this.criteriaBreakdown = criteriaBreakdown; }

    public String getComment() { return comment; }
    public void setComment(String comment) { this.comment = comment; }
}
