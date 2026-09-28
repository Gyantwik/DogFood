package com.dogfood.judging;

import java.util.List;

public class AssignJudgesRequest {

    private Long judgeId;
    private Long submissionId;
    private List<Long> judgeIds;
    private List<Long> submissionIds;
    private boolean autoAssign;
    private Integer reviewsPerProject;

    public AssignJudgesRequest() {}

    public Long getJudgeId() { return judgeId; }
    public void setJudgeId(Long judgeId) { this.judgeId = judgeId; }

    public Long getSubmissionId() { return submissionId; }
    public void setSubmissionId(Long submissionId) { this.submissionId = submissionId; }

    public List<Long> getJudgeIds() { return judgeIds; }
    public void setJudgeIds(List<Long> judgeIds) { this.judgeIds = judgeIds; }

    public List<Long> getSubmissionIds() { return submissionIds; }
    public void setSubmissionIds(List<Long> submissionIds) { this.submissionIds = submissionIds; }

    public boolean isAutoAssign() { return autoAssign; }
    public void setAutoAssign(boolean autoAssign) { this.autoAssign = autoAssign; }

    public Integer getReviewsPerProject() { return reviewsPerProject; }
    public void setReviewsPerProject(Integer reviewsPerProject) { this.reviewsPerProject = reviewsPerProject; }
}
