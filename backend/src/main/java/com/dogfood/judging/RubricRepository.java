package com.dogfood.judging;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface RubricRepository extends JpaRepository<Rubric, Long> {
    Optional<Rubric> findByEventId(Long eventId);
    boolean existsByEventId(Long eventId);
}
