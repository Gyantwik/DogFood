package com.dogfood.pairwise;

import com.dogfood.auth.EventRoleRepository;
import com.dogfood.auth.RoleType;
import com.dogfood.teams.TeamMemberRepository;
import com.dogfood.common.audit.AuditLogService;
import com.dogfood.events.Event;
import com.dogfood.events.EventRepository;
import com.dogfood.events.Submission;
import com.dogfood.events.SubmissionRepository;
import com.dogfood.events.Track;
import com.dogfood.events.TrackRepository;
import com.dogfood.judging.*;
import com.dogfood.pairwise.dto.*;
import com.dogfood.security.EventAuthorizationPolicy;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class PairwiseJudgingService {

    private static final Logger log = LoggerFactory.getLogger(PairwiseJudgingService.class);

    private final PairwiseComparisonRepository comparisonRepository;
    private final EventRepository eventRepository;
    private final SubmissionRepository submissionRepository;
    private final TrackRepository trackRepository;
    private final JudgeTrackRepository judgeTrackRepository;
    private final JudgeAssignmentRepository judgeAssignmentRepository;
    private final ConflictOfInterestRepository coiRepository;
    private final TeamMemberRepository teamMemberRepository;
    private final EventRoleRepository eventRoleRepository;
    private final EventAuthorizationPolicy authorizationPolicy;
    private final AuditLogService auditLogService;
    private final BradleyTerryService bradleyTerryService;

    public PairwiseJudgingService(
            PairwiseComparisonRepository comparisonRepository,
            EventRepository eventRepository,
            SubmissionRepository submissionRepository,
            TrackRepository trackRepository,
            JudgeTrackRepository judgeTrackRepository,
            JudgeAssignmentRepository judgeAssignmentRepository,
            ConflictOfInterestRepository coiRepository,
            TeamMemberRepository teamMemberRepository,
            EventRoleRepository eventRoleRepository,
            EventAuthorizationPolicy authorizationPolicy,
            AuditLogService auditLogService,
            BradleyTerryService bradleyTerryService) {
        this.comparisonRepository = comparisonRepository;
        this.eventRepository = eventRepository;
        this.submissionRepository = submissionRepository;
        this.trackRepository = trackRepository;
        this.judgeTrackRepository = judgeTrackRepository;
        this.judgeAssignmentRepository = judgeAssignmentRepository;
        this.coiRepository = coiRepository;
        this.teamMemberRepository = teamMemberRepository;
        this.eventRoleRepository = eventRoleRepository;
        this.authorizationPolicy = authorizationPolicy;
        this.auditLogService = auditLogService;
        this.bradleyTerryService = bradleyTerryService;
    }

    /**
     * Enables or disables pairwise judging mode for an event.
     */
    @Transactional
    public void enablePairwiseJudging(Long eventId, boolean enabled, Long callerUserId) {
        authorizationPolicy.requireEventRole(callerUserId, eventId, RoleType.ORGANIZER);
        Event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Event not found: " + eventId));

        event.setPairwiseJudgingEnabled(enabled);
        eventRepository.save(event);

        String action = enabled ? "PAIRWISE_MODE_ENABLED" : "PAIRWISE_MODE_DISABLED";
        auditLogService.logAction(callerUserId, eventId, action,
                (enabled ? "Enabled" : "Disabled") + " pairwise judging mode for event: " + event.getName());
    }

    /**
     * Retrieves the next eligible pair for the authenticated judge.
     * Uses smart heuristic pair selection prioritizing underrepresented projects.
     */
    @Transactional(readOnly = true)
    public NextPairResponse getNextPair(Long eventId, Long judgeUserId, Long trackId) {
        Event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Event not found: " + eventId));

        // Verify judge authorization (JUDGE, ORGANIZER, or ADMIN)
        boolean isAuthorized = authorizationPolicy.hasEventRole(judgeUserId, eventId, RoleType.JUDGE) ||
                               authorizationPolicy.hasEventRole(judgeUserId, eventId, RoleType.ORGANIZER) ||
                               authorizationPolicy.hasEventRole(judgeUserId, eventId, RoleType.ADMIN) ||
                               authorizationPolicy.isOrganizerOrAdmin(judgeUserId);

        if (!isAuthorized) {
            throw new AccessDeniedException("Access denied: User is not authorized to judge in event " + eventId);
        }

        // Check if event is closed / frozen
        if ("CLOSED".equalsIgnoreCase(event.getStatus())) {
            return NextPairResponse.noMorePairs("Event judging is closed.", 0, 0);
        }

        // Get eligible submissions for this judge
        List<Submission> eligible = getEligibleSubmissionsForJudge(eventId, judgeUserId, trackId);
        int totalEligible = eligible.size();

        if (totalEligible < 2) {
            return NextPairResponse.noMorePairs(
                    "Fewer than 2 eligible projects available for comparison in this scope.",
                    (int) comparisonRepository.countByJudgeIdAndEventId(judgeUserId, eventId),
                    totalEligible
            );
        }

        // Load existing comparisons completed by this judge in this event
        List<PairwiseComparison> judgeComps = comparisonRepository.findByJudgeIdAndEventId(judgeUserId, eventId);
        Set<String> evaluatedPairs = new HashSet<>();
        for (PairwiseComparison c : judgeComps) {
            evaluatedPairs.add(c.getProjectAId() + "-" + c.getProjectBId());
        }

        // =========================================================================
        // Smart Pair Selection:
        // Prioritize pairs containing projects with fewest overall comparisons across the event,
        // and pairs not yet compared by ANY judge to maximize graph coverage.
        // =========================================================================
        List<PairwiseComparison> allEventComps = comparisonRepository.findByEventId(eventId);
        Map<Long, Integer> eventCompsPerProject = new HashMap<>();
        Map<String, Integer> eventPairCount = new HashMap<>();

        for (Submission s : eligible) {
            eventCompsPerProject.put(s.getId(), 0);
        }
        for (PairwiseComparison c : allEventComps) {
            eventCompsPerProject.computeIfPresent(c.getProjectAId(), (k, v) -> v + 1);
            eventCompsPerProject.computeIfPresent(c.getProjectBId(), (k, v) -> v + 1);
            String pKey = c.getProjectAId() + "-" + c.getProjectBId();
            eventPairCount.put(pKey, eventPairCount.getOrDefault(pKey, 0) + 1);
        }

        // Sort eligible submissions by comparisons ascending (underrepresented projects first)
        List<Submission> sortedEligible = new ArrayList<>(eligible);
        sortedEligible.sort(Comparator.comparingInt((Submission s) -> eventCompsPerProject.getOrDefault(s.getId(), 0))
                .thenComparing(Submission::getId));

        Map<Long, Submission> subMap = new HashMap<>();
        for (Submission s : sortedEligible) {
            subMap.put(s.getId(), s);
        }

        // Bounded candidate pool to prevent O(N^2) combinatorial explosion for large N
        int poolSize = Math.min(sortedEligible.size(), 40);
        List<PairCandidate> candidatePairs = new ArrayList<>();

        while (candidatePairs.isEmpty() && poolSize <= sortedEligible.size()) {
            List<Long> poolIds = sortedEligible.subList(0, poolSize).stream()
                    .map(Submission::getId)
                    .sorted()
                    .collect(Collectors.toList());

            for (int i = 0; i < poolIds.size(); i++) {
                for (int j = i + 1; j < poolIds.size(); j++) {
                    Long pA = poolIds.get(i);
                    Long pB = poolIds.get(j);
                    if (!evaluatedPairs.contains(pA + "-" + pB)) {
                        candidatePairs.add(new PairCandidate(pA, pB));
                    }
                }
            }

            if (candidatePairs.isEmpty()) {
                if (poolSize >= sortedEligible.size()) {
                    break;
                }
                poolSize = Math.min(sortedEligible.size(), poolSize + 40);
            }
        }

        int completedCount = judgeComps.size();
        if (candidatePairs.isEmpty()) {
            return NextPairResponse.noMorePairs(
                    "All available comparisons completed for your assigned queue.",
                    completedCount,
                    totalEligible
            );
        }

        candidatePairs.sort((pair1, pair2) -> {
            int minComps1 = Math.min(eventCompsPerProject.getOrDefault(pair1.pA, 0), eventCompsPerProject.getOrDefault(pair1.pB, 0));
            int minComps2 = Math.min(eventCompsPerProject.getOrDefault(pair2.pA, 0), eventCompsPerProject.getOrDefault(pair2.pB, 0));
            if (minComps1 != minComps2) {
                return Integer.compare(minComps1, minComps2); // prioritize projects with fewer comparisons
            }

            int pairFreq1 = eventPairCount.getOrDefault(pair1.pA + "-" + pair1.pB, 0);
            int pairFreq2 = eventPairCount.getOrDefault(pair2.pA + "-" + pair2.pB, 0);
            if (pairFreq1 != pairFreq2) {
                return Integer.compare(pairFreq1, pairFreq2); // prioritize brand new pairs
            }

            int sumComps1 = eventCompsPerProject.getOrDefault(pair1.pA, 0) + eventCompsPerProject.getOrDefault(pair1.pB, 0);
            int sumComps2 = eventCompsPerProject.getOrDefault(pair2.pA, 0) + eventCompsPerProject.getOrDefault(pair2.pB, 0);
            if (sumComps1 != sumComps2) {
                return Integer.compare(sumComps1, sumComps2);
            }

            int cmpA = pair1.pA.compareTo(pair2.pA);
            if (cmpA != 0) return cmpA;
            return pair1.pB.compareTo(pair2.pB);
        });

        PairCandidate chosen = candidatePairs.get(0);
        Submission sA = subMap.get(chosen.pA);
        Submission sB = subMap.get(chosen.pB);

        NextPairResponse response = new NextPairResponse();
        response.setHasPair(true);
        response.setEventId(eventId);
        response.setTrackId(trackId);
        if (trackId != null) {
            trackRepository.findById(trackId).ifPresent(t -> response.setTrackName(t.getName()));
        }
        response.setProjectA(toCardDto(sA));
        response.setProjectB(toCardDto(sB));
        response.setCompletedCount(completedCount);
        response.setRemainingAvailable(candidatePairs.size());
        response.setTotalEligibleProjects(totalEligible);
        response.setMessage("Next pairwise comparison ready.");

        return response;
    }

    /**
     * Submits a pairwise comparison decision.
     * Enforces canonical pair sorting (pA < pB), duplicate rejection, and COI/team checks.
     */
    @Transactional
    public PairwiseComparison submitComparison(Long eventId, SubmitPairwiseComparisonRequest request, Long judgeUserId) {
        Event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Event not found: " + eventId));

        // Verify judge authorization
        boolean isAuthorized = authorizationPolicy.hasEventRole(judgeUserId, eventId, RoleType.JUDGE) ||
                               authorizationPolicy.hasEventRole(judgeUserId, eventId, RoleType.ORGANIZER) ||
                               authorizationPolicy.hasEventRole(judgeUserId, eventId, RoleType.ADMIN) ||
                               authorizationPolicy.isOrganizerOrAdmin(judgeUserId);

        if (!isAuthorized) {
            throw new AccessDeniedException("Access denied: User is not authorized to submit comparisons in event " + eventId);
        }

        if ("CLOSED".equalsIgnoreCase(event.getStatus())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Judging is closed for this event.");
        }

        if (request.getProjectAId() == null || request.getProjectBId() == null || request.getWinnerProjectId() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "projectAId, projectBId, and winnerProjectId are required.");
        }

        if (request.getProjectAId().equals(request.getProjectBId())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Cannot compare a project with itself.");
        }

        // Canonicalize pair ordering: pA < pB
        Long pA = Math.min(request.getProjectAId(), request.getProjectBId());
        Long pB = Math.max(request.getProjectAId(), request.getProjectBId());
        Long winnerId = request.getWinnerProjectId();

        if (!winnerId.equals(pA) && !winnerId.equals(pB)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Winner project ID must be either Project A or Project B.");
        }

        // Check duplicate comparison
        if (comparisonRepository.existsByJudgeIdAndEventIdAndProjectAIdAndProjectBId(judgeUserId, eventId, pA, pB)) {
            auditLogService.logAction(judgeUserId, eventId, "PAIRWISE_COMPARISON_DUPLICATE_REJECTED",
                    String.format("Duplicate comparison rejected for judge %d on pair (%d, %d)", judgeUserId, pA, pB));
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Duplicate comparison: this pair has already been evaluated by this judge.");
        }

        // Verify submissions exist, belong to this event, and check for conflicts
        Submission subA = submissionRepository.findById(pA)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Submission not found: " + pA));
        Submission subB = submissionRepository.findById(pB)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Submission not found: " + pB));

        if (!subA.getEventId().equals(eventId) || !subB.getEventId().equals(eventId)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "One or both submissions do not belong to event " + eventId);
        }

        // Check Conflict of Interest
        if (coiRepository.existsByJudgeIdAndSubmissionId(judgeUserId, pA) || coiRepository.existsByJudgeIdAndSubmissionId(judgeUserId, pB)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Conflict of Interest exists for one of the projects.");
        }

        // Check Team Membership
        if ((subA.getTeamId() != null && teamMemberRepository.existsByTeamIdAndUserId(subA.getTeamId(), judgeUserId)) ||
            (subB.getTeamId() != null && teamMemberRepository.existsByTeamIdAndUserId(subB.getTeamId(), judgeUserId))) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Judge is a member of the team submitting one of the projects.");
        }

        // Persist comparison
        PairwiseComparison comp = new PairwiseComparison(
                eventId,
                request.getTrackId(),
                judgeUserId,
                pA,
                pB,
                winnerId
        );
        PairwiseComparison saved = comparisonRepository.save(comp);

        auditLogService.logAction(judgeUserId, eventId, "PAIRWISE_COMPARISON_CREATED",
                String.format("Judge %d submitted comparison for pair (%d, %d), winner: %d", judgeUserId, pA, pB, winnerId));

        return saved;
    }

    /**
     * Returns personal pairwise progress for the authenticated judge.
     */
    @Transactional(readOnly = true)
    public JudgePairwiseProgressResponse getJudgeProgress(Long eventId, Long judgeUserId) {
        Event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Event not found: " + eventId));
        List<Submission> eligible = getEligibleSubmissionsForJudge(eventId, judgeUserId, null);
        int totalEligible = eligible.size();
        int totalPossible = (totalEligible * (totalEligible - 1)) / 2;

        int completed = (int) comparisonRepository.countByJudgeIdAndEventId(judgeUserId, eventId);
        int remaining = Math.max(0, totalPossible - completed);

        JudgePairwiseProgressResponse res = new JudgePairwiseProgressResponse(judgeUserId, eventId, completed, remaining, totalEligible, totalPossible);
        res.setPairwiseEnabled(Boolean.TRUE.equals(event.getPairwiseJudgingEnabled()));
        return res;
    }

    /**
     * Returns comparison records with strict judge peer isolation.
     */
    @Transactional(readOnly = true)
    public List<PairwiseComparison> getComparisonsWithIsolation(Long eventId, Long targetJudgeId, Long callerUserId) {
        boolean isOrganizerOrAdmin = authorizationPolicy.hasEventRole(callerUserId, eventId, RoleType.ORGANIZER) ||
                                     authorizationPolicy.hasEventRole(callerUserId, eventId, RoleType.ADMIN) ||
                                     authorizationPolicy.isOrganizerOrAdmin(callerUserId);

        if (targetJudgeId != null) {
            if (!targetJudgeId.equals(callerUserId) && !isOrganizerOrAdmin) {
                throw new AccessDeniedException("Access denied: You cannot view peer judge comparisons.");
            }
            return comparisonRepository.findByJudgeIdAndEventId(targetJudgeId, eventId);
        }

        if (isOrganizerOrAdmin) {
            return comparisonRepository.findByEventId(eventId);
        }

        return comparisonRepository.findByJudgeIdAndEventId(callerUserId, eventId);
    }

    /**
     * Organizer Pairwise Results view computing Bradley-Terry ranking.
     * Respects results publication lifecycle for non-organizers.
     */
    @Transactional
    public BradleyTerryRankingResult getPairwiseResults(Long eventId, Long callerUserId) {
        Event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Event not found: " + eventId));

        boolean isOrganizerOrAdmin = callerUserId != null && (
                authorizationPolicy.hasEventRole(callerUserId, eventId, RoleType.ORGANIZER) ||
                authorizationPolicy.hasEventRole(callerUserId, eventId, RoleType.ADMIN) ||
                authorizationPolicy.isOrganizerOrAdmin(callerUserId)
        );

        Instant publishAt = event.getResultsPublishAt() != null ? event.getResultsPublishAt() : event.getJudgingEnd();
        boolean isClosed = "CLOSED".equalsIgnoreCase(event.getStatus());
        boolean isPublished = isClosed || (publishAt != null && Instant.now().isAfter(publishAt));

        if (!isOrganizerOrAdmin && !isPublished) {
            String msg = publishAt != null
                    ? "Pairwise results are not published yet. Results will be available at " + publishAt
                    : "Pairwise results are not published yet. Judging is currently in progress.";
            throw new AccessDeniedException(msg);
        }

        List<Submission> eligible = submissionRepository.findByEventIdAndStatus(eventId, "SUBMITTED");
        if (eligible.isEmpty()) {
            eligible = submissionRepository.findByEventId(eventId);
        }
        eligible.sort(Comparator.comparing(Submission::getId));
        Map<String, Submission> uniqueByTitle = new LinkedHashMap<>();
        for (Submission s : eligible) {
            String key = s.getTitle() != null ? s.getTitle().trim() : ("sub-" + s.getId());
            if (!uniqueByTitle.containsKey(key)) {
                uniqueByTitle.put(key, s);
            }
        }
        eligible = new ArrayList<>(uniqueByTitle.values());

        List<PairwiseComparison> comps = comparisonRepository.findByEventId(eventId);
        BradleyTerryRankingResult result = bradleyTerryService.computeRankings(eventId, eligible, comps);

        if (callerUserId != null) {
            if ("CONVERGED".equals(result.getStatus())) {
                auditLogService.logAction(callerUserId, eventId, "PAIRWISE_RANKING_CALCULATED",
                        "Calculated Bradley-Terry rankings for " + eligible.size() + " projects in event " + eventId);
            } else {
                auditLogService.logAction(callerUserId, eventId, "PAIRWISE_RANKING_INSUFFICIENT_COVERAGE",
                        "Pairwise ranking coverage insufficient: " + result.getMessage());
            }
        }

        return result;
    }

    /**
     * Generates a compact organizer coverage dashboard.
     */
    @Transactional(readOnly = true)
    public PairwiseCoverageDashboardDto getCoverageDashboard(Long eventId, Long callerUserId) {
        authorizationPolicy.requireEventRole(callerUserId, eventId, RoleType.ORGANIZER);
        Event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Event not found: " + eventId));

        List<Submission> eligible = submissionRepository.findByEventIdAndStatus(eventId, "SUBMITTED");
        if (eligible.isEmpty()) {
            eligible = submissionRepository.findByEventId(eventId);
        }
        eligible.sort(Comparator.comparing(Submission::getId));
        Map<String, Submission> covUnique = new LinkedHashMap<>();
        for (Submission s : eligible) {
            String key = s.getTitle() != null ? s.getTitle().trim() : ("sub-" + s.getId());
            if (!covUnique.containsKey(key)) {
                covUnique.put(key, s);
            }
        }
        eligible = new ArrayList<>(covUnique.values());

        List<PairwiseComparison> comps = comparisonRepository.findByEventId(eventId);
        int totalProjects = eligible.size();
        int totalPossiblePairs = (totalProjects * (totalProjects - 1)) / 2;

        Map<Long, Integer> projectCompCounts = new HashMap<>();
        Set<String> uniquePairs = new HashSet<>();
        Set<Long> participatingJudges = new HashSet<>();

        for (Submission s : eligible) {
            projectCompCounts.put(s.getId(), 0);
        }

        for (PairwiseComparison c : comps) {
            uniquePairs.add(c.getProjectAId() + "-" + c.getProjectBId());
            participatingJudges.add(c.getJudgeId());
            projectCompCounts.computeIfPresent(c.getProjectAId(), (k, v) -> v + 1);
            projectCompCounts.computeIfPresent(c.getProjectBId(), (k, v) -> v + 1);
        }

        List<Long> noComps = new ArrayList<>();
        List<Long> lowComps = new ArrayList<>();
        for (Map.Entry<Long, Integer> e : projectCompCounts.entrySet()) {
            if (e.getValue() == 0) {
                noComps.add(e.getKey());
            } else if (e.getValue() < 3) {
                lowComps.add(e.getKey());
            }
        }

        // Connectivity check
        BradleyTerryRankingResult btResult = bradleyTerryService.computeRankings(eventId, eligible, comps);

        PairwiseCoverageDashboardDto dto = new PairwiseCoverageDashboardDto();
        dto.setEventId(eventId);
        dto.setPairwiseEnabled(event.getPairwiseJudgingEnabled());
        dto.setTotalEligibleProjects(totalProjects);
        dto.setTotalPossiblePairs(totalPossiblePairs);
        dto.setUniquePairsCompared(uniquePairs.size());
        double covPct = totalPossiblePairs > 0 ? (uniquePairs.size() * 100.0 / totalPossiblePairs) : 0.0;
        dto.setCoveragePercentage(Math.round(covPct * 100.0) / 100.0);
        dto.setParticipatingJudges(participatingJudges.size());
        dto.setTotalComparisonsCompleted(comps.size());
        dto.setProjectsWithNoComparisons(noComps);
        dto.setProjectsWithLowComparisons(lowComps);
        dto.setDisconnectedComponents(btResult.getComponentCount());
        dto.setGraphConnected(btResult.isConnected());

        if (btResult.isConnected() && covPct >= 40.0) {
            dto.setCoverageHealthStatus("EXCELLENT");
        } else if (btResult.isConnected() || covPct >= 15.0) {
            dto.setCoverageHealthStatus("MODERATE");
        } else {
            dto.setCoverageHealthStatus("INSUFFICIENT");
        }

        return dto;
    }

    // -------------------------------------------------------------------------
    // Helper Methods
    // -------------------------------------------------------------------------

    private List<Submission> getEligibleSubmissionsForJudge(Long eventId, Long judgeUserId, Long trackId) {
        List<Submission> allSubs = submissionRepository.findByEventIdAndStatus(eventId, "SUBMITTED");
        if (allSubs.isEmpty()) {
            allSubs = submissionRepository.findByEventId(eventId);
        }
        allSubs.sort(Comparator.comparing(Submission::getId));
        Map<String, Submission> uniqueSubs = new LinkedHashMap<>();
        for (Submission s : allSubs) {
            String key = s.getTitle() != null ? s.getTitle().trim() : ("sub-" + s.getId());
            if (!uniqueSubs.containsKey(key)) {
                uniqueSubs.put(key, s);
            }
        }
        allSubs = new ArrayList<>(uniqueSubs.values());

        // Check if judge has specific assignments in this event
        List<JudgeAssignment> assignments = judgeAssignmentRepository.findActiveAssignmentsForJudgeAndEvent(judgeUserId, eventId);
        Set<Long> assignedSubIds = null;
        if (assignments != null && !assignments.isEmpty()) {
            assignedSubIds = assignments.stream()
                    .filter(a -> !"REMOVED_COI".equals(a.getStatus()))
                    .map(JudgeAssignment::getSubmissionId)
                    .collect(Collectors.toSet());
        }

        // Check if there are available uncompared pairs among assignedSubIds
        boolean restrictToAssigned = false;
        if (assignedSubIds != null && assignedSubIds.size() >= 2) {
            List<PairwiseComparison> judgeComps = comparisonRepository.findByJudgeIdAndEventId(judgeUserId, eventId);
            Set<String> evaluatedPairs = new HashSet<>();
            for (PairwiseComparison c : judgeComps) {
                evaluatedPairs.add(c.getProjectAId() + "-" + c.getProjectBId());
            }
            List<Long> assignedList = new ArrayList<>(assignedSubIds);
            int uncomparedAssigned = 0;
            for (int i = 0; i < assignedList.size(); i++) {
                for (int j = i + 1; j < assignedList.size(); j++) {
                    Long pA = Math.min(assignedList.get(i), assignedList.get(j));
                    Long pB = Math.max(assignedList.get(i), assignedList.get(j));
                    if (!evaluatedPairs.contains(pA + "-" + pB)) {
                        uncomparedAssigned++;
                    }
                }
            }
            if (uncomparedAssigned > 0) {
                restrictToAssigned = true;
            }
        }

        // Check if judge has specific track assignments in judge_tracks
        List<JudgeTrack> judgeTracks = judgeTrackRepository.findByJudgeId(judgeUserId);
        Set<String> allowedTrackNames = new HashSet<>();
        if (judgeTracks != null && !judgeTracks.isEmpty()) {
            for (JudgeTrack jt : judgeTracks) {
                if (jt.getEventId().equals(eventId)) {
                    trackRepository.findById(jt.getTrackId()).ifPresent(t -> allowedTrackNames.add(t.getName().toLowerCase().trim()));
                }
            }
        }

        // Filter trackId if requested
        String specificTrackName = null;
        if (trackId != null) {
            Optional<Track> tOpt = trackRepository.findById(trackId);
            if (tOpt.isPresent()) {
                specificTrackName = tOpt.get().getName().toLowerCase().trim();
            }
        }

        List<Submission> eligible = new ArrayList<>();
        for (Submission s : allSubs) {
            // Exclude COI
            if (coiRepository.existsByJudgeIdAndSubmissionId(judgeUserId, s.getId())) {
                continue;
            }
            // Exclude team membership
            if (s.getTeamId() != null && teamMemberRepository.existsByTeamIdAndUserId(s.getTeamId(), judgeUserId)) {
                continue;
            }
            // If judge has available assigned pairs, prioritize them
            if (restrictToAssigned && !assignedSubIds.contains(s.getId())) {
                continue;
            }
            // If trackId was specified, check track match
            if (specificTrackName != null) {
                if (s.getTrack() == null || !s.getTrack().toLowerCase().trim().equals(specificTrackName)) {
                    continue;
                }
            }
            // If judge has track restrictions and no specific assignment restriction, check track match
            if (!restrictToAssigned && !allowedTrackNames.isEmpty()) {
                if (s.getTrack() == null || !allowedTrackNames.contains(s.getTrack().toLowerCase().trim())) {
                    continue;
                }
            }
            eligible.add(s);
        }

        return eligible;
    }

    private NextPairResponse.ProjectCardDto toCardDto(Submission s) {
        return new NextPairResponse.ProjectCardDto(
                s.getId(),
                s.getTitle(),
                s.getTagline(),
                s.getDescription(),
                s.getTrack(),
                s.getRepoUrl(),
                s.getDemoUrl(),
                s.getTechStack(),
                s.getThumbnailUrl()
        );
    }

    private static class PairCandidate {
        Long pA;
        Long pB;

        PairCandidate(Long pA, Long pB) {
            this.pA = pA;
            this.pB = pB;
        }
    }
}
