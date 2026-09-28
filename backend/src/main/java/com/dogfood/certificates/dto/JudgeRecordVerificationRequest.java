package com.dogfood.certificates.dto;

import jakarta.validation.constraints.NotNull;

public class JudgeRecordVerificationRequest {

    @NotNull(message = "judgeId is required")
    private Long judgeId;

    @NotNull(message = "eventId is required")
    private Long eventId;

    private Integer evaluatedCount;
    private Integer evaluatedSubmissionsCount;
    private String completedAt;
    private String completionTimestamp;

    @NotNull(message = "signature is required")
    private String signature;

    public JudgeRecordVerificationRequest() {}

    public Long getJudgeId() { return judgeId; }
    public void setJudgeId(Long judgeId) { this.judgeId = judgeId; }

    public Long getEventId() { return eventId; }
    public void setEventId(Long eventId) { this.eventId = eventId; }

    public int getEvaluatedCount() {
        if (evaluatedSubmissionsCount != null) return evaluatedSubmissionsCount;
        if (evaluatedCount != null) return evaluatedCount;
        return 0;
    }
    public void setEvaluatedCount(Integer evaluatedCount) { this.evaluatedCount = evaluatedCount; }

    public Integer getEvaluatedSubmissionsCount() { return evaluatedSubmissionsCount; }
    public void setEvaluatedSubmissionsCount(Integer evaluatedSubmissionsCount) { this.evaluatedSubmissionsCount = evaluatedSubmissionsCount; }

    public String getCompletedAt() {
        if (completedAt != null && !completedAt.isBlank()) return completedAt;
        if (completionTimestamp != null && !completionTimestamp.isBlank()) return completionTimestamp;
        return null;
    }
    public void setCompletedAt(String completedAt) { this.completedAt = completedAt; }

    public String getCompletionTimestamp() { return completionTimestamp; }
    public void setCompletionTimestamp(String completionTimestamp) { this.completionTimestamp = completionTimestamp; }

    public String getSignature() { return signature; }
    public void setSignature(String signature) { this.signature = signature; }
}
