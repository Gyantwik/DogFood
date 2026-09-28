package com.dogfood.judging;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface JudgeTrackRepository extends JpaRepository<JudgeTrack, Long> {
    List<JudgeTrack> findByEventId(Long eventId);
    List<JudgeTrack> findByEventIdAndTrackId(Long eventId, Long trackId);
    List<JudgeTrack> findByJudgeId(Long judgeId);
    Optional<JudgeTrack> findByJudgeIdAndTrackId(Long judgeId, Long trackId);
    boolean existsByJudgeIdAndTrackId(Long judgeId, Long trackId);
}
