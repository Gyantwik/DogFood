package com.dogfood.comments;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface CommentRepository extends JpaRepository<Comment, Long> {
    List<Comment> findBySubmissionIdOrderByCreatedAtDesc(Long submissionId);
    List<Comment> findByEventIdOrderByCreatedAtDesc(Long eventId);
    long countBySubmissionId(Long submissionId);
}
