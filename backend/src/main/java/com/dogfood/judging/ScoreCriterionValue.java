package com.dogfood.judging;

import jakarta.persistence.*;

@Entity
@Table(name = "score_criteria_values", uniqueConstraints = {
    @UniqueConstraint(name = "uk_score_criterion", columnNames = {"score_id", "criterion_key"})
})
public class ScoreCriterionValue {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "score_id", nullable = false)
    private Long scoreId;

    @Column(name = "criterion_key", nullable = false, length = 50)
    private String criterionKey;

    @Column(name = "score_value", nullable = false)
    private Double scoreValue;

    public ScoreCriterionValue() {}

    public ScoreCriterionValue(Long scoreId, String criterionKey, Double scoreValue) {
        this.scoreId = scoreId;
        this.criterionKey = criterionKey;
        this.scoreValue = scoreValue;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getScoreId() { return scoreId; }
    public void setScoreId(Long scoreId) { this.scoreId = scoreId; }

    public String getCriterionKey() { return criterionKey; }
    public void setCriterionKey(String criterionKey) { this.criterionKey = criterionKey; }

    public Double getScoreValue() { return scoreValue; }
    public void setScoreValue(Double scoreValue) { this.scoreValue = scoreValue; }
}
