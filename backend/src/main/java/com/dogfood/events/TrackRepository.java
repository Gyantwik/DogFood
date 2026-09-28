package com.dogfood.events;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface TrackRepository extends JpaRepository<Track, Long> {
    List<Track> findByEventId(Long eventId);
    Optional<Track> findByEventIdAndName(Long eventId, String name);
}
