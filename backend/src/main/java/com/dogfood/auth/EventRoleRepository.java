package com.dogfood.auth;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface EventRoleRepository extends JpaRepository<EventRole, Long> {
    List<EventRole> findByUserId(Long userId);
    List<EventRole> findByEventId(Long eventId);
    List<EventRole> findByEventIdAndRole(Long eventId, RoleType role);
    Optional<EventRole> findByUserIdAndEventIdAndRole(Long userId, Long eventId, RoleType role);
    Optional<EventRole> findByUserIdAndEventId(Long userId, Long eventId);
}
