package com.dogfood.judging;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ScoreCriterionValueRepository extends JpaRepository<ScoreCriterionValue, Long> {
    List<ScoreCriterionValue> findByScoreId(Long scoreId);
    Optional<ScoreCriterionValue> findByScoreIdAndCriterionKey(Long scoreId, String criterionKey);
    void deleteByScoreId(Long scoreId);
}
