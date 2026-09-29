import urllib.request
import urllib.error
import json
import sys

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')

BASE_URL = "http://localhost:8080"

def log(msg, status="INFO"):
    print(f"[{status}] {msg}")

def assert_true(cond, msg):
    if not cond:
        log(f"FAILED: {msg}", "FAIL")
        sys.exit(1)
    log(f"PASS: {msg}", "OK")

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
            return res.status, parsed
    except urllib.error.HTTPError as e:
        err_body = e.read().decode("utf-8")
        try:
            parsed = json.loads(err_body) if err_body else {}
        except Exception:
            parsed = err_body
        return e.code, parsed
    except Exception as e:
        return 500, str(e)

def login(email, password):
    status, res = api_call("/api/auth/login", method="POST", data={"email": email, "password": password})
    if status == 200 and isinstance(res, dict):
        if "token" in res:
            return res["token"]
        if "data" in res and isinstance(res["data"], dict) and "token" in res["data"]:
            return res["data"]["token"]
    return None

def main():
    log("=========================================================")
    log("STARTING T1 & T2 HARDENING & INTEGRITY VERIFICATION SUITE")
    log("=========================================================")

    # 1. Login organizer and judge
    org_token = login("organizer@dogfood.local", "organizer_pass123")
    assert_true(org_token is not None, "Organizer logged in successfully")

    judge_token = login("judge_a@dogfood.local", "judge_a_pass123")
    assert_true(judge_token is not None, "Judge A logged in successfully")

    event_id = 1

    # 2. Test Submission Readiness Endpoints (T1)
    status, readiness = api_call(f"/api/events/{event_id}/submissions/readiness", token=org_token)
    assert_true(status == 200, "Event submission readiness check returns HTTP 200")
    assert_true("ready" in readiness and "windowStatus" in readiness, "Readiness response contains contract fields")
    log(f"Readiness summary: ready={readiness.get('ready')}, windowStatus={readiness.get('windowStatus')}")

    # 3. Test Judge Coverage Endpoint (T2)
    status, coverage = api_call(f"/api/events/{event_id}/judging/coverage", token=org_token)
    assert_true(status == 200, "Organizer can retrieve judge coverage (HTTP 200)")
    assert_true(isinstance(coverage, dict) and "projectCoverages" in coverage, "Coverage response contains projectCoverages")
    cov_items = coverage.get("projectCoverages", [])
    log(f"Retrieved {len(cov_items)} coverage records (total projects: {coverage.get('totalProjects')})")
    if len(cov_items) > 0:
        first = cov_items[0]
        assert_true("submissionId" in first and "targetCount" in first and "status" in first,
                    "Coverage items contain targetCount, status, and submission ID")

    # 4. Test Judge Workload Endpoint (T2)
    status, workload = api_call(f"/api/events/{event_id}/judging/workload", token=org_token)
    assert_true(status == 200, "Organizer can retrieve judge workload (HTTP 200)")
    assert_true(isinstance(workload, dict) and "judges" in workload, "Workload response contains judges list")
    wl_items = workload.get("judges", [])
    log(f"Retrieved {len(wl_items)} judge workload records")
    if len(wl_items) > 0:
        first = wl_items[0]
        assert_true("judgeId" in first and "assignedCount" in first and "remainingCount" in first,
                    "Workload items contain judge ID, assigned, and remaining")

    # 5. Test Scoring Health Endpoint (T2)
    status, health = api_call(f"/api/events/{event_id}/judging/scoring-health", token=org_token)
    assert_true(status == 200, "Organizer can retrieve scoring health (HTTP 200)")
    assert_true("totalProjects" in health and "completedReviews" in health and "judgeStats" in health,
                "Scoring health contains totalProjects, completedReviews, and judgeStats")
    log(f"Scoring health: totalProjects={health.get('totalProjects')}, completedReviews={health.get('completedReviews')}, judges={len(health.get('judgeStats', []))}")

    # 6. Test Normalization Analysis Endpoint (T2)
    status, norm = api_call(f"/api/events/{event_id}/judging/normalization-analysis", token=org_token)
    assert_true(status == 200, "Organizer can retrieve normalization analysis (HTTP 200)")
    assert_true("formulaExplanation" in norm and "neutralFallback" in norm and "projects" in norm,
                "Normalization analysis contains formulaExplanation, neutralFallback, and projects list")
    assert_true("50 + 10" in norm.get("formulaExplanation", ""), "Formula explicitly states T = 50 + 10Z")
    log(f"Normalization formula: '{norm.get('formulaExplanation')}', neutral fallback: '{norm.get('neutralFallback')}'")

    # 7. Test Normalization Proof Endpoint (T2)
    status, proof = api_call(f"/api/events/{event_id}/judging/normalization-proof", token=org_token)
    assert_true(status == 200, "Organizer can retrieve normalization proof (HTTP 200)")
    assert_true("formula" in proof and "judgeDistributions" in proof and "projectCalculations" in proof,
                "Proof contains formula, judgeDistributions, and projectCalculations")
    log(f"Proof generated with {len(proof.get('judgeDistributions', []))} judge baselines and {len(proof.get('projectCalculations', []))} project calculations")

    # 8. Test Role Isolation & Peer Score Privacy
    # Judge accounts must NOT be able to access organizer scoring health or normalization analysis
    status, _ = api_call(f"/api/events/{event_id}/judging/scoring-health", token=judge_token)
    assert_true(status in [401, 403], "Judge cannot access organizer scoring-health endpoint (HTTP 403/401)")

    status, _ = api_call(f"/api/events/{event_id}/judging/normalization-analysis", token=judge_token)
    assert_true(status in [401, 403], "Judge cannot access organizer normalization-analysis endpoint (HTTP 403/401)")

    status, _ = api_call(f"/api/events/{event_id}/judging/normalization-proof", token=judge_token)
    assert_true(status in [401, 403], "Judge cannot access organizer normalization-proof endpoint (HTTP 403/401)")

    # Public/Unauthenticated access strictly rejected
    status, _ = api_call(f"/api/events/{event_id}/judging/coverage")
    assert_true(status in [401, 403], "Unauthenticated visitor cannot access judge coverage (HTTP 401/403)")

    status, _ = api_call(f"/api/events/{event_id}/judging/workload")
    assert_true(status in [401, 403], "Unauthenticated visitor cannot access judge workload (HTTP 401/403)")

    log("=========================================================")
    log("ALL T1 & T2 INTEGRITY TESTS PASSED END-TO-END!")
    log("=========================================================")

if __name__ == "__main__":
    main()
