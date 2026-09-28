package com.dogfood.certificates;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CertificateRepository extends JpaRepository<Certificate, Long> {
    Optional<Certificate> findByCertificateId(String certificateId);
    List<Certificate> findByEventId(Long eventId);
    List<Certificate> findByRecipientId(Long recipientId);
    List<Certificate> findByRecipientIdAndEventId(Long recipientId, Long eventId);
    boolean existsByCertificateId(String certificateId);
}
