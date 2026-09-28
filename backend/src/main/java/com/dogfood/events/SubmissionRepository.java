package com.dogfood.events;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface SubmissionRepository extends JpaRepository<Submission, Long> {
    List<Submission> findByEventId(Long eventId);
    Optional<Submission> findByEventIdAndTitle(Long eventId, String title);
    List<Submission> findByEventIdAndStatus(Long eventId, String status);
    long countByEventIdAndStatus(Long eventId, String status);
    List<Submission> findByRepoUrl(String repoUrl);
    boolean existsByEventIdAndRepoUrl(Long eventId, String repoUrl);
    boolean existsByEventIdAndContentHash(Long eventId, String contentHash);
    Optional<Submission> findByEventIdAndContentHash(Long eventId, String contentHash);
    boolean existsByTeamIdAndStatus(Long teamId, String status);
    Optional<Submission> findFirstByEventIdAndCreatedByOrderByUpdatedAtDesc(Long eventId, Long createdBy);
    Optional<Submission> findFirstByEventIdAndTeamIdOrderByUpdatedAtDesc(Long eventId, Long teamId);

    @Query("SELECT s FROM Submission s WHERE s.eventId = :eventId " +
           "AND (:status IS NULL OR s.status = CAST(:status AS string)) " +
           "AND (:track IS NULL OR LOWER(s.track) = LOWER(CAST(:track AS string))) " +
           "AND (:query IS NULL OR LOWER(s.title) LIKE LOWER(CONCAT('%', CAST(:query AS string), '%')) " +
           "     OR LOWER(s.tagline) LIKE LOWER(CONCAT('%', CAST(:query AS string), '%')) " +
           "     OR LOWER(s.description) LIKE LOWER(CONCAT('%', CAST(:query AS string), '%')))")
    List<Submission> searchGallery(
            @Param("eventId") Long eventId,
            @Param("status") String status,
            @Param("track") String track,
            @Param("query") String query
    );
}
