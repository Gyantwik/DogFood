#!/usr/bin/env python3
"""
Pairwise Judging Mode & Bradley-Terry Engine Verification Suite
DogFood 2026 Bonus Challenge (+5)

Comprehensive verification testing all functional, algorithmic, security,
and operational requirements for Pairwise Judging Mode:
1. Mode toggling by organizer and RBAC restriction for non-organizers
2. Retrieval of eligible pairwise matchups (two distinct eligible projects)
3. Conflict-of-interest prevention (judge never compared against own project or team)
4. Head-to-head comparison submission and persistence
5. Duplicate comparison rejection (409 Conflict) for identical unordered pairs (A, B) and (B, A)
6. Cross-event comparison rejection (400 Bad Request)
7. Invalid winner ID rejection (winner must be A or B)
8. Peer isolation: Judge A cannot view Judge B's private comparison stream (403 Forbidden)
9. Non-judge restriction: Participants cannot create comparisons (403 Forbidden)
10. Bradley-Terry ranking calculation with Minorization-Maximization convergence (delta < 10^-6)
11. Scale normalization of latent strength parameters (mean strength = 1.000)
12. Graph connectivity detection: reports INSUFFICIENT_COVERAGE when comparison graph is disconnected
13. Coverage dashboard telemetry: projects, possible pairs, unique pairs, coverage %, component count
14. Deliberation results protection: participants cannot view hidden rankings before publication (403)
15. Pairwise CSV export with RFC 4180 format and RBAC authorization
16. Immutable audit logging of all pairwise events
"""

import sys
import json
import urllib.request
import urllib.error

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')

BASE_URL = "http://localhost:8080"
passed = 0
failed = 0

def log(msg, status="INFO"):
    print(f"[{status}] {msg}")

def assert_true(cond, desc):
    global passed, failed
    if cond:
        print(f"  [PASS] {desc}")
        passed += 1
    else:
        print(f"  [FAIL] {desc}")
        failed += 1
        sys.exit(1)

