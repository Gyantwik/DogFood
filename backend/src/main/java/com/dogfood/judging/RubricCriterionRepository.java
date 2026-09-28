package com.dogfood.judging;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface RubricCriterionRepository extends JpaRepository<RubricCriterion, Long> {
    List<RubricCriterion> findByRubricId(Long rubricId);
    Optional<RubricCriterion> findByRubricIdAndCriterionKey(Long rubricId, String criterionKey);
    void deleteByRubricId(Long rubricId);
}
