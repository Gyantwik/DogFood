package com.dogfood.events;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;
import java.util.Optional;

@Repository
public interface ScoreRepository extends JpaRepository<Score, Long> {
    List<Score> findByEventId(Long eventId);
    List<Score> findBySubmissionId(Long submissionId);
    List<Score> findByJudgeId(Long judgeId);
    List<Score> findByEventIdAndJudgeId(Long eventId, Long judgeId);
    Optional<Score> findByJudgeIdAndSubmissionId(Long judgeId, Long submissionId);
    long countByEventId(Long eventId);
    long countByEventIdAndJudgeId(Long eventId, Long judgeId);
    long countByEventIdAndSubmissionId(Long eventId, Long submissionId);

    @Query("SELECT AVG(s.rawScore) FROM Score s WHERE s.eventId = :eventId")
    Double findAverageScoreByEventId(@Param("eventId") Long eventId);
}
