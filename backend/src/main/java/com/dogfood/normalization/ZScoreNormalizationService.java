package com.dogfood.normalization;

import com.dogfood.auth.User;
import com.dogfood.auth.UserRepository;
import com.dogfood.common.audit.AuditLogService;
import com.dogfood.events.Event;
import com.dogfood.events.EventRepository;
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
    private final EventRepository eventRepository;

    public ZScoreNormalizationService(
            ScoreRepository scoreRepository,
            SubmissionRepository submissionRepository,
            UserRepository userRepository,
            AuditLogService auditLogService) {
        this(scoreRepository, submissionRepository, userRepository, auditLogService, null);
    }

    @org.springframework.beans.factory.annotation.Autowired
    public ZScoreNormalizationService(
            ScoreRepository scoreRepository,
            SubmissionRepository submissionRepository,
            UserRepository userRepository,
            AuditLogService auditLogService,
            EventRepository eventRepository) {
        this.scoreRepository = scoreRepository;
        this.submissionRepository = submissionRepository;
        this.userRepository = userRepository;
        this.auditLogService = auditLogService;
        this.eventRepository = eventRepository;
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

    @Transactional
    public NormalizationAnalysisDto getNormalizationAnalysis(Long eventId) {
        normalizeScoresForEvent(eventId);

        Event event = (eventRepository != null) ? eventRepository.findById(eventId).orElse(null) : null;
        String eventName = event != null ? event.getName() : "Event #" + eventId;

        List<Submission> submissions = submissionRepository.findByEventId(eventId);
        List<Score> scores = scoreRepository.findByEventId(eventId);

        Map<Long, List<Score>> scoresBySub = scores.stream().collect(Collectors.groupingBy(Score::getSubmissionId));

        List<NormalizationAnalysisDto.ProjectRankAnalysisItem> items = new ArrayList<>();
        for (Submission sub : submissions) {
            List<Score> subScores = scoresBySub.getOrDefault(sub.getId(), Collections.emptyList());
            double avgRaw = subScores.stream().mapToDouble(Score::getRawScore).average().orElse(0.0);
            double avgNorm = subScores.stream().mapToDouble(s -> s.getNormalizedScore() != null ? s.getNormalizedScore() : 50.0).average().orElse(50.0);

            items.add(new NormalizationAnalysisDto.ProjectRankAnalysisItem(
                    sub.getId(),
                    sub.getTitle(),
                    sub.getTrack() != null ? sub.getTrack() : "General",
                    Math.round(avgRaw * 100.0) / 100.0,
                    Math.round(avgNorm * 100.0) / 100.0,
                    subScores.size(),
                    0,
                    0,
                    0
            ));
        }

        // Calculate raw ranks
        items.sort((a, b) -> Double.compare(b.getRawScore(), a.getRawScore()));
        for (int i = 0; i < items.size(); i++) {
            items.get(i).setRawRank(i + 1);
        }

        // Calculate normalized ranks
        items.sort((a, b) -> Double.compare(b.getNormalizedScore(), a.getNormalizedScore()));
        for (int i = 0; i < items.size(); i++) {
            items.get(i).setNormalizedRank(i + 1);
            items.get(i).setRankChange(items.get(i).getRawRank() - items.get(i).getNormalizedRank());
        }

        NormalizationAnalysisDto dto = new NormalizationAnalysisDto();
        dto.setEventId(eventId);
        dto.setEventName(eventName);
        dto.setNormalizationMethod("Linear T-Score Transformation (T = 50 + 10 * Z)");
        dto.setFormulaExplanation("Z = (X - μ) / σ, then T = 50 + 10 * Z. Where Z=0 maps to T=50, Z>0 maps to T>50, and Z<0 maps to T<50.");
        dto.setNeutralFallback(50.0);
        dto.setTotalProjects(items.size());
        dto.setProjects(items);
        return dto;
    }

    @Transactional
    public NormalizationProofDto getNormalizationProof(Long eventId) {
        normalizeScoresForEvent(eventId);

        List<Score> scores = scoreRepository.findByEventId(eventId);
        List<Submission> submissions = submissionRepository.findByEventId(eventId);

        Map<Long, List<Score>> judgeScores = scores.stream().collect(Collectors.groupingBy(Score::getJudgeId));
        List<NormalizationProofDto.JudgeDistributionProof> distProofs = new ArrayList<>();
        Map<Long, Double> judgeMeans = new HashMap<>();
        Map<Long, Double> judgeStdDevs = new HashMap<>();
        Map<Long, Boolean> judgeZeroVar = new HashMap<>();

        for (Map.Entry<Long, List<Score>> entry : judgeScores.entrySet()) {
            Long jId = entry.getKey();
            List<Score> jList = entry.getValue();
            String jName = userRepository.findById(jId).map(User::getUsername).orElse("Judge #" + jId);

            double mean = jList.stream().mapToDouble(Score::getRawScore).average().orElse(0.0);
            double sumSq = jList.stream().mapToDouble(s -> Math.pow(s.getRawScore() - mean, 2)).sum();
            double variance = jList.size() > 1 ? sumSq / (jList.size() - 1) : 0.0;
            double stdDev = Math.sqrt(variance);
            boolean zeroVar = stdDev < 0.0001;

            judgeMeans.put(jId, mean);
            judgeStdDevs.put(jId, stdDev);
            judgeZeroVar.put(jId, zeroVar);

            distProofs.add(new NormalizationProofDto.JudgeDistributionProof(
                    jId,
                    jName,
                    jList.size(),
                    Math.round(mean * 100.0) / 100.0,
                    Math.round(stdDev * 100.0) / 100.0,
                    zeroVar,
                    zeroVar ? "Zero-Variance Neutral Fallback (T=50.00)" : "Standard Normalization: 50 + 10 * ((X - μ) / σ)"
            ));
        }

        Map<Long, List<Score>> subScoresMap = scores.stream().collect(Collectors.groupingBy(Score::getSubmissionId));
        List<NormalizationProofDto.ProjectProofItem> projectProofs = new ArrayList<>();

        for (Submission sub : submissions) {
            List<Score> subScores = subScoresMap.getOrDefault(sub.getId(), Collections.emptyList());
            NormalizationProofDto.ProjectProofItem pProof = new NormalizationProofDto.ProjectProofItem();
            pProof.setSubmissionId(sub.getId());
            pProof.setTitle(sub.getTitle());

            List<NormalizationProofDto.ScoreStepProof> steps = new ArrayList<>();
            for (Score s : subScores) {
                Long jId = s.getJudgeId();
                double mean = judgeMeans.getOrDefault(jId, 0.0);
                double stdDev = judgeStdDevs.getOrDefault(jId, 0.0);
                boolean zeroVar = judgeZeroVar.getOrDefault(jId, false);

                double z = zeroVar ? 0.0 : ((s.getRawScore() - mean) / stdDev);
                double t = zeroVar ? 50.0 : (50.0 + 10.0 * z);
                String note = zeroVar ? "Zero variance (stdDev=0): fallback T=50.00" :
                        (z > 0 ? String.format("Above judge average (Z=%.2f > 0, T=%.2f > 50)", z, t) :
                        (z < 0 ? String.format("Below judge average (Z=%.2f < 0, T=%.2f < 50)", z, t) :
                                "Exactly equal to judge average (Z=0, T=50.00)"));

                steps.add(new NormalizationProofDto.ScoreStepProof(
                        jId,
                        Math.round(s.getRawScore() * 100.0) / 100.0,
                        Math.round(mean * 100.0) / 100.0,
                        Math.round(stdDev * 100.0) / 100.0,
                        Math.round(z * 100.0) / 100.0,
                        Math.round(t * 100.0) / 100.0,
                        note
                ));
            }
            pProof.setScoreSteps(steps);
            double avgRaw = subScores.stream().mapToDouble(Score::getRawScore).average().orElse(0.0);
            double avgNorm = subScores.stream().mapToDouble(s -> s.getNormalizedScore() != null ? s.getNormalizedScore() : 50.0).average().orElse(50.0);
            pProof.setAverageRawScore(Math.round(avgRaw * 100.0) / 100.0);
            pProof.setAverageNormalizedScore(Math.round(avgNorm * 100.0) / 100.0);
            projectProofs.add(pProof);
        }

        // Rank by raw
        projectProofs.sort((a, b) -> Double.compare(b.getAverageRawScore(), a.getAverageRawScore()));
        for (int i = 0; i < projectProofs.size(); i++) {
            projectProofs.get(i).setRawRank(i + 1);
        }

        // Rank by normalized
        projectProofs.sort((a, b) -> Double.compare(b.getAverageNormalizedScore(), a.getAverageNormalizedScore()));
        for (int i = 0; i < projectProofs.size(); i++) {
            projectProofs.get(i).setNormalizedRank(i + 1);
        }

        NormalizationProofDto dto = new NormalizationProofDto();
        dto.setEventId(eventId);
        dto.setFormula("T = 50 + 10 * Z");
        dto.setZScoreDefinition("Z = (X - μ) / σ, measuring distance from judge mean in units of standard deviation.");
        dto.setZeroVarianceFallbackRule("When σ = 0 (judge gave identical scores), Z is undefined; neutral fallback T = 50.00 is applied.");
        dto.setJudgeDistributions(distProofs);
        dto.setProjectCalculations(projectProofs);
        dto.setRankMovementExplanation("Strict judges have lower means; a score of 3.8 from a strict judge (mean 3.0) yields Z > 0, scaling T > 50. Lenient judges have higher means; a score of 4.0 from a lenient judge (mean 4.5) yields Z < 0, scaling T < 50. This equalizes judge baselines and prevents bias from assignment luck.");
        return dto;
    }
}
