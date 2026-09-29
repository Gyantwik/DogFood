package com.dogfood.pairwise;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PairwiseComparisonRepository extends JpaRepository<PairwiseComparison, Long> {

    List<PairwiseComparison> findByEventId(Long eventId);

    List<PairwiseComparison> findByEventIdAndTrackId(Long eventId, Long trackId);

    List<PairwiseComparison> findByJudgeIdAndEventId(Long judgeId, Long eventId);

    boolean existsByJudgeIdAndEventIdAndProjectAIdAndProjectBId(Long judgeId, Long eventId, Long projectAId, Long projectBId);

    long countByEventId(Long eventId);

    long countByJudgeIdAndEventId(Long judgeId, Long eventId);

    @Query("SELECT COUNT(DISTINCT pc.judgeId) FROM PairwiseComparison pc WHERE pc.eventId = :eventId")
    long countDistinctJudgesByEventId(@Param("eventId") Long eventId);

    @Query("SELECT COUNT(DISTINCT CONCAT(pc.projectAId, '-', pc.projectBId)) FROM PairwiseComparison pc WHERE pc.eventId = :eventId")
    long countDistinctPairsByEventId(@Param("eventId") Long eventId);
}
