package com.dogfood.normalization;

import java.util.List;

public class NormalizationAnalysisDto {

    private Long eventId;
    private String eventName;
    private String normalizationMethod;
    private String formulaExplanation;
    private double neutralFallback;
    private int totalProjects;
    private List<ProjectRankAnalysisItem> projects;

    public NormalizationAnalysisDto() {}

    public static class ProjectRankAnalysisItem {
        private Long submissionId;
        private String title;
        private String track;
        private double rawScore;
        private double normalizedScore;
        private int judgeCount;
        private int rawRank;
        private int normalizedRank;
        private int rankChange; // positive = moved up, negative = moved down, 0 = unchanged

        public ProjectRankAnalysisItem() {}

        public ProjectRankAnalysisItem(Long submissionId, String title, String track, double rawScore, double normalizedScore, int judgeCount, int rawRank, int normalizedRank, int rankChange) {
            this.submissionId = submissionId;
            this.title = title;
            this.track = track;
            this.rawScore = rawScore;
            this.normalizedScore = normalizedScore;
            this.judgeCount = judgeCount;
            this.rawRank = rawRank;
            this.normalizedRank = normalizedRank;
            this.rankChange = rankChange;
        }

        public Long getSubmissionId() { return submissionId; }
        public void setSubmissionId(Long submissionId) { this.submissionId = submissionId; }

        public String getTitle() { return title; }
        public void setTitle(String title) { this.title = title; }

        public String getTrack() { return track; }
        public void setTrack(String track) { this.track = track; }

        public double getRawScore() { return rawScore; }
        public void setRawScore(double rawScore) { this.rawScore = rawScore; }

        public double getNormalizedScore() { return normalizedScore; }
        public void setNormalizedScore(double normalizedScore) { this.normalizedScore = normalizedScore; }

        public int getJudgeCount() { return judgeCount; }
        public void setJudgeCount(int judgeCount) { this.judgeCount = judgeCount; }

        public int getRawRank() { return rawRank; }
        public void setRawRank(int rawRank) { this.rawRank = rawRank; }

        public int getNormalizedRank() { return normalizedRank; }
        public void setNormalizedRank(int normalizedRank) { this.normalizedRank = normalizedRank; }

        public int getRankChange() { return rankChange; }
        public void setRankChange(int rankChange) { this.rankChange = rankChange; }
    }

    public Long getEventId() { return eventId; }
    public void setEventId(Long eventId) { this.eventId = eventId; }

    public String getEventName() { return eventName; }
    public void setEventName(String eventName) { this.eventName = eventName; }

    public String getNormalizationMethod() { return normalizationMethod; }
    public void setNormalizationMethod(String normalizationMethod) { this.normalizationMethod = normalizationMethod; }

    public String getFormulaExplanation() { return formulaExplanation; }
    public void setFormulaExplanation(String formulaExplanation) { this.formulaExplanation = formulaExplanation; }

    public double getNeutralFallback() { return neutralFallback; }
    public void setNeutralFallback(double neutralFallback) { this.neutralFallback = neutralFallback; }

    public int getTotalProjects() { return totalProjects; }
    public void setTotalProjects(int totalProjects) { this.totalProjects = totalProjects; }

    public List<ProjectRankAnalysisItem> getProjects() { return projects; }
    public void setProjects(List<ProjectRankAnalysisItem> projects) { this.projects = projects; }
}
