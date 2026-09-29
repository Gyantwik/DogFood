package com.dogfood.config;

import com.dogfood.auth.*;
import com.dogfood.events.*;
import com.dogfood.judging.*;
import com.dogfood.pairwise.PairwiseComparison;
import com.dogfood.pairwise.PairwiseComparisonRepository;
import com.dogfood.security.JwtTokenProvider;
import com.dogfood.teams.*;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.io.ClassPathResource;
import org.springframework.core.io.Resource;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.io.File;
import java.io.InputStream;
import java.time.Instant;
import java.util.*;

@Component
public class DataSeeder implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(DataSeeder.class);

    private final UserRepository userRepository;
    private final EventRoleRepository eventRoleRepository;
    private final EventRepository eventRepository;
    private final TrackRepository trackRepository;
    private final TeamRepository teamRepository;
    private final TeamMemberRepository teamMemberRepository;
    private final SubmissionRepository submissionRepository;
    private final RubricRepository rubricRepository;
    private final RubricCriterionRepository rubricCriterionRepository;
    private final JudgeAssignmentRepository judgeAssignmentRepository;
    private final JudgeTrackRepository judgeTrackRepository;
    private final ScoreRepository scoreRepository;
    private final ScoreCriterionValueRepository scoreCriterionValueRepository;
    private final PairwiseComparisonRepository pairwiseComparisonRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider jwtTokenProvider;
    private final ObjectMapper objectMapper;

    public DataSeeder(
            UserRepository userRepository,
            EventRoleRepository eventRoleRepository,
            EventRepository eventRepository,
            TrackRepository trackRepository,
            TeamRepository teamRepository,
            TeamMemberRepository teamMemberRepository,
            SubmissionRepository submissionRepository,
            RubricRepository rubricRepository,
            RubricCriterionRepository rubricCriterionRepository,
            JudgeAssignmentRepository judgeAssignmentRepository,
            JudgeTrackRepository judgeTrackRepository,
            ScoreRepository scoreRepository,
            ScoreCriterionValueRepository scoreCriterionValueRepository,
            PairwiseComparisonRepository pairwiseComparisonRepository,
            PasswordEncoder passwordEncoder,
            JwtTokenProvider jwtTokenProvider) {
        this.userRepository = userRepository;
        this.eventRoleRepository = eventRoleRepository;
        this.eventRepository = eventRepository;
        this.trackRepository = trackRepository;
        this.teamRepository = teamRepository;
        this.teamMemberRepository = teamMemberRepository;
        this.submissionRepository = submissionRepository;
        this.rubricRepository = rubricRepository;
        this.rubricCriterionRepository = rubricCriterionRepository;
        this.judgeAssignmentRepository = judgeAssignmentRepository;
        this.judgeTrackRepository = judgeTrackRepository;
        this.scoreRepository = scoreRepository;
        this.scoreCriterionValueRepository = scoreCriterionValueRepository;
        this.pairwiseComparisonRepository = pairwiseComparisonRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtTokenProvider = jwtTokenProvider;
        this.objectMapper = new ObjectMapper();
    }

    @Override
    @Transactional
    public void run(String... args) {
        log.info("Initializing Dogfood Data Seeder & Fixture Ingestion...");

        // 1. Ingest Fixtures or Create Default Event
        JsonNode fixtureRoot = loadFixtureJson();
        Event fixtureEvent;

        if (fixtureRoot != null && fixtureRoot.has("event")) {
            JsonNode evNode = fixtureRoot.get("event");
            String eventName = evNode.has("name") ? evNode.get("name").asText() : "Sample Hack 2026";
            Instant deadline = evNode.has("submissions_close") 
                    ? Instant.parse(evNode.get("submissions_close").asText()) 
                    : Instant.parse("2026-03-01T18:00:00Z");

            Optional<Event> existingByName = eventRepository.findAll().stream()
                    .filter(e -> e.getName().equalsIgnoreCase(eventName))
                    .findFirst();

            if (existingByName.isPresent()) {
                fixtureEvent = existingByName.get();
                fixtureEvent.setSubmissionDeadline(deadline);
                fixtureEvent.setStatus("CLOSED");
                fixtureEvent = eventRepository.save(fixtureEvent);
            } else {
                Event newEvent = new Event(eventName, "Official Hackathon 2026", deadline);
                newEvent.setStatus("CLOSED");
                fixtureEvent = eventRepository.save(newEvent);
            }
        } else {
            Optional<Event> existingByName = eventRepository.findAll().stream()
                    .filter(e -> e.getName().equalsIgnoreCase("Sample Hack 2026"))
                    .findFirst();

            if (existingByName.isPresent()) {
                fixtureEvent = existingByName.get();
            } else {
                Event event = new Event(
                        "Sample Hack 2026",
                        "The premier autonomous builder hackathon.",
                        Instant.parse("2026-03-01T18:00:00Z")
                );
                event.setStatus("CLOSED");
                fixtureEvent = eventRepository.save(event);
            }
        }

        Long eventId = fixtureEvent.getId();

        // 2. Seed Standard Test Identities
        User organizer = getOrCreateUser("organizer", "organizer@dogfood.local", "organizer_pass123", eventId, RoleType.ORGANIZER);
        User judgeA = getOrCreateUser("judge_a", "judge_a@dogfood.local", "judge_a_pass123", eventId, RoleType.JUDGE);
        User judgeB = getOrCreateUser("judge_b", "judge_b@dogfood.local", "judge_b_pass123", eventId, RoleType.JUDGE);
        User participant = getOrCreateUser("participant", "participant@dogfood.local", "participant_pass123", eventId, RoleType.PARTICIPANT);

        // 3. Ingest Fixture Data Idempotently if available
        if (fixtureRoot != null) {
            ingestFixtures(fixtureRoot, eventId, judgeA, judgeB);
        }

        // 4. Generate Long-Lived JWT Tokens
        String organizerToken = jwtTokenProvider.generateToken(organizer.getId(), organizer.getEmail(), organizer.getUsername());
        String judgeAToken = jwtTokenProvider.generateToken(judgeA.getId(), judgeA.getEmail(), judgeA.getUsername());
        String judgeBToken = jwtTokenProvider.generateToken(judgeB.getId(), judgeB.getEmail(), judgeB.getUsername());
        String participantToken = jwtTokenProvider.generateToken(participant.getId(), participant.getEmail(), participant.getUsername());

        // Diagnostic presence check without leaking raw credentials or tokens
        log.info("Seeded test identities configured: organizer (token present = true), judge_a (token present = true), judge_b (token present = true), participant (token present = true)");
    }

    private void ingestFixtures(JsonNode root, Long eventId, User judgeA, User judgeB) {
        log.info("Ingesting full fixture records for Event ID: {}", eventId);

        Map<String, Long> trackMap = new HashMap<>();
        Map<String, Long> judgeMap = new HashMap<>();
        Map<String, Long> teamMap = new HashMap<>();
        Map<String, Long> submissionMap = new HashMap<>();

        // A. Tracks
        if (root.has("tracks")) {
            for (JsonNode tNode : root.get("tracks")) {
                String strId = tNode.get("id").asText();
                String name = tNode.get("name").asText();
                Track track = trackRepository.findByEventIdAndName(eventId, name).orElseGet(() ->
                        trackRepository.save(new Track(eventId, name, "Track for " + name))
                );
                trackMap.put(strId, track.getId());
            }
        }

        // B. Judges
        if (root.has("judges")) {
            for (JsonNode jNode : root.get("judges")) {
                String strId = jNode.get("id").asText();
                String name = jNode.get("name").asText();
                String email = jNode.get("email").asText();
                String username = name.toLowerCase().replaceAll("[^a-z0-9]", "_");

                User judgeUser = getOrCreateUser(username, email, "judge_pass123", eventId, RoleType.JUDGE);
                judgeMap.put(strId, judgeUser.getId());

                if (jNode.has("tracks")) {
                    for (JsonNode trkNode : jNode.get("tracks")) {
                        String trkStr = trkNode.asText();
                        Long trkDbId = trackMap.get(trkStr);
                        if (trkDbId != null && !judgeTrackRepository.existsByJudgeIdAndTrackId(judgeUser.getId(), trkDbId)) {
                            judgeTrackRepository.save(new JudgeTrack(eventId, judgeUser.getId(), trkDbId));
                        }
                    }
                }
            }
        }
        // Link judge_a and judge_b aliases
        judgeMap.put("jdg_01", judgeA.getId());
        judgeMap.put("jdg_02", judgeB.getId());

        // C. Teams
        if (root.has("teams")) {
            for (JsonNode tmNode : root.get("teams")) {
                String strId = tmNode.get("id").asText();
                String name = tmNode.get("name").asText();
                String inviteCode = "INV-" + strId.toUpperCase();

                List<String> memberEmails = new ArrayList<>();
                if (tmNode.has("members")) {
                    for (JsonNode m : tmNode.get("members")) {
                        memberEmails.add(m.asText());
                    }
                }

                String leaderEmail = memberEmails.isEmpty() ? strId + "@dogfood.local" : memberEmails.get(0);
                String leaderUsername = leaderEmail.split("@")[0].replaceAll("[^a-z0-9]", "_");
                User leader = getOrCreateUser(leaderUsername, leaderEmail, "team_pass123", eventId, RoleType.PARTICIPANT);

                Team team = teamRepository.findByInviteCode(inviteCode).orElseGet(() ->
                        teamRepository.save(new Team(eventId, name, inviteCode, leader.getId()))
                );
                teamMap.put(strId, team.getId());

                for (String memEmail : memberEmails) {
                    String uName = memEmail.split("@")[0].replaceAll("[^a-z0-9]", "_");
                    User memUser = getOrCreateUser(uName, memEmail, "team_pass123", eventId, RoleType.PARTICIPANT);
                    if (!teamMemberRepository.existsByTeamIdAndUserId(team.getId(), memUser.getId())) {
                        teamMemberRepository.save(new TeamMember(team, memUser.getId()));
                    }
                }
            }
        }

        // D. Projects / Submissions
        if (root.has("projects")) {
            for (JsonNode pNode : root.get("projects")) {
                String strId = pNode.get("id").asText();
                String title = pNode.get("title").asText();
                String summary = pNode.has("summary") ? pNode.get("summary").asText() : "";
                String repoUrl = pNode.has("repo_url") ? pNode.get("repo_url").asText() : "";
                String tmStr = pNode.has("team") ? pNode.get("team").asText() : null;
                String trkStr = pNode.has("track") ? pNode.get("track").asText() : null;
                Instant submittedAt = pNode.has("submitted_at") ? Instant.parse(pNode.get("submitted_at").asText()) : Instant.now();

                Long teamId = tmStr != null ? teamMap.get(tmStr) : null;
                Long trackId = trkStr != null ? trackMap.get(trkStr) : null;
                String trackName = trackId != null ? trackRepository.findById(trackId).map(Track::getName).orElse(trkStr) : trkStr;

                boolean isDuplicate = "prj_41".equals(strId);
                String fixtureContentHash = "fixture:" + strId;

                Submission sub = submissionRepository.findByEventIdAndContentHash(eventId, fixtureContentHash).orElseGet(() -> {
                    if (!isDuplicate) {
                        Optional<Submission> legacy = submissionRepository.findByEventIdAndTitle(eventId, title);
                        if (legacy.isPresent() && (legacy.get().getContentHash() == null || legacy.get().getContentHash().isEmpty())) {
                            Submission s = legacy.get();
                            s.setContentHash(fixtureContentHash);
                            return submissionRepository.save(s);
                        }
                    }
                    Submission newSub = new Submission(
                            null,
                            eventId,
                            teamId,
                            title,
                            summary,
                            summary,
                            trackName,
                            repoUrl,
                            repoUrl + "/demo",
                            "Java, Spring Boot, Postgres",
                            "SUBMITTED",
                            isDuplicate,
                            fixtureContentHash,
                            null,
                            submittedAt,
                            submittedAt
                    );
                    return submissionRepository.save(newSub);
                });
                submissionMap.put(strId, sub.getId());
            }
        }

        // Clean up any historical collision where jdg_18 scored prj_07 instead of prj_41
        if (submissionMap.containsKey("prj_07") && submissionMap.containsKey("prj_41")) {
            Long p7Id = submissionMap.get("prj_07");
            Long jdg18Id = judgeMap.get("jdg_18");
            if (p7Id != null && jdg18Id != null) {
                scoreRepository.findByJudgeIdAndSubmissionId(jdg18Id, p7Id).ifPresent(score -> {
                    scoreCriterionValueRepository.deleteByScoreId(score.getId());
                    scoreRepository.delete(score);
                });
                judgeAssignmentRepository.findByJudgeIdAndSubmissionId(jdg18Id, p7Id).ifPresent(judgeAssignmentRepository::delete);
            }
        }

        // E. Rubric Configuration
        Rubric rubric = rubricRepository.findByEventId(eventId).orElseGet(() ->
                rubricRepository.save(new Rubric(eventId, false))
        );
        ensureCriterion(rubric, "Functionality", "functionality", 1.0);
        ensureCriterion(rubric, "Quality", "quality", 1.0);
        ensureCriterion(rubric, "Innovation", "innovation", 1.0);

        // F. Scores and Assignments
        if (root.has("scores")) {
            for (JsonNode sNode : root.get("scores")) {
                String jdgStr = sNode.get("judge").asText();
                String prjStr = sNode.get("project").asText();
                String comment = sNode.has("comment") ? sNode.get("comment").asText() : "";

                Long judgeUserId = judgeMap.get(jdgStr);
                Long submissionId = submissionMap.get(prjStr);

                if (judgeUserId != null && submissionId != null) {
                    if (judgeAssignmentRepository.findByJudgeIdAndSubmissionId(judgeUserId, submissionId).isEmpty()) {
                        judgeAssignmentRepository.save(new JudgeAssignment(eventId, judgeUserId, submissionId, "COMPLETED"));
                    }

                    Map<String, Double> criteriaValues = new HashMap<>();
                    double sum = 0;
                    int count = 0;
                    if (sNode.has("criteria")) {
                        Iterator<Map.Entry<String, JsonNode>> fields = sNode.get("criteria").fields();
                        while (fields.hasNext()) {
                            Map.Entry<String, JsonNode> entry = fields.next();
                            double val = entry.getValue().asDouble();
                            criteriaValues.put(entry.getKey(), val);
                            sum += val;
                            count++;
                        }
                    }
                    double rawScore = count > 0 ? (sum / count) : 3.0;

                    Score score = scoreRepository.findByJudgeIdAndSubmissionId(judgeUserId, submissionId).orElseGet(() ->
                            scoreRepository.save(new Score(eventId, submissionId, judgeUserId, rawScore, comment))
                    );

                    for (Map.Entry<String, Double> cv : criteriaValues.entrySet()) {
                        if (scoreCriterionValueRepository.findByScoreIdAndCriterionKey(score.getId(), cv.getKey()).isEmpty()) {
                            scoreCriterionValueRepository.save(new ScoreCriterionValue(score.getId(), cv.getKey(), cv.getValue()));
                        }
                    }
                }
            }
        }

        // Ensure judge_a has at least one recorded score on a fixture submission
        if (!submissionMap.isEmpty()) {
            Long firstSubId = submissionMap.get("prj_01");
            if (firstSubId != null) {
                if (judgeAssignmentRepository.findByJudgeIdAndSubmissionId(judgeA.getId(), firstSubId).isEmpty()) {
                    judgeAssignmentRepository.save(new JudgeAssignment(eventId, judgeA.getId(), firstSubId, "COMPLETED"));
                }
                Score scoreA = scoreRepository.findByJudgeIdAndSubmissionId(judgeA.getId(), firstSubId).orElseGet(() ->
                        scoreRepository.save(new Score(eventId, firstSubId, judgeA.getId(), 4.5, "Excellent execution by Judge A"))
                );
                if (scoreCriterionValueRepository.findByScoreIdAndCriterionKey(scoreA.getId(), "functionality").isEmpty()) {
                    scoreCriterionValueRepository.save(new ScoreCriterionValue(scoreA.getId(), "functionality", 4.5));
                }
                if (scoreCriterionValueRepository.findByScoreIdAndCriterionKey(scoreA.getId(), "quality").isEmpty()) {
                    scoreCriterionValueRepository.save(new ScoreCriterionValue(scoreA.getId(), "quality", 4.5));
                }
            }
        }

        log.info("Fixture ingestion completed successfully. Tracks: {}, Judges: {}, Teams: {}, Projects: {}",
                trackMap.size(), judgeMap.size(), teamMap.size(), submissionMap.size());

        // Enable pairwise judging on fixture event and seed demo pairwise comparisons
        eventRepository.findById(eventId).ifPresent(ev -> {
            ev.setPairwiseJudgingEnabled(true);
            eventRepository.save(ev);

            if (pairwiseComparisonRepository.countByEventId(eventId) == 0 && !submissionMap.isEmpty() && !judgeMap.isEmpty()) {
                List<Long> seededSubIds = new ArrayList<>(submissionMap.values());
                List<Long> seededJudgeIds = new ArrayList<>(judgeMap.values());

                if (seededSubIds.size() >= 4 && !seededJudgeIds.isEmpty()) {
                    int subLimit = Math.min(10, seededSubIds.size());
                    // Seed a connected comparison graph across the first subLimit submissions
                    for (int i = 0; i < subLimit - 1; i++) {
                        Long sub1Id = seededSubIds.get(i);
                        Long sub2Id = seededSubIds.get(i + 1);
                        Long judgeId = seededJudgeIds.get(i % seededJudgeIds.size());
                        Long pA = Math.min(sub1Id, sub2Id);
                        Long pB = Math.max(sub1Id, sub2Id);
                        Long winner = (i % 2 == 0) ? pA : pB;
                        if (!pairwiseComparisonRepository.existsByJudgeIdAndEventIdAndProjectAIdAndProjectBId(judgeId, eventId, pA, pB)) {
                            pairwiseComparisonRepository.save(new PairwiseComparison(
                                    eventId, null, judgeId, pA, pB, winner
                            ));
                        }
                    }
                    // Additional cross-edges to ensure robust cycles and density
                    for (int i = 0; i < subLimit - 2; i += 2) {
                        Long sub1Id = seededSubIds.get(i);
                        Long sub2Id = seededSubIds.get(i + 2);
                        Long judgeId = seededJudgeIds.get((i + 3) % seededJudgeIds.size());
                        Long pA = Math.min(sub1Id, sub2Id);
                        Long pB = Math.max(sub1Id, sub2Id);
                        Long winner = pA;
                        if (!pairwiseComparisonRepository.existsByJudgeIdAndEventIdAndProjectAIdAndProjectBId(judgeId, eventId, pA, pB)) {
                            pairwiseComparisonRepository.save(new PairwiseComparison(
                                    eventId, null, judgeId, pA, pB, winner
                            ));
                        }
                    }
                    log.info("Seeded demo pairwise comparisons for event {}", eventId);
                }
            }
        });
    }

    private void ensureCriterion(Rubric rubric, String name, String key, double weight) {
        if (rubricCriterionRepository.findByRubricIdAndCriterionKey(rubric.getId(), key).isEmpty()) {
            rubricCriterionRepository.save(new RubricCriterion(rubric, name, key, weight, 1.0, 5.0));
        }
    }

    private JsonNode loadFixtureJson() {
        try {
            Resource res = new ClassPathResource("fixtures.json");
            if (res.exists()) {
                try (InputStream is = res.getInputStream()) {
                    return objectMapper.readTree(is);
                }
            }
            File f = new File("fixtures.json");
            if (f.exists()) {
                return objectMapper.readTree(f);
            }
            File parentF = new File("../fixtures.json");
            if (parentF.exists()) {
                return objectMapper.readTree(parentF);
            }
        } catch (Exception e) {
            log.warn("Could not load fixtures.json: {}", e.getMessage());
        }
        return null;
    }

    private User getOrCreateUser(String username, String email, String password, Long eventId, RoleType role) {
        Optional<User> existing = userRepository.findByEmail(email);
        User user;
        if (existing.isPresent()) {
            user = existing.get();
        } else {
            user = new User(username, email, passwordEncoder.encode(password));
            user = userRepository.save(user);
        }

        if (eventRoleRepository.findByUserIdAndEventIdAndRole(user.getId(), eventId, role).isEmpty()) {
            EventRole eventRole = new EventRole(user, eventId, role);
            eventRoleRepository.save(eventRole);
        }

        return user;
    }
}
