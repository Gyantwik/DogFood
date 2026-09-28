package com.dogfood.normalization;

import com.dogfood.auth.User;
import com.dogfood.auth.UserRepository;
import com.dogfood.common.audit.AuditLogService;
import com.dogfood.events.Score;
import com.dogfood.events.ScoreRepository;
import com.dogfood.events.Submission;
import com.dogfood.events.SubmissionRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

@Service
public class ZScoreNormalizationService {

    private final ScoreRepository scoreRepository;
    private final SubmissionRepository submissionRepository;
    private final UserRepository userRepository;
    private final AuditLogService auditLogService;

    public ZScoreNormalizationService(
            ScoreRepository scoreRepository,
            SubmissionRepository submissionRepository,
            UserRepository userRepository,
            AuditLogService auditLogService) {
        this.scoreRepository = scoreRepository;
        this.submissionRepository = submissionRepository;
        this.userRepository = userRepository;
        this.auditLogService = auditLogService;
    }

    /**
     * Calculates and updates z-scores for all scores within an event.
     * Uses zero-variance fallback (global mean substitution + audit log) when standard deviation is 0.
     */
    @Transactional
    public void normalizeScoresForEvent(Long eventId) {
        List<Score> scores = scoreRepository.findByEventId(eventId);
        if (scores.isEmpty()) {
            return;
        }

        // Global mean across all scores in event
        double globalMean = scores.stream()
                .mapToDouble(Score::getRawScore)
                .average()
                .orElse(0.0);

        // Group scores by judge
        Map<Long, List<Score>> judgeScores = scores.stream()
                .collect(Collectors.groupingBy(Score::getJudgeId));

        for (Map.Entry<Long, List<Score>> entry : judgeScores.entrySet()) {
            Long judgeId = entry.getKey();
            List<Score> jScores = entry.getValue();

            double judgeMean = jScores.stream()
                    .mapToDouble(Score::getRawScore)
                    .average()
                    .orElse(0.0);

            // Compute standard deviation
            double sumSquaredDiffs = jScores.stream()
                    .mapToDouble(s -> Math.pow(s.getRawScore() - judgeMean, 2))
                    .sum();
            double variance = jScores.size() > 1 ? sumSquaredDiffs / (jScores.size() - 1) : 0.0;
            double stdDev = Math.sqrt(variance);

            if (stdDev < 0.0001) {
                // Zero-variance fallback: on standard T-score scale (50 + 10*z), zero variance (z=0) maps to neutral 50.0
                auditLogService.logAction(
                        judgeId,
                        eventId,
                        "ZERO_VARIANCE_FALLBACK",
                        String.format("Judge %d has zero variance (stdDev=0) across %d reviews. Applied neutral T-score fallback (50.00).", judgeId, jScores.size())
                );

                for (Score s : jScores) {
                    s.setNormalizedScore(50.0);
                }
            } else {
                for (Score s : jScores) {
                    double z = (s.getRawScore() - judgeMean) / stdDev;
                    // Standard T-score mapping: 50 + (10 * z) to maintain a realistic score scale centered at 50
                    double mappedNormalizedScore = 50.0 + (10.0 * z);
                    s.setNormalizedScore(Math.round(mappedNormalizedScore * 100.0) / 100.0);
                }
            }
        }

        scoreRepository.saveAll(scores);
    }

    @Transactional
    public List<LeaderboardEntryDto> getLeaderboard(Long eventId, String mode) {
        List<Submission> submissions = submissionRepository.findByEventId(eventId);
        List<Score> scores = scoreRepository.findByEventId(eventId);

        Map<Long, List<Score>> scoresBySubmission = scores.stream()
                .collect(Collectors.groupingBy(Score::getSubmissionId));

        boolean useNormalized = "normalized".equalsIgnoreCase(mode);
        if (useNormalized && !scores.isEmpty() && scores.stream().anyMatch(s -> s.getNormalizedScore() == null)) {
            normalizeScoresForEvent(eventId);
            scores = scoreRepository.findByEventId(eventId);
            scoresBySubmission = scores.stream()
                    .collect(Collectors.groupingBy(Score::getSubmissionId));
        }

        List<LeaderboardEntryDto> entries = new ArrayList<>();
        for (Submission sub : submissions) {
            List<Score> subScores = scoresBySubmission.getOrDefault(sub.getId(), Collections.emptyList());

            double avgRaw = subScores.stream()
                    .mapToDouble(Score::getRawScore)
                    .average()
                    .orElse(0.0);

            double avgNormalized = subScores.stream()
                    .mapToDouble(s -> s.getNormalizedScore() != null ? s.getNormalizedScore() : 50.0)
                    .average()
                    .orElse(50.0);

            double avgZ = subScores.stream()
                    .mapToDouble(s -> s.getNormalizedScore() != null ? (s.getNormalizedScore() - 50.0) / 10.0 : 0.0)
                    .average()
                    .orElse(0.0);

            double finalScore = useNormalized ? avgNormalized : avgRaw;

            entries.add(new LeaderboardEntryDto(
                    0,
                    sub.getId(),
                    sub.getTitle(),
                    sub.getTagline(),
                    Math.round(finalScore * 100.0) / 100.0,
                    Math.round(avgRaw * 100.0) / 100.0,
                    Math.round(avgZ * 100.0) / 100.0,
                    subScores.size()
            ));
        }

        // Sort descending by final score
        entries.sort((a, b) -> Double.compare(b.getFinalScore(), a.getFinalScore()));

        // Assign ranks
        for (int i = 0; i < entries.size(); i++) {
            entries.get(i).setRank(i + 1);
        }

        return entries;
    }

    @Transactional(readOnly = true)
    public List<ScoreDistributionDto> getScoreDistribution(Long eventId) {
        List<Score> scores = scoreRepository.findByEventId(eventId);
        Map<Long, List<Score>> judgeScores = scores.stream()
                .collect(Collectors.groupingBy(Score::getJudgeId));

        List<ScoreDistributionDto> distributionList = new ArrayList<>();

        for (Map.Entry<Long, List<Score>> entry : judgeScores.entrySet()) {
            Long judgeId = entry.getKey();
            List<Score> jScores = entry.getValue();

            String judgeName = userRepository.findById(judgeId)
                    .map(User::getUsername)
                    .orElse("Judge #" + judgeId);

            double rawMean = jScores.stream().mapToDouble(Score::getRawScore).average().orElse(0.0);
            double sumSquaredDiffs = jScores.stream().mapToDouble(s -> Math.pow(s.getRawScore() - rawMean, 2)).sum();
            double variance = jScores.size() > 1 ? sumSquaredDiffs / (jScores.size() - 1) : 0.0;
            double stdDev = Math.sqrt(variance);

            double normalizedMean = jScores.stream()
                    .mapToDouble(s -> s.getNormalizedScore() != null ? s.getNormalizedScore() : 50.0)
                    .average()
                    .orElse(50.0);

            boolean zeroVariance = stdDev < 0.0001;

            distributionList.add(new ScoreDistributionDto(
                    judgeId,
                    judgeName,
                    Math.round(rawMean * 100.0) / 100.0,
                    Math.round(stdDev * 100.0) / 100.0,
                    Math.round(normalizedMean * 100.0) / 100.0,
                    jScores.size(),
                    zeroVariance
            ));
        }

        return distributionList;
    }
}
