package com.dogfood.normalization;

import com.dogfood.auth.UserRepository;
import com.dogfood.common.audit.AuditLogService;
import com.dogfood.events.Score;
import com.dogfood.events.ScoreRepository;
import com.dogfood.events.Submission;
import com.dogfood.events.SubmissionRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

import java.util.Arrays;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

class ZScoreNormalizationServiceTest {

    private ScoreRepository scoreRepository;
    private SubmissionRepository submissionRepository;
    private UserRepository userRepository;
    private AuditLogService auditLogService;
    private ZScoreNormalizationService normalizationService;

    @BeforeEach
    void setUp() {
        scoreRepository = Mockito.mock(ScoreRepository.class);
        submissionRepository = Mockito.mock(SubmissionRepository.class);
        userRepository = Mockito.mock(UserRepository.class);
        auditLogService = Mockito.mock(AuditLogService.class);

        normalizationService = new ZScoreNormalizationService(
                scoreRepository,
                submissionRepository,
                userRepository,
                auditLogService
        );
    }

    @Test
    void testNormalizeScores_StandardDistribution() {
        Long eventId = 1L;
        // Judge 1 gave scores 60, 80, 100 (Mean = 80, stdDev = 20)
        Score s1 = new Score(eventId, 101L, 1L, 60.0, "c1");
        Score s2 = new Score(eventId, 102L, 1L, 80.0, "c2");
        Score s3 = new Score(eventId, 103L, 1L, 100.0, "c3");

        when(scoreRepository.findByEventId(eventId)).thenReturn(Arrays.asList(s1, s2, s3));

        normalizationService.normalizeScoresForEvent(eventId);

        // Verify z-score mapping: 50 + 10 * z
        // For s1: z = (60 - 80) / 20 = -1.0 -> 40.0
        // For s2: z = (80 - 80) / 20 = 0.0 -> 50.0
        // For s3: z = (100 - 80) / 20 = 1.0 -> 60.0
        assertEquals(40.0, s1.getNormalizedScore(), 0.1);
        assertEquals(50.0, s2.getNormalizedScore(), 0.1);
        assertEquals(60.0, s3.getNormalizedScore(), 0.1);

        verify(scoreRepository).saveAll(anyList());
    }

    @Test
    void testNormalizeScores_ZeroVarianceFallback() {
        Long eventId = 1L;
        // Judge 2 gave all identical scores: 4.0, 4.0, 4.0 (stdDev = 0)
        Score s1 = new Score(eventId, 101L, 2L, 4.0, "c1");
        Score s2 = new Score(eventId, 102L, 2L, 4.0, "c2");
        Score s3 = new Score(eventId, 103L, 2L, 4.0, "c3");

        when(scoreRepository.findByEventId(eventId)).thenReturn(Arrays.asList(s1, s2, s3));

        normalizationService.normalizeScoresForEvent(eventId);

        // Zero-variance fallback: on standard T-score scale (50 + 10*z), zero variance maps to z=0 -> T=50.0
        assertEquals(50.0, s1.getNormalizedScore(), 0.001);
        assertEquals(50.0, s2.getNormalizedScore(), 0.001);
        assertEquals(50.0, s3.getNormalizedScore(), 0.001);

        verify(auditLogService).logAction(eq(2L), eq(eventId), eq("ZERO_VARIANCE_FALLBACK"), anyString());
    }

    @Test
    void testNormalAndFlatJudges_NoScaleMixing() {
        Long eventId = 1L;

        Submission sub1 = new Submission(eventId, 1L, 10L, "Project Alpha", "tag1", "desc1", "track1", "repo", "demo", "tech", "SUBMITTED", false, null);
        sub1.setId(101L);
        Submission sub2 = new Submission(eventId, 1L, 20L, "Project Beta", "tag2", "desc2", "track1", "repo", "demo", "tech", "SUBMITTED", false, null);
        sub2.setId(102L);

        // Judge 1 (normal grading: gives 5.0 to Alpha, 1.0 to Beta -> Mean=3.0, stdDev=2.8284)
        // Alpha z = (5 - 3) / 2.8284 = +0.7071 -> T = 57.07
        // Beta z = (1 - 3) / 2.8284 = -0.7071 -> T = 42.93
        Score s1Alpha = new Score(eventId, 101L, 1L, 5.0, "Great Alpha");
        Score s1Beta = new Score(eventId, 102L, 1L, 1.0, "Poor Beta");

        // Judge 2 (flat grading: gives 4.0 to Alpha, 4.0 to Beta -> stdDev=0 -> T = 50.0 for both)
        Score s2Alpha = new Score(eventId, 101L, 2L, 4.0, "Flat Alpha");
        Score s2Beta = new Score(eventId, 102L, 2L, 4.0, "Flat Beta");

        List<Score> allScores = Arrays.asList(s1Alpha, s1Beta, s2Alpha, s2Beta);
        when(scoreRepository.findByEventId(eventId)).thenReturn(allScores);
        when(submissionRepository.findByEventId(eventId)).thenReturn(Arrays.asList(sub1, sub2));

        // 1. Normalize scores
        normalizationService.normalizeScoresForEvent(eventId);

        assertEquals(57.07, s1Alpha.getNormalizedScore(), 0.1);
        assertEquals(42.93, s1Beta.getNormalizedScore(), 0.1);
        assertEquals(50.00, s2Alpha.getNormalizedScore(), 0.001);
        assertEquals(50.00, s2Beta.getNormalizedScore(), 0.001);

        // 2. Fetch normalized leaderboard
        List<LeaderboardEntryDto> leaderboard = normalizationService.getLeaderboard(eventId, "normalized");
        assertEquals(2, leaderboard.size());

        LeaderboardEntryDto rank1 = leaderboard.get(0);
        LeaderboardEntryDto rank2 = leaderboard.get(1);

        // Project Alpha should be Rank 1 with aggregate T-score = (57.07 + 50.0) / 2 = 53.54
        assertEquals(101L, rank1.getSubmissionId());
        assertEquals(53.54, rank1.getFinalScore(), 0.1);
        assertTrue(rank1.getFinalScore() > 50.0, "Project Alpha must score above average T-score (50)");

        // Under the old scale-mixing bug, flat score 4.0 was mixed with 57.07 giving (57.07 + 4.0)/2 = 30.53!
        // Assert that rank1 final score is NOT near 30.53
        assertNotEquals(30.53, rank1.getFinalScore(), 5.0);

        // Project Beta should be Rank 2 with aggregate T-score = (42.93 + 50.0) / 2 = 46.47
        assertEquals(102L, rank2.getSubmissionId());
        assertEquals(46.47, rank2.getFinalScore(), 0.1);
        assertTrue(rank2.getFinalScore() < 50.0, "Project Beta must score below average T-score (50)");
    }
}
