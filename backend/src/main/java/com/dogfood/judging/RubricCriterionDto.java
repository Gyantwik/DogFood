package com.dogfood.judging;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public class RubricCriterionDto {

    private Long id;

    @NotBlank(message = "Criterion name is required")
    private String name;

    @NotBlank(message = "Criterion key is required")
    private String key;

    @NotNull(message = "Weight is required")
    private Double weight;

    private Double minScore = 1.0;
    private Double maxScore = 5.0;

    public RubricCriterionDto() {}

    public RubricCriterionDto(String name, String key, Double weight) {
        this.name = name;
        this.key = key;
        this.weight = weight;
        this.minScore = 1.0;
        this.maxScore = 5.0;
    }

    public RubricCriterionDto(Long id, String name, String key, Double weight, Double minScore, Double maxScore) {
        this.id = id;
        this.name = name;
        this.key = key;
        this.weight = weight;
        this.minScore = minScore != null ? minScore : 1.0;
        this.maxScore = maxScore != null ? maxScore : 5.0;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getKey() { return key; }
    public void setKey(String key) { this.key = key; }

    public Double getWeight() { return weight; }
    public void setWeight(Double weight) { this.weight = weight; }

    public Double getMinScore() { return minScore; }
    public void setMinScore(Double minScore) { this.minScore = minScore; }

    public Double getMaxScore() { return maxScore; }
    public void setMaxScore(Double maxScore) { this.maxScore = maxScore; }
}
