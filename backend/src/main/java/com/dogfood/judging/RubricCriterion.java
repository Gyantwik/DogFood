package com.dogfood.judging;

import jakarta.persistence.*;

@Entity
@Table(name = "rubric_criteria", uniqueConstraints = {
    @UniqueConstraint(name = "uk_rubric_key", columnNames = {"rubric_id", "criterion_key"})
})
public class RubricCriterion {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "rubric_id", nullable = false)
    private Rubric rubric;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(name = "criterion_key", nullable = false, length = 50)
    private String criterionKey;

    @Column(nullable = false)
    private Double weight;

    @Column(name = "min_score")
    private Double minScore = 1.0;

    @Column(name = "max_score")
    private Double maxScore = 5.0;

    public RubricCriterion() {}

    public RubricCriterion(Rubric rubric, String name, String criterionKey, Double weight, Double minScore, Double maxScore) {
        this.rubric = rubric;
        this.name = name;
        this.criterionKey = criterionKey;
        this.weight = weight;
        this.minScore = minScore != null ? minScore : 1.0;
        this.maxScore = maxScore != null ? maxScore : 5.0;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Rubric getRubric() { return rubric; }
    public void setRubric(Rubric rubric) { this.rubric = rubric; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getCriterionKey() { return criterionKey; }
    public void setCriterionKey(String criterionKey) { this.criterionKey = criterionKey; }

    public Double getWeight() { return weight; }
    public void setWeight(Double weight) { this.weight = weight; }

    public Double getMinScore() { return minScore; }
    public void setMinScore(Double minScore) { this.minScore = minScore; }

    public Double getMaxScore() { return maxScore; }
    public void setMaxScore(Double maxScore) { this.maxScore = maxScore; }
}
