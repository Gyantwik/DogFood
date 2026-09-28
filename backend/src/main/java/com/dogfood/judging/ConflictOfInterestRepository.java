package com.dogfood.judging;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ConflictOfInterestRepository extends JpaRepository<ConflictOfInterest, Long> {
    List<ConflictOfInterest> findByEventId(Long eventId);
    List<ConflictOfInterest> findByJudgeId(Long judgeId);
    Optional<ConflictOfInterest> findByJudgeIdAndSubmissionId(Long judgeId, Long submissionId);
    boolean existsByJudgeIdAndSubmissionId(Long judgeId, Long submissionId);
}
