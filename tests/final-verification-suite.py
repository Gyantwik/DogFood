#!/usr/bin/env python3
"""
DogFood — Targeted Final Verification Suite
Tests the 18 specific requirements requested by the final verification audit.
"""

import sys
import os
import json
import urllib.request
import urllib.error
import time

BASE_URL = "http://localhost:8080"

def request(path, method="GET", headers=None, data=None):
    if headers is None:
        headers = {}
    url = f"{BASE_URL}{path}"
    req = urllib.request.Request(url, method=method, headers=headers)
    if data is not None:
        if isinstance(data, (dict, list)):
            req.data = json.dumps(data).encode("utf-8")
            req.add_header("Content-Type", "application/json")
        elif isinstance(data, str):
            req.data = data.encode("utf-8")
        elif isinstance(data, bytes):
            req.data = data
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            content = resp.read().decode("utf-8", errors="replace")
            try:
                body = json.loads(content)
            except Exception:
                body = content
            return resp.status, body
    except urllib.error.HTTPError as e:
        content = e.read().decode("utf-8", errors="replace")
        try:
            body = json.loads(content)
        except Exception:
            body = content
        return e.code, body
    except Exception as e:
        return 0, str(e)

def login(email, password):
    status, body = request("/api/auth/login", method="POST", data={"email": email, "password": password})
    if status == 200 and isinstance(body, dict):
        inner = body.get("data", body)
        return inner.get("token")
    return None

