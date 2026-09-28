package com.dogfood.events;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface EventCustomQuestionRepository extends JpaRepository<EventCustomQuestion, Long> {

    List<EventCustomQuestion> findByEventIdOrderByDisplayOrderAscIdAsc(Long eventId);

    void deleteByEventId(Long eventId);
}
