package com.dogfood.normalization;

import java.util.List;
import java.util.Map;

public class NormalizationProofDto {

    private Long eventId;
    private String formula;
    private String zScoreDefinition;
    private String zeroVarianceFallbackRule;
    private List<JudgeDistributionProof> judgeDistributions;
    private List<ProjectProofItem> projectCalculations;
    private String rankMovementExplanation;

    public NormalizationProofDto() {}

    public static class JudgeDistributionProof {
        private Long judgeId;
        private String judgeName;
        private int reviewCount;
        private double mean;
        private double stdDev;
        private boolean zeroVariance;
        private String appliedMethod;

        public JudgeDistributionProof() {}

        public JudgeDistributionProof(Long judgeId, String judgeName, int reviewCount, double mean, double stdDev, boolean zeroVariance, String appliedMethod) {
            this.judgeId = judgeId;
            this.judgeName = judgeName;
            this.reviewCount = reviewCount;
            this.mean = mean;
            this.stdDev = stdDev;
            this.zeroVariance = zeroVariance;
            this.appliedMethod = appliedMethod;
        }

        public Long getJudgeId() { return judgeId; }
        public void setJudgeId(Long judgeId) { this.judgeId = judgeId; }

        public String getJudgeName() { return judgeName; }
        public void setJudgeName(String judgeName) { this.judgeName = judgeName; }

        public int getReviewCount() { return reviewCount; }
        public void setReviewCount(int reviewCount) { this.reviewCount = reviewCount; }

        public double getMean() { return mean; }
        public void setMean(double mean) { this.mean = mean; }

        public double getStdDev() { return stdDev; }
        public void setStdDev(double stdDev) { this.stdDev = stdDev; }

        public boolean isZeroVariance() { return zeroVariance; }
        public void setZeroVariance(boolean zeroVariance) { this.zeroVariance = zeroVariance; }

        public String getAppliedMethod() { return appliedMethod; }
        public void setAppliedMethod(String appliedMethod) { this.appliedMethod = appliedMethod; }
    }

    public static class ProjectProofItem {
        private Long submissionId;
        private String title;
        private List<ScoreStepProof> scoreSteps;
        private double averageRawScore;
        private double averageNormalizedScore;
        private int rawRank;
        private int normalizedRank;

        public ProjectProofItem() {}

        public Long getSubmissionId() { return submissionId; }
        public void setSubmissionId(Long submissionId) { this.submissionId = submissionId; }

        public String getTitle() { return title; }
        public void setTitle(String title) { this.title = title; }

        public List<ScoreStepProof> getScoreSteps() { return scoreSteps; }
        public void setScoreSteps(List<ScoreStepProof> scoreSteps) { this.scoreSteps = scoreSteps; }

        public double getAverageRawScore() { return averageRawScore; }
        public void setAverageRawScore(double averageRawScore) { this.averageRawScore = averageRawScore; }

        public double getAverageNormalizedScore() { return averageNormalizedScore; }
        public void setAverageNormalizedScore(double averageNormalizedScore) { this.averageNormalizedScore = averageNormalizedScore; }

        public int getRawRank() { return rawRank; }
        public void setRawRank(int rawRank) { this.rawRank = rawRank; }

        public int getNormalizedRank() { return normalizedRank; }
        public void setNormalizedRank(int normalizedRank) { this.normalizedRank = normalizedRank; }
    }

    public static class ScoreStepProof {
        private Long judgeId;
        private double rawScore;
        private double judgeMean;
        private double judgeStdDev;
        private double zScore;
        private double tScore;
        private String note;

        public ScoreStepProof() {}

        public ScoreStepProof(Long judgeId, double rawScore, double judgeMean, double judgeStdDev, double zScore, double tScore, String note) {
            this.judgeId = judgeId;
            this.rawScore = rawScore;
            this.judgeMean = judgeMean;
            this.judgeStdDev = judgeStdDev;
            this.zScore = zScore;
            this.tScore = tScore;
            this.note = note;
        }

        public Long getJudgeId() { return judgeId; }
        public void setJudgeId(Long judgeId) { this.judgeId = judgeId; }

        public double getRawScore() { return rawScore; }
        public void setRawScore(double rawScore) { this.rawScore = rawScore; }

        public double getJudgeMean() { return judgeMean; }
        public void setJudgeMean(double judgeMean) { this.judgeMean = judgeMean; }

        public double getJudgeStdDev() { return judgeStdDev; }
        public void setJudgeStdDev(double judgeStdDev) { this.judgeStdDev = judgeStdDev; }

        public double getZScore() { return zScore; }
        public void setZScore(double zScore) { this.zScore = zScore; }

        public double getTScore() { return tScore; }
        public void setTScore(double tScore) { this.tScore = tScore; }

        public String getNote() { return note; }
        public void setNote(String note) { this.note = note; }
    }

    public Long getEventId() { return eventId; }
    public void setEventId(Long eventId) { this.eventId = eventId; }

    public String getFormula() { return formula; }
    public void setFormula(String formula) { this.formula = formula; }

    public String getZScoreDefinition() { return zScoreDefinition; }
    public void setZScoreDefinition(String zScoreDefinition) { this.zScoreDefinition = zScoreDefinition; }

    public String getZeroVarianceFallbackRule() { return zeroVarianceFallbackRule; }
    public void setZeroVarianceFallbackRule(String zeroVarianceFallbackRule) { this.zeroVarianceFallbackRule = zeroVarianceFallbackRule; }

    public List<JudgeDistributionProof> getJudgeDistributions() { return judgeDistributions; }
    public void setJudgeDistributions(List<JudgeDistributionProof> judgeDistributions) { this.judgeDistributions = judgeDistributions; }

    public List<ProjectProofItem> getProjectCalculations() { return projectCalculations; }
    public void setProjectCalculations(List<ProjectProofItem> projectCalculations) { this.projectCalculations = projectCalculations; }

    public String getRankMovementExplanation() { return rankMovementExplanation; }
    public void setRankMovementExplanation(String rankMovementExplanation) { this.rankMovementExplanation = rankMovementExplanation; }
}
