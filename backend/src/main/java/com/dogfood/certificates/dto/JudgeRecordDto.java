package com.dogfood.certificates.dto;

import java.time.Instant;

public class JudgeRecordDto {

    private Long judgeId;
    private String judgeName;
    private Long eventId;
    private String eventName;
    private int evaluatedCount;
    private Instant completedAt;
    private String signature;

    public JudgeRecordDto() {}

    public JudgeRecordDto(Long judgeId, String judgeName, Long eventId, String eventName, int evaluatedCount, Instant completedAt, String signature) {
        this.judgeId = judgeId;
        this.judgeName = judgeName;
        this.eventId = eventId;
        this.eventName = eventName;
        this.evaluatedCount = evaluatedCount;
        this.completedAt = completedAt;
        this.signature = signature;
    }

    public Long getJudgeId() { return judgeId; }
    public void setJudgeId(Long judgeId) { this.judgeId = judgeId; }

    public String getJudgeName() { return judgeName; }
    public void setJudgeName(String judgeName) { this.judgeName = judgeName; }

    public Long getEventId() { return eventId; }
    public void setEventId(Long eventId) { this.eventId = eventId; }

    public String getEventName() { return eventName; }
    public void setEventName(String eventName) { this.eventName = eventName; }

    public int getEvaluatedCount() { return evaluatedCount; }
    public void setEvaluatedCount(int evaluatedCount) { this.evaluatedCount = evaluatedCount; }

    public int getEvaluatedSubmissionsCount() { return evaluatedCount; }
    public void setEvaluatedSubmissionsCount(int count) { this.evaluatedCount = count; }

    public int getReviewCount() { return evaluatedCount; }
    public void setReviewCount(int count) { this.evaluatedCount = count; }

    public Instant getCompletedAt() { return completedAt; }
    public void setCompletedAt(Instant completedAt) { this.completedAt = completedAt; }

    public String getCompletionTimestamp() { return completedAt != null ? completedAt.toString() : null; }

    public String getSignature() { return signature; }
    public void setSignature(String signature) { this.signature = signature; }
}
