package com.dogfood.pairwise;

import com.dogfood.events.Submission;
import com.dogfood.pairwise.dto.BradleyTerryRankingResult;
import com.dogfood.pairwise.dto.ProjectBradleyTerryDto;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.*;

@Service
public class BradleyTerryService {

    private static final Logger log = LoggerFactory.getLogger(BradleyTerryService.class);

    private static final double EPSILON = 1e-6;
    private static final int MAX_ITERATIONS = 100;
    private static final double REGULARIZATION_ALPHA = 0.05; // Bayesian smoothing prior

    /**
     * Computes the Bradley-Terry ranking from persisted pairwise comparisons.
     *
     * @param eventId The event ID
     * @param eligibleSubmissions The list of all eligible submissions for the event/track
     * @param comparisons The list of persisted pairwise comparisons
     * @return BradleyTerryRankingResult containing convergence info, graph connectivity, and ranked projects
     */
    public BradleyTerryRankingResult computeRankings(Long eventId,
                                                     List<Submission> eligibleSubmissions,
                                                     List<PairwiseComparison> comparisons) {
        BradleyTerryRankingResult result = new BradleyTerryRankingResult();
        result.setEventId(eventId);
        result.setTotalProjects(eligibleSubmissions.size());
        result.setTotalComparisons(comparisons.size());

        if (eligibleSubmissions.size() < 2 || comparisons.isEmpty()) {
            result.setStatus("INSUFFICIENT_COVERAGE");
            result.setConnected(false);
            result.setComponentCount(eligibleSubmissions.size());
            result.setMessage("At least 2 eligible projects and 1 comparison required for pairwise ranking.");
            result.setCoveragePercentage(0.0);
            result.setUniquePairsCompared(0);
            return result;
        }

        // Map submission IDs for quick lookup
        Map<Long, Submission> submissionMap = new LinkedHashMap<>();
        for (Submission s : eligibleSubmissions) {
            submissionMap.put(s.getId(), s);
        }

        // Calculate win-loss matrix and comparison graph
        // w[i][j] = wins of i over j
        Map<Long, Map<Long, Integer>> winsMatrix = new HashMap<>();
        Map<Long, Integer> winsCount = new HashMap<>();
        Map<Long, Integer> totalCompsPerProject = new HashMap<>();
        Set<String> uniquePairsSet = new HashSet<>();

        // Adjacency graph for connectivity check
        Map<Long, Set<Long>> adj = new HashMap<>();
        for (Long pId : submissionMap.keySet()) {
            adj.put(pId, new HashSet<>());
            winsCount.put(pId, 0);
            totalCompsPerProject.put(pId, 0);
            winsMatrix.put(pId, new HashMap<>());
        }

        for (PairwiseComparison c : comparisons) {
            Long pA = c.getProjectAId();
            Long pB = c.getProjectBId();
            Long winner = c.getWinnerProjectId();

            // Only count if both projects are in eligible list
            if (!submissionMap.containsKey(pA) || !submissionMap.containsKey(pB)) {
                continue;
            }

            uniquePairsSet.add(pA + "-" + pB);
            adj.get(pA).add(pB);
            adj.get(pB).add(pA);

            totalCompsPerProject.put(pA, totalCompsPerProject.get(pA) + 1);
            totalCompsPerProject.put(pB, totalCompsPerProject.get(pB) + 1);

            Long loser = winner.equals(pA) ? pB : pA;
            winsCount.put(winner, winsCount.get(winner) + 1);

            Map<Long, Integer> wRow = winsMatrix.get(winner);
            wRow.put(loser, wRow.getOrDefault(loser, 0) + 1);
        }

        int uniquePairs = uniquePairsSet.size();
        int n = eligibleSubmissions.size();
        int totalPossiblePairs = (n * (n - 1)) / 2;
        double coveragePct = totalPossiblePairs > 0 ? (uniquePairs * 100.0 / totalPossiblePairs) : 0.0;

        result.setUniquePairsCompared(uniquePairs);
        result.setCoveragePercentage(Math.round(coveragePct * 100.0) / 100.0);

        // Check Connected Components using BFS
        Set<Long> visited = new HashSet<>();
        int components = 0;
        for (Long pId : submissionMap.keySet()) {
            if (!visited.contains(pId)) {
                components++;
                Queue<Long> queue = new LinkedList<>();
                queue.add(pId);
                visited.add(pId);
                while (!queue.isEmpty()) {
                    Long curr = queue.poll();
                    for (Long neighbor : adj.getOrDefault(curr, Collections.emptySet())) {
                        if (!visited.contains(neighbor)) {
                            visited.add(neighbor);
                            queue.add(neighbor);
                        }
                    }
                }
            }
        }

        result.setComponentCount(components);
        boolean isConnected = (components == 1 && uniquePairs >= (n - 1));
        result.setConnected(isConnected);

        // =========================================================================
        // Bradley-Terry MM (Minorization-Maximization) Algorithm
        // Regularized with Bayesian smoothing prior alpha = 0.05
        // =========================================================================
        List<Long> projectIds = new ArrayList<>(submissionMap.keySet());
        Map<Long, Double> strengths = new LinkedHashMap<>();
        for (Long id : projectIds) {
            strengths.put(id, 1.0); // positive initialization
        }

        int iter = 0;
        double maxDelta = 1.0;

        while (iter < MAX_ITERATIONS && maxDelta > EPSILON) {
            iter++;
            Map<Long, Double> nextStrengths = new LinkedHashMap<>();
            maxDelta = 0.0;

            for (Long i : projectIds) {
                int wi = winsCount.getOrDefault(i, 0);
                double denom = 0.0;
                double si = strengths.get(i);

                for (Long j : projectIds) {
                    if (i.equals(j)) continue;
                    int wij = winsMatrix.get(i).getOrDefault(j, 0);
                    int wji = winsMatrix.get(j).getOrDefault(i, 0);
                    int nij = wij + wji;

                    if (nij > 0) {
                        double sj = strengths.get(j);
                        denom += (double) nij / (si + sj);
                    }
                }

                // Regularized MM update step
                double updatedSi = (wi + REGULARIZATION_ALPHA) / (denom + REGULARIZATION_ALPHA);
                nextStrengths.put(i, updatedSi);
            }

            // Scale normalization during iteration: average strength = 1.0
            double sum = nextStrengths.values().stream().mapToDouble(Double::doubleValue).sum();
            double scale = (double) projectIds.size() / (sum > 0 ? sum : 1.0);
            for (Long id : projectIds) {
                double normalizedSi = nextStrengths.get(id) * scale;
                double delta = Math.abs(normalizedSi - strengths.get(id));
                if (delta > maxDelta) {
                    maxDelta = delta;
                }
                strengths.put(id, normalizedSi);
            }
        }

        result.setIterations(iter);
        result.setConvergenceDelta(maxDelta);
        if (isConnected) {
            result.setStatus("CONVERGED");
            result.setMessage(String.format("Bradley-Terry model successfully converged in %d iterations (delta: %.2e).", iter, maxDelta));
        } else {
            result.setStatus("INSUFFICIENT_COVERAGE");
            result.setMessage(String.format(
                    "Pairwise ranking coverage is incomplete with %d disconnected components. " +
                    "Preliminary regularized Bradley-Terry estimates computed in %d iterations (delta: %.2e).",
                    components, iter, maxDelta));
        }

        // Format rankings
        List<ProjectBradleyTerryDto> rankedList = new ArrayList<>();
        for (Long id : projectIds) {
            Submission s = submissionMap.get(id);
            double rawS = strengths.get(id);
            double sVal = Math.round(rawS * 10000.0) / 10000.0; // 4 decimals
            int comps = totalCompsPerProject.getOrDefault(id, 0);
            int wins = winsCount.getOrDefault(id, 0);
            int losses = comps - wins;

            rankedList.add(new ProjectBradleyTerryDto(
                    id, s.getTitle(), s.getTrack(), 0, sVal, rawS, comps, wins, losses
            ));
        }

        // Sort descending by strength, then win rate, then title (deterministic)
        rankedList.sort((a, b) -> {
            int cmp = Double.compare(b.getStrength(), a.getStrength());
            if (cmp != 0) return cmp;
            cmp = Double.compare(b.getWinRate(), a.getWinRate());
            if (cmp != 0) return cmp;
            return a.getTitle().compareTo(b.getTitle());
        });

        for (int r = 0; r < rankedList.size(); r++) {
            rankedList.get(r).setRank(r + 1);
        }

        result.setRankings(rankedList);
        return result;
    }
}
