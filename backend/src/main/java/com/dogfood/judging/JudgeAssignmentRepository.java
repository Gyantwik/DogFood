package com.dogfood.judging;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface JudgeAssignmentRepository extends JpaRepository<JudgeAssignment, Long> {

    List<JudgeAssignment> findByEventId(Long eventId);
    List<JudgeAssignment> findByJudgeId(Long judgeId);
    List<JudgeAssignment> findBySubmissionId(Long submissionId);
    Optional<JudgeAssignment> findByJudgeIdAndSubmissionId(Long judgeId, Long submissionId);
    boolean existsByJudgeIdAndSubmissionId(Long judgeId, Long submissionId);

    long countByEventId(Long eventId);
    long countByJudgeId(Long judgeId);
    long countByJudgeIdAndStatus(Long judgeId, String status);
    long countByEventIdAndStatus(Long eventId, String status);
    long countByEventIdAndJudgeId(Long eventId, Long judgeId);
    long countByEventIdAndJudgeIdAndStatus(Long eventId, Long judgeId, String status);
    List<JudgeAssignment> findByEventIdAndJudgeId(Long eventId, Long judgeId);

    // Strictly DB-Scoped Judge Isolation Query excluding conflicted submissions
    @Query("SELECT ja FROM JudgeAssignment ja " +
           "WHERE ja.judgeId = :judgeId AND ja.status IN ('ASSIGNED', 'COMPLETED') " +
           "AND NOT EXISTS (" +
           "   SELECT coi FROM ConflictOfInterest coi " +
           "   WHERE coi.judgeId = :judgeId AND coi.submissionId = ja.submissionId" +
           ")")
    List<JudgeAssignment> findActiveAssignmentsForJudge(@Param("judgeId") Long judgeId);

    // Strictly DB-Scoped Judge Isolation Query for authenticated judge AND event excluding conflicted submissions
    @Query("SELECT ja FROM JudgeAssignment ja " +
           "WHERE ja.judgeId = :judgeId AND ja.eventId = :eventId AND ja.status IN ('ASSIGNED', 'COMPLETED') " +
           "AND NOT EXISTS (" +
           "   SELECT coi FROM ConflictOfInterest coi " +
           "   WHERE coi.judgeId = :judgeId AND coi.submissionId = ja.submissionId" +
           ")")
    List<JudgeAssignment> findActiveAssignmentsForJudgeAndEvent(@Param("judgeId") Long judgeId, @Param("eventId") Long eventId);
}
