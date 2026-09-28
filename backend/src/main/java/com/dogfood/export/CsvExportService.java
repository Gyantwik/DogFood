package com.dogfood.export;

import com.dogfood.auth.User;
import com.dogfood.auth.UserRepository;
import com.dogfood.events.Score;
import com.dogfood.events.ScoreRepository;
import com.dogfood.events.Submission;
import com.dogfood.events.SubmissionRepository;
import com.dogfood.normalization.LeaderboardEntryDto;
import com.dogfood.normalization.ZScoreNormalizationService;
import org.apache.commons.csv.CSVFormat;
import org.apache.commons.csv.CSVPrinter;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.ByteArrayOutputStream;
import java.io.OutputStreamWriter;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class CsvExportService {

    private final SubmissionRepository submissionRepository;
    private final ScoreRepository scoreRepository;
    private final UserRepository userRepository;
    private final ZScoreNormalizationService normalizationService;

    public CsvExportService(
            SubmissionRepository submissionRepository,
            ScoreRepository scoreRepository,
            UserRepository userRepository,
            ZScoreNormalizationService normalizationService) {
        this.submissionRepository = submissionRepository;
        this.scoreRepository = scoreRepository;
        this.userRepository = userRepository;
        this.normalizationService = normalizationService;
    }

    @Transactional(readOnly = true)
    public byte[] exportSubmissionsCsv(Long eventId) {
        List<Submission> submissions = submissionRepository.findByEventId(eventId);
        ByteArrayOutputStream out = new ByteArrayOutputStream();

        try (CSVPrinter printer = new CSVPrinter(new OutputStreamWriter(out, StandardCharsets.UTF_8),
                CSVFormat.DEFAULT.builder()
                        .setHeader("Submission ID", "Title", "Tagline", "Description", "Repo URL", "Status", "Created At")
                        .build())) {

            for (Submission s : submissions) {
                printer.printRecord(
                        s.getId(),
                        s.getTitle(),
                        s.getTagline(),
                        s.getDescription(),
                        s.getRepoUrl(),
                        s.getStatus(),
                        s.getCreatedAt()
                );
            }
            printer.flush();
        } catch (Exception e) {
            throw new RuntimeException("Failed to export submissions CSV", e);
        }

        return out.toByteArray();
    }

    @Transactional(readOnly = true)
    public byte[] exportScoresCsv(Long eventId) {
        List<Score> scores = scoreRepository.findByEventId(eventId);
        Map<Long, String> submissionTitles = submissionRepository.findByEventId(eventId).stream()
                .collect(Collectors.toMap(Submission::getId, Submission::getTitle, (a, b) -> a));
        Map<Long, String> userNames = userRepository.findAll().stream()
                .collect(Collectors.toMap(User::getId, User::getUsername, (a, b) -> a));

        ByteArrayOutputStream out = new ByteArrayOutputStream();

        try (CSVPrinter printer = new CSVPrinter(new OutputStreamWriter(out, StandardCharsets.UTF_8),
                CSVFormat.DEFAULT.builder()
                        .setHeader("Score ID", "Submission ID", "Submission Title", "Judge ID", "Judge Name", "Raw Score", "Normalized Score", "Comment", "Created At")
                        .build())) {

            for (Score score : scores) {
                printer.printRecord(
                        score.getId(),
                        score.getSubmissionId(),
                        submissionTitles.getOrDefault(score.getSubmissionId(), "Unknown"),
                        score.getJudgeId(),
                        userNames.getOrDefault(score.getJudgeId(), "Judge #" + score.getJudgeId()),
                        score.getRawScore(),
                        score.getNormalizedScore() != null ? score.getNormalizedScore() : "",
                        score.getComment() != null ? score.getComment() : "",
                        score.getCreatedAt()
                );
            }
            printer.flush();
        } catch (Exception e) {
            throw new RuntimeException("Failed to export scores CSV", e);
        }

        return out.toByteArray();
    }

    @Transactional(readOnly = true)
    public byte[] exportResultsCsv(Long eventId) {
        List<LeaderboardEntryDto> leaderboard = normalizationService.getLeaderboard(eventId, "normalized");
        ByteArrayOutputStream out = new ByteArrayOutputStream();

        try (CSVPrinter printer = new CSVPrinter(new OutputStreamWriter(out, StandardCharsets.UTF_8),
                CSVFormat.DEFAULT.builder()
                        .setHeader("Rank", "Submission ID", "Title", "Tagline", "Final Normalized Score", "Raw Score", "Z-Score", "Review Count")
                        .build())) {

            for (LeaderboardEntryDto entry : leaderboard) {
                printer.printRecord(
                        entry.getRank(),
                        entry.getSubmissionId(),
                        entry.getTitle(),
                        entry.getTagline(),
                        entry.getFinalScore(),
                        entry.getRawScore(),
                        entry.getZScore(),
                        entry.getReviewsCount()
                );
            }
            printer.flush();
        } catch (Exception e) {
            throw new RuntimeException("Failed to export results CSV", e);
        }

        return out.toByteArray();
    }
}
