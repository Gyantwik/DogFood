package com.dogfood.teams;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface TeamRepository extends JpaRepository<Team, Long> {
    List<Team> findByEventId(Long eventId);
    Optional<Team> findByInviteCode(String inviteCode);
    boolean existsByInviteCode(String inviteCode);
}
