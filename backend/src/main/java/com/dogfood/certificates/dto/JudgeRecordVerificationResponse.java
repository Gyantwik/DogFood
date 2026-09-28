package com.dogfood.certificates.dto;

public class JudgeRecordVerificationResponse {

    private boolean valid;
    private Long judgeId;
    private String judgeName;
    private Long eventId;
    private String eventName;
    private int evaluatedCount;
    private String completedAt;
    private String message;

    public JudgeRecordVerificationResponse() {}

    public static JudgeRecordVerificationResponse valid(Long judgeId, String judgeName, Long eventId, String eventName, int evaluatedCount, String completedAt) {
        JudgeRecordVerificationResponse res = new JudgeRecordVerificationResponse();
        res.setValid(true);
        res.setJudgeId(judgeId);
        res.setJudgeName(judgeName);
        res.setEventId(eventId);
        res.setEventName(eventName);
        res.setEvaluatedCount(evaluatedCount);
        res.setCompletedAt(completedAt);
        res.setMessage("Judge participation record signature verified successfully. Record is authentic and untampered.");
        return res;
    }

    public static JudgeRecordVerificationResponse invalid(String message) {
        JudgeRecordVerificationResponse res = new JudgeRecordVerificationResponse();
        res.setValid(false);
        res.setMessage(message != null ? message : "Invalid signature or tampered participation record.");
        return res;
    }

    public boolean isValid() { return valid; }
    public void setValid(boolean valid) { this.valid = valid; }

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

    public String getCompletedAt() { return completedAt; }
    public void setCompletedAt(String completedAt) { this.completedAt = completedAt; }

    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }
}
