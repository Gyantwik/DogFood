package com.dogfood.export;

import com.dogfood.auth.UserRepository;
import com.dogfood.events.ScoreRepository;
import com.dogfood.events.Submission;
import com.dogfood.events.SubmissionRepository;
import com.dogfood.normalization.ZScoreNormalizationService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

import java.nio.charset.StandardCharsets;
import java.util.Collections;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.when;

class CsvExportServiceTest {

    private SubmissionRepository submissionRepository;
    private ScoreRepository scoreRepository;
    private UserRepository userRepository;
    private ZScoreNormalizationService normalizationService;
    private CsvExportService exportService;

    @BeforeEach
    void setUp() {
        submissionRepository = Mockito.mock(SubmissionRepository.class);
        scoreRepository = Mockito.mock(ScoreRepository.class);
        userRepository = Mockito.mock(UserRepository.class);
        normalizationService = Mockito.mock(ZScoreNormalizationService.class);

        exportService = new CsvExportService(
                submissionRepository,
                scoreRepository,
                userRepository,
                normalizationService
        );
    }

    @Test
    void testExportSubmissionsCsv() {
        Long eventId = 1L;
        Submission sub = new Submission(eventId, "Test Project", "Great tagline", "Desc", "https://github.com/test", "SUBMITTED");
        sub.setId(10L);

        when(submissionRepository.findByEventId(eventId)).thenReturn(Collections.singletonList(sub));

        byte[] csvBytes = exportService.exportSubmissionsCsv(eventId);
        String csvContent = new String(csvBytes, StandardCharsets.UTF_8);

        assertTrue(csvContent.contains("Submission ID"));
        assertTrue(csvContent.contains("Test Project"));
        assertTrue(csvContent.contains("https://github.com/test"));
    }
}
