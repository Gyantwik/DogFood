package com.dogfood.judging;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import java.util.List;

public class RubricConfigRequest {

    @NotEmpty(message = "Criteria list cannot be empty")
    @Valid
    private List<RubricCriterionDto> criteria;

    public RubricConfigRequest() {}

    public RubricConfigRequest(List<RubricCriterionDto> criteria) {
        this.criteria = criteria;
    }

    public List<RubricCriterionDto> getCriteria() { return criteria; }
    public void setCriteria(List<RubricCriterionDto> criteria) { this.criteria = criteria; }
}