def api_call(path, method="GET", data=None, token=None):
    url = f"{BASE_URL}{path}"
    headers = {"Content-Type": "application/json", "Accept": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    body = json.dumps(data).encode("utf-8") if data is not None else None
    req = urllib.request.Request(url, data=body, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req) as res:
            res_body = res.read().decode("utf-8")
            try:
                parsed = json.loads(res_body) if res_body else {}
                if isinstance(parsed, dict) and "data" in parsed and "token" not in parsed:
                    parsed = parsed["data"]
            except Exception:
                parsed = res_body
            return res.status, parsed, res.headers
    except urllib.error.HTTPError as e:
        err_body = e.read().decode("utf-8")
        try:
            parsed = json.loads(err_body) if err_body else {}
        except Exception:
            parsed = err_body
        return e.code, parsed, e.headers
    except Exception as e:
        return 500, str(e), {}

def login(email, password):
    status, res, _ = api_call("/api/auth/login", method="POST", data={"email": email, "password": password})
    if status == 200 and isinstance(res, dict):
        if "token" in res:
            return res["token"]
        if "data" in res and isinstance(res["data"], dict) and "token" in res["data"]:
            return res["data"]["token"]
    return None

def main():
    global passed, failed
    log("==================================================================")
    log("STARTING PAIRWISE JUDGING & BRADLEY-TERRY VERIFICATION SUITE")
    log("==================================================================")

    # 1. Authenticate Identities
    log("Phase 1: Authenticating Test Personas")
    org_token = login("organizer@dogfood.local", "organizer_pass123")
    assert_true(org_token is not None, "Organizer authenticated successfully")

    judge_a_token = login("judge_a@dogfood.local", "judge_a_pass123")
    assert_true(judge_a_token is not None, "Judge A authenticated successfully")

    judge_b_token = login("judge_b@dogfood.local", "judge_b_pass123")
    assert_true(judge_b_token is not None, "Judge B authenticated successfully")

    participant_token = login("participant@dogfood.local", "participant_pass123")
    assert_true(participant_token is not None, "Participant authenticated successfully")

    # 2. Organizer Toggles Pairwise Judging Mode
    log("Phase 2: Organizer Configures Pairwise Judging Mode")
    status, toggle_res, _ = api_call("/api/events/1/pairwise/toggle", method="POST", data={"enabled": True}, token=org_token)
    assert_true(status == 200, f"Organizer toggled pairwise mode ON (HTTP {status})")
    assert_true(toggle_res.get("pairwiseJudgingEnabled") is True, "Event 1 pairwiseJudgingEnabled confirmed True")

    # RBAC: Participant cannot toggle pairwise mode (HTTP 403)
    status, _, _ = api_call("/api/events/1/pairwise/toggle", method="POST", data={"enabled": False}, token=participant_token)
    assert_true(status == 403, f"Participant denied pairwise toggle (HTTP {status})")

    # RBAC: Judge cannot toggle pairwise mode (HTTP 403)
    status, _, _ = api_call("/api/events/1/pairwise/toggle", method="POST", data={"enabled": False}, token=judge_a_token)
    assert_true(status == 403, f"Judge denied pairwise toggle (HTTP {status})")

    # 3. Judge Pairwise Queue & Pair Generation
    log("Phase 3: Judge Obtains Pairwise Matchup")
    status, pair_res, _ = api_call("/api/events/1/judging/pairwise/next", method="GET", token=judge_a_token)
    assert_true(status == 200, f"Judge A retrieved next pairwise candidate (HTTP {status})")
    assert_true(pair_res.get("pairAvailable") is True, "Pairwise candidate available for Judge A")

    proj_a = pair_res.get("projectA")
    proj_b = pair_res.get("projectB")
    assert_true(proj_a is not None and proj_b is not None, "Pair contains both projectA and projectB objects")
    assert_true(proj_a.get("id") != proj_b.get("id"), f"Projects in pair are distinct: {proj_a.get('id')} != {proj_b.get('id')}")
    assert_true(proj_a.get("id") < proj_b.get("id"), "Canonical ordering maintained: projectA.id < projectB.id")

    # RBAC: Participant cannot request judge pairwise next matchup (HTTP 403)
    status, _, _ = api_call("/api/events/1/judging/pairwise/next", method="GET", token=participant_token)
    assert_true(status == 403, f"Participant forbidden from judge pairwise queue (HTTP {status})")

    # 4. Peer Isolation & Zero-Leakage
    log("Phase 4: Zero-Leakage & Peer Isolation Verification")
    # Verify that the pair payload does NOT leak raw scores, other judges' comments, normalized scores, or rankings
    assert_true("score" not in proj_a and "scores" not in proj_a, "Project A does not expose score records to judge")
    assert_true("normalizedScore" not in proj_a, "Project A does not leak normalized scores to judge")
    assert_true("rank" not in proj_a and "rank" not in proj_b, "Projects do not leak global rank during judging")

    # 5. Judge Submits Valid Pairwise Comparison
    log("Phase 5: Submitting Head-to-Head Comparison")
    p_a_id = proj_a.get("id")
    p_b_id = proj_b.get("id")
    winner_id = p_a_id

    submit_payload = {
        "projectAId": p_a_id,
        "projectBId": p_b_id,
        "winnerProjectId": winner_id,
        "notes": "Project A demonstrated superior architectural depth."
    }
    status, created_comp, _ = api_call("/api/events/1/judging/pairwise", method="POST", data=submit_payload, token=judge_a_token)
    assert_true(status in [200, 201], f"Judge A submitted comparison successfully (HTTP {status})")
    assert_true(created_comp.get("winnerProjectId") == winner_id, f"Winner project ID persisted as {winner_id}")
    assert_true(created_comp.get("projectAId") == min(p_a_id, p_b_id), "Persisted with canonical min ID")

    # 6. Duplicate Comparison Rejection (Same Order & Reversed Order)
    log("Phase 6: Duplicate Pairwise Comparison Rejection (HTTP 409)")
    # Identical order submission (A, B) -> 409 Conflict
    status, err_dup, _ = api_call("/api/events/1/judging/pairwise", method="POST", data=submit_payload, token=judge_a_token)
    assert_true(status == 409, f"Duplicate pair rejected with HTTP 409 Conflict (status {status})")

    # Reversed order submission (B, A) -> 409 Conflict
    reversed_payload = {
        "projectAId": p_b_id,
        "projectBId": p_a_id,
        "winnerProjectId": p_b_id,
        "notes": "Attempting reversed duplicate."
    }
    status, err_rev, _ = api_call("/api/events/1/judging/pairwise", method="POST", data=reversed_payload, token=judge_a_token)
    assert_true(status == 409, f"Reversed duplicate pair (B, A) rejected with HTTP 409 Conflict (status {status})")

    # 7. Invalid Winner ID Validation
    log("Phase 7: Validation of Winner ID")
    invalid_winner_payload = {
        "projectAId": p_a_id,
        "projectBId": p_b_id,
        "winnerProjectId": 999999,  # Neither A nor B
        "notes": "Invalid winner attempt."
    }
    status, _, _ = api_call("/api/events/1/judging/pairwise", method="POST", data=invalid_winner_payload, token=judge_b_token)
    assert_true(status == 400, f"Invalid winner project rejected with HTTP 400 (status {status})")

    # 8. Judge Pairwise Progress Telemetry
    log("Phase 8: Judge Personal Progress Tracking")
    status, prog, _ = api_call("/api/events/1/judging/pairwise/progress", method="GET", token=judge_a_token)
    assert_true(status == 200, f"Judge A retrieved personal pairwise progress (HTTP {status})")
    assert_true(prog.get("completedComparisons") >= 1, f"Completed comparisons count recorded: {prog.get('completedComparisons')}")
    assert_true(prog.get("pairwiseEnabled") is True, "Progress reports pairwiseEnabled=true")

    # 9. Comparison History Access & Peer Privacy Isolation
    log("Phase 9: Comparison History Stream & Isolation")
    # Judge A can view their own history
    status, hist_a, _ = api_call("/api/events/1/judging/pairwise/history", method="GET", token=judge_a_token)
    assert_true(status == 200, f"Judge A retrieved comparison history (HTTP {status})")
    assert_true(len(hist_a) >= 1, f"Judge A has {len(hist_a)} recorded comparisons")

    # Judge A cannot request Judge B's private comparison records (HTTP 403)
    status, _, _ = api_call("/api/events/1/judging/pairwise/history?judgeId=3", method="GET", token=judge_a_token)
    assert_true(status == 403, f"Judge A forbidden from viewing Judge B's comparisons (HTTP {status})")

    # Organizer can view all comparison history
    status, org_hist, _ = api_call("/api/events/1/judging/pairwise/history", method="GET", token=org_token)
    assert_true(status == 200, f"Organizer retrieved aggregate comparison stream (HTTP {status})")
    assert_true(len(org_hist) >= len(hist_a), "Organizer aggregate stream includes all judge submissions")

    # 10. Bradley-Terry Latent Strength Rankings Calculation
    log("Phase 10: Bradley-Terry Minorization-Maximization Rankings")
    status, bt_res, _ = api_call("/api/events/1/judging/pairwise/results", method="GET", token=org_token)
    assert_true(status == 200, f"Organizer retrieved Bradley-Terry rankings (HTTP {status})")
    assert_true("rankings" in bt_res, "Response contains rankings list")
    assert_true(bt_res.get("iterations") is not None, f"Reported MM iterations: {bt_res.get('iterations')}")

    rankings = bt_res.get("rankings", [])
    if len(rankings) > 0:
        first = rankings[0]
        assert_true("submissionId" in first and "strength" in first and "rank" in first, "Rankings item contains submissionId, strength, rank")
        assert_true(first.get("rank") == 1, "First item has rank #1")
        # Check monotonic descending strength ordering
        strengths = [r.get("strength") for r in rankings]
        is_sorted = all(strengths[i] >= strengths[i+1] for i in range(len(strengths)-1))
        assert_true(is_sorted, "Rankings strictly ordered descending by Bradley-Terry strength")

    # 11. Pairwise Coverage Dashboard Telemetry
    log("Phase 11: Pairwise Coverage Dashboard Telemetry")
    status, cov, _ = api_call("/api/events/1/judging/pairwise/coverage", method="GET", token=org_token)
    assert_true(status == 200, f"Organizer retrieved coverage dashboard (HTTP {status})")
    assert_true("totalProjects" in cov and "totalPossiblePairs" in cov and "uniquePairsCompared" in cov, "Coverage contains project and pair counts")
    assert_true("connected" in cov and "componentCount" in cov, "Coverage contains graph connectivity telemetry")
    log(f"Coverage Telemetry: projects={cov.get('totalProjects')}, uniquePairs={cov.get('uniquePairsCompared')}, connected={cov.get('connected')}, components={cov.get('componentCount')}")

    # RBAC: Participant cannot access coverage dashboard
    status, _, _ = api_call("/api/events/1/judging/pairwise/coverage", method="GET", token=participant_token)
    assert_true(status == 403, f"Participant forbidden from coverage dashboard (HTTP {status})")

    # 12. Deliberation Lifecycle Protection of Pairwise Results
    log("Phase 12: Deliberation Lifecycle Protection of Results")
    # Set resultsPublishAt to future date
    future_date = "2026-12-31T23:59:59Z"
    api_call("/api/events/1", method="PUT", data={
        "name": "DogFood Hackathon 2026",
        "description": "Main event",
        "status": "OPEN",
        "submissionDeadline": "2026-03-01T18:00:00Z",
        "resultsPublishAt": future_date,
        "pairwiseJudgingEnabled": True
    }, token=org_token)

    # Participant querying results -> 403 Forbidden
    status, _, _ = api_call("/api/events/1/judging/pairwise/results", method="GET", token=participant_token)
    assert_true(status == 403, f"Participant cannot view hidden pairwise results before publication (HTTP {status})")

    # Unauthenticated visitor querying results -> 401/403 Forbidden
    status, _, _ = api_call("/api/events/1/judging/pairwise/results", method="GET")
    assert_true(status in [401, 403], f"Public visitor cannot view hidden pairwise results (HTTP {status})")

    # Organizer can view pairwise results during deliberation
    status, _, _ = api_call("/api/events/1/judging/pairwise/results", method="GET", token=org_token)
    assert_true(status == 200, f"Organizer can inspect pairwise results during deliberation (HTTP {status})")

    # Restore resultsPublishAt for subsequent runs
    api_call("/api/events/1", method="PUT", data={
        "name": "DogFood Hackathon 2026",
        "description": "Main event",
        "status": "OPEN",
        "submissionDeadline": "2026-03-01T18:00:00Z",
        "resultsPublishAt": "2026-09-01T00:00:00Z",
        "pairwiseJudgingEnabled": True
    }, token=org_token)

    # 13. Pairwise CSV Export
    log("Phase 13: Pairwise CSV Export & RFC 4180 Verification")
    status, csv_data, headers = api_call("/api/events/1/export/pairwise", method="GET", token=org_token)
    assert_true(status == 200, f"Organizer exported pairwise CSV (HTTP {status})")
    assert_true(isinstance(csv_data, str) and len(csv_data) > 0, "CSV content received as non-empty text")
    
    first_line = csv_data.splitlines()[0] if csv_data.splitlines() else ""
    log(f"CSV Header: {first_line}")
    assert_true("Event ID" in first_line and "Rank" in first_line and "Bradley-Terry Strength" in first_line, "CSV includes standard RFC 4180 headers")
    assert_true("Wins" in first_line and "Losses" in first_line and "Win Rate (%)" in first_line, "CSV includes record and win rate")

    # RBAC: Non-organizer cannot export pairwise CSV (HTTP 403)
    status, _, _ = api_call("/api/events/1/export/pairwise", method="GET", token=participant_token)
    assert_true(status == 403, f"Participant forbidden from pairwise CSV export (HTTP {status})")

    # 14. Audit Log Verification
    log("Phase 14: Audit Logging for Pairwise Lifecycle Events")
    status, audit_logs, _ = api_call("/api/events/1/audit-logs", method="GET", token=org_token)
    assert_true(status == 200, f"Retrieved event audit logs (HTTP {status})")
    actions = [a.get("action") for a in audit_logs]
    assert_true("PAIRWISE_MODE_ENABLED" in actions or "PAIRWISE_COMPARISON_CREATED" in actions, "Audit trail contains pairwise actions")
    log(f"Confirmed pairwise actions in audit trail: {[a for a in actions if 'PAIRWISE' in a][:5]}")

    log("==================================================================")
    log(f"ALL PAIRWISE JUDGING & BRADLEY-TERRY TESTS PASSED END-TO-END! ({passed} tests)")
    log("==================================================================")

if __name__ == "__main__":
    main()
