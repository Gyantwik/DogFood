package com.dogfood.normalization;

public class ScoreDistributionDto {

    private Long judgeId;
    private String judgeName;
    private double rawMean;
    private double rawStdDev;
    private double normalizedMean;
    private int reviewsCount;
    private boolean zeroVariance;

    public ScoreDistributionDto() {}

    public ScoreDistributionDto(Long judgeId, String judgeName, double rawMean, double rawStdDev, double normalizedMean, int reviewsCount, boolean zeroVariance) {
        this.judgeId = judgeId;
        this.judgeName = judgeName;
        this.rawMean = rawMean;
        this.rawStdDev = rawStdDev;
        this.normalizedMean = normalizedMean;
        this.reviewsCount = reviewsCount;
        this.zeroVariance = zeroVariance;
    }

    public Long getJudgeId() { return judgeId; }
    public void setJudgeId(Long judgeId) { this.judgeId = judgeId; }

    public String getJudgeName() { return judgeName; }
    public void setJudgeName(String judgeName) { this.judgeName = judgeName; }

    public double getRawMean() { return rawMean; }
    public void setRawMean(double rawMean) { this.rawMean = rawMean; }

    public double getRawStdDev() { return rawStdDev; }
    public void setRawStdDev(double rawStdDev) { this.rawStdDev = rawStdDev; }

    public double getNormalizedMean() { return normalizedMean; }
    public void setNormalizedMean(double normalizedMean) { this.normalizedMean = normalizedMean; }

    public int getReviewsCount() { return reviewsCount; }
    public void setReviewsCount(int reviewsCount) { this.reviewsCount = reviewsCount; }

    public boolean isZeroVariance() { return zeroVariance; }
    public void setZeroVariance(boolean zeroVariance) { this.zeroVariance = zeroVariance; }
}