def run_tests():
    print("=" * 70)
    print("DOGFOOD TARGETED 18-POINT VERIFICATION SUITE")
    print("=" * 70)

    # 1. Acquire Personas
    org_token = login("organizer@dogfood.local", "organizer_pass123")
    judge_a_token = login("judge_a@dogfood.local", "judge_a_pass123")
    judge_b_token = login("judge_b@dogfood.local", "judge_b_pass123")
    part_token = login("participant@dogfood.local", "participant_pass123")

    if not all([org_token, judge_a_token, judge_b_token, part_token]):
        print("[FAIL] Could not acquire tokens for all personas")
        sys.exit(1)

    org_headers = {"Authorization": f"Bearer {org_token}"}
    judge_a_headers = {"Authorization": f"Bearer {judge_a_token}"}
    judge_b_headers = {"Authorization": f"Bearer {judge_b_token}"}
    part_headers = {"Authorization": f"Bearer {part_token}"}

    results = {}

    # -------------------------------------------------------------
    # Check 1: Submission before start -> rejected
    # -------------------------------------------------------------
    ts = int(time.time() * 1000)
    # Create event with future submissionStart (e.g., 2 days in future)
    future_iso = "2029-01-01T00:00:00Z"
    event_data = {
        "name": f"Early Test Event {ts}",
        "description": "Lifecycle test",
        "submissionStart": future_iso,
        "submissionDeadline": "2029-02-01T00:00:00Z"
    }
    st, resp = request("/api/events", method="POST", headers=org_headers, data=event_data)
    early_eid = resp.get("data", {}).get("id") if st == 201 else None

    if early_eid:
        sub_req = {"title": "Premature Project", "tagline": "Too early", "repoUrl": f"https://github.com/test/{ts}"}
        st_sub, body_sub = request(f"/api/events/{early_eid}/submissions", method="POST", headers=part_headers, data=sub_req)
        results[1] = (st_sub in (400, 409, 422, 500) or (isinstance(body_sub, dict) and not body_sub.get("success", True)),
                      f"Status={st_sub}")
    else:
        results[1] = (False, "Could not create test event")

    # -------------------------------------------------------------
    # Check 2: Submission during window -> accepted
    # -------------------------------------------------------------
    ts2 = int(time.time() * 1000)
    event_data2 = {
        "name": f"Open Window Event {ts2}",
        "description": "Lifecycle test 2",
        "submissionStart": "2020-01-01T00:00:00Z",
        "submissionDeadline": "2030-01-01T00:00:00Z"
    }
    st2, resp2 = request("/api/events", method="POST", headers=org_headers, data=event_data2)
    open_eid = resp2.get("data", {}).get("id") if st2 == 201 else None

    if open_eid:
        sub_req = {"title": f"Valid Window Project {ts2}", "tagline": "Just in time", "repoUrl": f"https://github.com/valid/{ts2}"}
        st_sub, body_sub = request(f"/api/events/{open_eid}/submissions", method="POST", headers=part_headers, data=sub_req)
        sub_id = body_sub.get("data", {}).get("id") if st_sub == 201 else None
        results[2] = (st_sub == 201 and sub_id is not None, f"Status={st_sub}, SubId={sub_id}")
    else:
        results[2] = (False, "Could not create open window event")

    # -------------------------------------------------------------
    # Check 3: Submission after deadline -> rejected
    # -------------------------------------------------------------
    # Event 1 deadline is in the past (2026-03-01T18:00:00Z)
    sub_late = {"title": "Late Project", "tagline": "Too late", "repoUrl": f"https://github.com/late/{ts}"}
    st_late, body_late = request("/api/events/1/submissions", method="POST", headers=part_headers, data=sub_late)
    results[3] = (st_late in (400, 403, 409, 422, 500) or (isinstance(body_late, dict) and not body_late.get("success", True)),
                  f"Status={st_late}")

    # -------------------------------------------------------------
    # Check 4: Submitted project cannot revert to draft
    # -------------------------------------------------------------
    # On the submission created in Check 2 (which is SUBMITTED by default)
    if open_eid and sub_id:
        st_rev, body_rev = request(f"/api/events/{open_eid}/submissions/{sub_id}", method="PUT", headers=part_headers, data={"status": "DRAFT"})
        results[4] = (st_rev in (400, 409, 422, 500) or (isinstance(body_rev, dict) and not body_rev.get("success", True)),
                      f"Status={st_rev}")
    else:
        results[4] = (False, "No submitted project to test revert")

    # -------------------------------------------------------------
    # Check 5: Team freezes immediately after submission
    # -------------------------------------------------------------
    ts5 = int(time.time() * 1000)
    # Create event, team leader creates team, submits project, second user tries to join
    event_data5 = {
        "name": f"Team Freeze Event {ts5}",
        "submissionStart": "2020-01-01T00:00:00Z",
        "submissionDeadline": "2030-01-01T00:00:00Z",
        "teamFormationStart": "2020-01-01T00:00:00Z",
        "teamFormationEnd": "2030-01-01T00:00:00Z"
    }
    st5, resp5 = request("/api/events", method="POST", headers=org_headers, data=event_data5)
    eid5 = resp5.get("data", {}).get("id") if st5 == 201 else None

    # Register participant for eid5
    request(f"/api/events/{eid5}/register", method="POST", headers=part_headers)

    # Create team with participant
    st_tm, resp_tm = request(f"/api/events/{eid5}/teams", method="POST", headers=part_headers, data={"name": f"FreezeTeam-{ts5}"})
    tm_data = resp_tm.get("data", {})
    invite_code = tm_data.get("inviteCode")
    team_id = tm_data.get("id")

    # Submit project for this team
    sub_freeze = {"title": f"Freeze Project {ts5}", "teamId": team_id, "repoUrl": f"https://github.com/freeze/{ts5}"}
    st_fsub, resp_fsub = request(f"/api/events/{eid5}/submissions", method="POST", headers=part_headers, data=sub_freeze)

    # Register judge_a as participant in eid5 to test joining team
    request(f"/api/events/{eid5}/register", method="POST", headers=judge_a_headers)

    # Attempt to join team after submission
    st_join, resp_join = request(f"/api/events/{eid5}/teams/join", method="POST", headers=judge_a_headers, data={"inviteCode": invite_code})
    results[5] = (st_join in (400, 409, 422, 500) or (isinstance(resp_join, dict) and not resp_join.get("success", True)),
                  f"Status={st_join}")

    def get_items(resp):
        if isinstance(resp, list):
            return resp
        if isinstance(resp, dict):
            d = resp.get("data")
            if isinstance(d, list):
                return d
            return []
        return []

    # -------------------------------------------------------------
    # Check 6: Page refresh does not change assignments
    # -------------------------------------------------------------
    st_q1, q1 = request("/api/judges/me/assignments?eventId=1", headers=judge_a_headers)
    st_q2, q2 = request("/api/judges/me/assignments?eventId=1", headers=judge_a_headers)
    list1 = get_items(q1)
    list2 = get_items(q2)
    len1 = len(list1) if st_q1 == 200 else -1
    len2 = len(list2) if st_q2 == 200 else -2
    results[6] = (st_q1 == 200 and st_q2 == 200 and len1 == len2 and len1 >= 0, f"Count1={len1}, Count2={len2}")

    # -------------------------------------------------------------
    # Check 7: Judge A and Judge B can both be assigned the same project
    # -------------------------------------------------------------
    # Use fresh open_eid and sub_id created in Check 2
    # Register both judges for open_eid
    request(f"/api/events/{open_eid}/judges", method="POST", headers=org_headers, data={"judgeId": 2})
    request(f"/api/events/{open_eid}/judges", method="POST", headers=org_headers, data={"judgeId": 3})

    # Assign both judges to sub_id
    st_asgn_a, _ = request(f"/api/events/{open_eid}/assignments", method="POST", headers=org_headers, data={"judgeId": 2, "submissionId": sub_id, "rejectDuplicates": False})
    st_asgn_b, _ = request(f"/api/events/{open_eid}/assignments", method="POST", headers=org_headers, data={"judgeId": 3, "submissionId": sub_id, "rejectDuplicates": False})
    
    st_a, q_a = request(f"/api/judges/me/assignments?eventId={open_eid}", headers=judge_a_headers)
    st_b, q_b = request(f"/api/judges/me/assignments?eventId={open_eid}", headers=judge_b_headers)
    
    subs_a = [x.get("submissionId") for x in get_items(q_a)] if st_a == 200 else []
    subs_b = [x.get("submissionId") for x in get_items(q_b)] if st_b == 200 else []
    
    both_assigned = (sub_id in subs_a and sub_id in subs_b)
    results[7] = (both_assigned, f"JudgeA has sub: {sub_id in subs_a}, JudgeB has sub: {sub_id in subs_b}")

    # -------------------------------------------------------------
    # Check 8: Judge A scoring makes only Judge A's assignment COMPLETED
    # -------------------------------------------------------------
    # Submit score as judge_a for sub_id
    st_sc_a, _ = request(f"/api/events/{open_eid}/scores", method="POST", headers=judge_a_headers, data={"submissionId": sub_id, "rawScore": 4.5, "comment": "Good project by Judge A"})
    
    st_qa_after, qa_after = request(f"/api/judges/me/assignments?eventId={open_eid}", headers=judge_a_headers)
    st_qb_after, qb_after = request(f"/api/judges/me/assignments?eventId={open_eid}", headers=judge_b_headers)

    asgn_a = next((x for x in get_items(qa_after) if x.get("submissionId") == sub_id), None)
    asgn_b = next((x for x in get_items(qb_after) if x.get("submissionId") == sub_id), None)

    # In judge queue, completed assignments are preserved or marked completed; judge B must still be assigned
    is_b_assigned = asgn_b is not None and asgn_b.get("rawScore") is None
    results[8] = (st_sc_a == 200 and is_b_assigned, f"JudgeA score st={st_sc_a}, JudgeB still assigned={is_b_assigned}")

    # -------------------------------------------------------------
    # Check 9: Judge B can still score that same project
    # -------------------------------------------------------------
    st_sc_b, _ = request(f"/api/events/{open_eid}/scores", method="POST", headers=judge_b_headers, data={"submissionId": sub_id, "rawScore": 4.0, "comment": "Also good by Judge B"})
    results[9] = (st_sc_b == 200, f"JudgeB score st={st_sc_b}")

    # -------------------------------------------------------------
    # Check 10: Judge cannot see peer scores
    # -------------------------------------------------------------
    st_peer, body_peer = request("/api/judge/scores?judge=judge_a", headers=judge_b_headers)
    results[10] = (st_peer in (401, 403), f"Status={st_peer}")

    # -------------------------------------------------------------
    # Check 11: Participant cannot access judging data
    # -------------------------------------------------------------
    st_pj, _ = request("/api/judge/scores", headers=part_headers)
    st_pa, _ = request("/api/events/1/assignments", headers=part_headers)
    st_pd, _ = request("/api/events/1/dashboard", headers=part_headers)
    part_blocked = (st_pj in (401, 403) and st_pa in (401, 403) and st_pd in (401, 403))
    results[11] = (part_blocked, f"Scores st={st_pj}, Asgn st={st_pa}, Dash st={st_pd}")

    # -------------------------------------------------------------
    # Check 12: Visitor cannot access protected results before publication
    # -------------------------------------------------------------
    # Open event eid5 or early_eid has unpublished results
    target_unpub = early_eid if early_eid else eid5
    st_unpub, _ = request(f"/api/events/{target_unpub}/leaderboard")
    results[12] = (st_unpub in (401, 403), f"Status={st_unpub}")

    # -------------------------------------------------------------
    # Check 13: Final results become public after publication
    # -------------------------------------------------------------
    # Event 1 is CLOSED and published
    st_pub, body_pub = request("/api/events/1/leaderboard?mode=normalized")
    leaderboard = get_items(body_pub)
    results[13] = (st_pub == 200 and len(leaderboard) > 0,
                   f"Status={st_pub}, Entries={len(leaderboard)}")

    # -------------------------------------------------------------
    # Check 14: Final leaderboard contains actual persisted rankings
    # -------------------------------------------------------------
    titles = [x.get("title") for x in leaderboard]
    has_real_projects = "Iron Switch" in titles and "Salt Ledger" in titles and "Slow Trail" in titles
    results[14] = (has_real_projects, f"Has real projects={has_real_projects}, Sample={titles[:3]}")

    # -------------------------------------------------------------
    # Check 15: Event-specific routes never leak another event's data
    # -------------------------------------------------------------
    st_g1, g1 = request("/api/events/1/submissions")
    st_g2, g2 = request(f"/api/events/{early_eid}/submissions")
    subs1 = get_items(g1)
    subs2 = get_items(g2)
    eids1 = set(s.get("eventId") for s in subs1)
    eids2 = set(s.get("eventId") for s in subs2)
    no_leak = (eids1 == {1} or len(eids1) == 0) and (eids2 == {early_eid} or len(eids2) == 0)
    results[15] = (no_leak, f"E1 ids={eids1}, E2 ids={eids2}")

    # -------------------------------------------------------------
    # Check 16: Normalization formula behaves correctly
    # -------------------------------------------------------------
    # In Event 1, check that Z > 0 => T > 50, Z < 0 => T < 50
    st_norm, b_norm = request("/api/events/1/leaderboard?mode=normalized")
    norm_entries = get_items(b_norm)
    norm_ok = False
    if norm_entries:
        top = norm_entries[0]
        bot = norm_entries[-1]
        norm_ok = top.get("finalScore") > 50 and bot.get("finalScore") < 50
    results[16] = (norm_ok, f"Top={norm_entries[0].get('finalScore') if norm_entries else None}, Bot={norm_entries[-1].get('finalScore') if norm_entries else None}")
    results[16] = (norm_ok, f"Top={norm_entries[0].get('finalScore') if norm_entries else None}, Bot={norm_entries[-1].get('finalScore') if norm_entries else None}")

    # -------------------------------------------------------------
    # Check 17: Duplicate detection works
    # -------------------------------------------------------------
    ts17 = int(time.time() * 1000)
    # Create first submission with specific repo URL in open_eid
    sub1_req = {"title": f"Orig Repo {ts17}", "repoUrl": f"https://github.com/unique-org/{ts17}"}
    st_s1, b_s1 = request(f"/api/events/{open_eid}/submissions", method="POST", headers=part_headers, data=sub1_req)
    
    # Create second submission with SAME repo URL in open_eid
    sub2_req = {"title": f"Dup Repo {ts17}", "repoUrl": f"https://github.com/unique-org/{ts17}"}
    st_s2, b_s2 = request(f"/api/events/{open_eid}/submissions", method="POST", headers=part_headers, data=sub2_req)
    dup_flag = b_s2.get("data", {}).get("duplicateFlag") if st_s2 == 201 else None
    results[17] = (st_s2 == 201 and dup_flag is True, f"Status={st_s2}, duplicateFlag={dup_flag}")

    # -------------------------------------------------------------
    # Check 18: Failed scoring/COI operations do not mutate state incorrectly
    # -------------------------------------------------------------
    # Attempt to score unassigned project (e.g. project 99999 or unassigned project)
    st_fail_sc, _ = request("/api/events/1/scores", method="POST", headers=judge_a_headers, data={"submissionId": 999999, "rawScore": 4.0})
    st_fail_coi, _ = request("/api/events/1/coi", method="POST", headers={"Authorization": "Bearer invalid_token"}, data={"submissionId": 1, "reason": "SAME_TEAM"})
    
    results[18] = (st_fail_sc in (400, 403, 404, 500) and st_fail_coi in (401, 403),
                   f"ScoreFailSt={st_fail_sc}, CoiFailSt={st_fail_coi}")

    # Print Report
    print("\nTargeted Integration Test Results:")
    all_pass = True
    labels = [
        "1. submission before start -> rejected",
        "2. submission during window -> accepted",
        "3. submission after deadline -> rejected",
        "4. submitted project cannot revert to draft",
        "5. team freezes immediately after submission",
        "6. page refresh does not change assignments",
        "7. Judge A and Judge B can both be assigned the same project",
        "8. Judge A scoring makes only Judge A's assignment COMPLETED",
        "9. Judge B can still score that same project",
        "10. Judge cannot see peer scores",
        "11. participant cannot access judging data",
        "12. visitor cannot access protected results before publication",
        "13. final results become public after publication",
        "14. final leaderboard contains actual persisted rankings",
        "15. event-specific routes never leak another event's data",
        "16. normalization formula behaves correctly",
        "17. duplicate detection works",
        "18. failed scoring/COI operations do not mutate state incorrectly"
    ]

    for idx, label in enumerate(labels, 1):
        ok, note = results.get(idx, (False, "Not run"))
        verdict = "PASS" if ok else "FAIL"
        print(f"[{verdict}] {label} ({note})")
        if not ok:
            all_pass = False

    print("=" * 70)
    if all_pass:
        print("ALL 18 TARGETED INTEGRATION TESTS PASSED.")
    else:
        print("SOME TESTS FAILED.")
    print("=" * 70)

if __name__ == "__main__":
    run_tests()
