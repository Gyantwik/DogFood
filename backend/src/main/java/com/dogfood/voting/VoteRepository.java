package com.dogfood.voting;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

@Repository
public interface VoteRepository extends JpaRepository<Vote, Long> {

    boolean existsByEventIdAndVoterIdentifier(Long eventId, String voterIdentifier);

    Optional<Vote> findByEventIdAndVoterIdentifier(Long eventId, String voterIdentifier);

    long countByEventIdAndSubmissionId(Long eventId, Long submissionId);

    long countByEventId(Long eventId);

    List<Vote> findByEventId(Long eventId);

    long countByIpAddressAndCreatedAtAfter(String ipAddress, Instant cutoff);

    @Query("SELECT v.submissionId, COUNT(v) FROM Vote v WHERE v.eventId = :eventId GROUP BY v.submissionId")
    List<Object[]> countVotesBySubmissionForEvent(@Param("eventId") Long eventId);
}
