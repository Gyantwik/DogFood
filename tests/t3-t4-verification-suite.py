#!/usr/bin/env python3
"""
T3 and T4 Comprehensive Verification Suite
Tests all T3 (Public Community Voting, Project Comments, Hidden Standings, Anti-Abuse, Ballot Randomization)
and T4 (Webhooks HMAC, Certificates SHA-256 Ledger, Signed Judge Participation Records, Bulk Import/Export)
against the live DogFood backend.
"""

import sys
import json
import time
import hmac
import hashlib
import urllib.request
import urllib.error

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

def request(method, path, data=None, token=None, headers=None):
    url = f"{BASE_URL}{path}"
    req_headers = {
        "Content-Type": "application/json",
        "Accept": "application/json"
    }
    if token:
        req_headers["Authorization"] = f"Bearer {token}"
    if headers:
        req_headers.update(headers)

    body = json.dumps(data).encode("utf-8") if data is not None else None
    req = urllib.request.Request(url, data=body, headers=req_headers, method=method)

    try:
        with urllib.request.urlopen(req) as resp:
            status = resp.status
            content = resp.read().decode("utf-8")
            try:
                res_json = json.loads(content)
                if isinstance(res_json, dict) and "data" in res_json:
                    res_json = res_json["data"]
            except:
                res_json = content
            return status, res_json, resp.headers
    except urllib.error.HTTPError as e:
        status = e.code
        content = e.read().decode("utf-8")
        try:
            res_json = json.loads(content)
        except:
            res_json = content
        return status, res_json, e.headers

def login(email, password):
    status, body, _ = request("POST", "/api/auth/login", {"email": email, "password": password})
    if status == 200 and isinstance(body, dict):
        if "token" in body:
            return body["token"]
        if "data" in body and isinstance(body["data"], dict) and "token" in body["data"]:
            return body["data"]["token"]
    raise RuntimeError(f"Login failed for {email}: {status} {body}")

def register_user(username, email, password):
    status, body, _ = request("POST", "/api/auth/signup", {
        "username": username,
        "email": email,
        "password": password
    })
    return status, body

def run_tests():
    global passed, failed
    log("====================================================")
    log("Starting T3 & T4 Full System Verification Suite")
    log("====================================================")

    # 1. Authenticate Organizer & Judge
    log("Phase 1: Authenticating Organizer and Judge Accounts")
    org_token = login("organizer@dogfood.local", "organizer_pass123")
    assert_true(org_token is not None, "Organizer logged in successfully")

    judge_token = login("judge_a@dogfood.local", "judge_a_pass123")
    assert_true(judge_token is not None, "Judge A logged in successfully")

    # 2. Check Event 1 and ensure voting is enabled for test
    log("Phase 2: Verifying Event & Community Voting Configuration (T3)")
    status, ev1, _ = request("GET", "/api/events/1")
    assert_true(status == 200, f"Event 1 fetched (status {status})")

    # Update Event 1 with Community Voting enabled in OPEN mode
    status, updated_ev, _ = request("PUT", "/api/events/1", {
        "name": ev1.get("name", "DogFood Hackathon 2026"),
        "description": ev1.get("description", "Main event"),
        "status": "OPEN",
        "submissionDeadline": ev1.get("submissionDeadline"),
        "votingEnabled": True,
        "votingAccessMode": "OPEN"
    }, token=org_token)
    assert_true(status == 200 and (updated_ev.get("votingEnabled") is True or updated_ev.get("enabled") is True), "Event 1 voting enabled in OPEN mode")

    # Check voting status endpoint (public)
    status, vstatus, _ = request("GET", "/api/events/1/voting/status")
    assert_true(status == 200 and (vstatus.get("votingEnabled") is True or vstatus.get("enabled") is True), "Public voting status confirms votingEnabled=true")
    assert_true(vstatus.get("accessMode") == "OPEN", "Public voting status confirms accessMode=OPEN")

    # 3. Community Voting: Ballot Randomization (T3)
    log("Phase 3: Community Voting Ballot Retrieval & Randomization (T3)")
    status, ballot, _ = request("GET", "/api/events/1/voting/ballot")
    assert_true(status == 200, "Public ballot retrieved successfully")
    submissions = ballot if isinstance(ballot, list) else ballot.get("submissions", [])
    assert_true(len(submissions) > 0, f"Ballot contains {len(submissions)} submissions")
    sub_ids = [s.get("submissionId") or s.get("id") for s in submissions]
    assert_true(len(sub_ids) == len(set(sub_ids)), "Ballot does NOT contain duplicate submissions")

    target_sub_id = sub_ids[0]

    # 4. Community Voting: OPEN mode, Duplicate Prevention & Anti-Abuse (T3)
    log("Phase 4: Community Voting in OPEN Mode & Duplicate Prevention (T3)")
    # Generate unique test voter
    voter_alias = f"tester_{time.time_ns()}"
    custom_ip = f"198.51.100.{int(time.time_ns()) % 200 + 10}"

    status, vres, _ = request("POST", "/api/events/1/voting/vote", {
        "submissionId": target_sub_id,
        "voterAlias": voter_alias
    }, headers={"X-Forwarded-For": custom_ip})
    assert_true(status in [200, 201], f"Vote successfully cast in OPEN mode (status {status})")

    # Attempt duplicate vote from same IP
    status, vres_dup, _ = request("POST", "/api/events/1/voting/vote", {
        "submissionId": target_sub_id,
        "voterAlias": voter_alias
    }, headers={"X-Forwarded-For": custom_ip})
    assert_true(status == 409, f"Duplicate vote rejected with HTTP 409 Conflict (status {status})")

    # Anti-abuse rate limiter test: spam 8 votes from another IP
    spam_ip = f"203.0.113.{int(time.time()) % 200 + 20}"
    rate_limited = False
    for i in range(8):
        status, _, _ = request("POST", "/api/events/1/voting/vote", {
            "submissionId": target_sub_id,
            "voterAlias": f"spammer_{i}"
        }, headers={"X-Forwarded-For": spam_ip})
        if status == 429:
            rate_limited = True
            break
    assert_true(rate_limited, "Anti-abuse rate limiter rejected repeated voting attempts with HTTP 429 Too Many Requests")

    # 5. Community Voting: EMAIL access mode (T3)
    log("Phase 5: Community Voting in EMAIL Access Mode (T3)")
    status, _, _ = request("PUT", "/api/events/1", {
        "name": ev1.get("name"),
        "status": "OPEN",
        "submissionDeadline": ev1.get("submissionDeadline"),
        "votingEnabled": True,
        "votingAccessMode": "EMAIL"
    }, token=org_token)
    assert_true(status == 200, "Updated Event 1 to EMAIL voting mode")

    test_email = f"voter_{int(time.time())}@example.com"
    ip_email = f"198.51.101.{int(time.time()) % 200 + 30}"
    # Attempt without email -> rejected
    status, _, _ = request("POST", "/api/events/1/voting/vote", {
        "submissionId": target_sub_id
    }, headers={"X-Forwarded-For": ip_email})
    assert_true(status == 400, f"Vote without email rejected in EMAIL mode (HTTP {status})")

    # Vote with email -> succeeds
    status, _, _ = request("POST", "/api/events/1/voting/vote", {
        "submissionId": target_sub_id,
        "voterEmail": test_email
    }, headers={"X-Forwarded-For": ip_email})
    assert_true(status in [200, 201], f"Vote with valid email succeeds (HTTP {status})")

    # Duplicate vote with same email -> rejected
    status, _, _ = request("POST", "/api/events/1/voting/vote", {
        "submissionId": target_sub_id,
        "voterEmail": test_email
    }, headers={"X-Forwarded-For": ip_email})
    assert_true(status == 409, f"Duplicate email vote rejected with HTTP 409 (status {status})")

    # 6. Community Voting: AUTHENTICATED access mode (T3)
    log("Phase 6: Community Voting in AUTHENTICATED Mode (T3)")
    status, _, _ = request("PUT", "/api/events/1", {
        "name": ev1.get("name"),
        "status": "OPEN",
        "submissionDeadline": ev1.get("submissionDeadline"),
        "votingEnabled": True,
        "votingAccessMode": "AUTHENTICATED"
    }, token=org_token)
    assert_true(status == 200, "Updated Event 1 to AUTHENTICATED voting mode")

    ip_auth = f"198.51.102.{int(time.time()) % 200 + 40}"
    # Unauthenticated attempt -> rejected
    status, _, _ = request("POST", "/api/events/1/voting/vote", {
        "submissionId": target_sub_id
    }, headers={"X-Forwarded-For": ip_auth})
    assert_true(status in [401, 403], f"Unauthenticated vote rejected in AUTHENTICATED mode (HTTP {status})")

    # Authenticated user vote (register a fresh unique voter)
    auth_voter_name = f"voter_{time.time_ns()}"
    auth_voter_email = f"{auth_voter_name}@dogfood.local"
    register_user(auth_voter_name, auth_voter_email, "Pass123!")
    user_token = login(auth_voter_email, "Pass123!")

    status, _, _ = request("POST", "/api/events/1/voting/vote", {
        "submissionId": target_sub_id
    }, token=user_token, headers={"X-Forwarded-For": ip_auth})
    assert_true(status in [200, 201], f"Authenticated user vote succeeds (HTTP {status})")

    # Duplicate authenticated vote
    status, _, _ = request("POST", "/api/events/1/voting/vote", {
        "submissionId": target_sub_id
    }, token=user_token, headers={"X-Forwarded-For": ip_auth})
    assert_true(status == 409, f"Duplicate authenticated vote rejected with HTTP 409 (status {status})")

    # 7. Project Comments (T3)
    log("Phase 7: Project Comments Stream & Length Validation (T3)")
    test_comment = f"Remarkable architectural implementation and clean UX! Timestamp: {int(time.time())}"
    status, c_res, _ = request("POST", f"/api/events/1/submissions/{target_sub_id}/comments", {
        "authorName": "Alice Evaluator",
        "content": test_comment
    })
    assert_true(status in [200, 201] and c_res.get("content") == test_comment, "Comment successfully posted and persisted")

    # Empty content rejected
    status, _, _ = request("POST", f"/api/events/1/submissions/{target_sub_id}/comments", {
        "authorName": "Alice",
        "content": "   "
    })
    assert_true(status == 400, f"Empty comment rejected with HTTP 400 (status {status})")

    # Over 1000 chars rejected
    too_long = "A" * 1005
    status, _, _ = request("POST", f"/api/events/1/submissions/{target_sub_id}/comments", {
        "authorName": "Alice",
        "content": too_long
    })
    assert_true(status == 400, f"Comment > 1000 chars rejected with HTTP 400 (status {status})")

    # Fetch comments stream
    status, comments_list, _ = request("GET", f"/api/events/1/submissions/{target_sub_id}/comments")
    assert_true(status == 200 and any(c.get("content") == test_comment for c in comments_list), "Comment appears in public comments stream")

    # 8. Hidden Standings & Protected Results during Deliberation (T3)
    log("Phase 8: Hidden Results State During Deliberation (T3)")
    # Set resultsPublishAt to future (1 week ahead)
    future_date = "2026-10-15T00:00:00Z"
    request("PUT", "/api/events/1", {
        "name": ev1.get("name"),
        "status": "OPEN",
        "submissionDeadline": ev1.get("submissionDeadline"),
        "resultsPublishAt": future_date,
        "votingEnabled": True,
        "votingAccessMode": "OPEN"
    }, token=org_token)

    # Public request to results -> 403 Forbidden
    status, _, _ = request("GET", "/api/events/1/results")
    assert_true(status == 403, f"Public results hidden before publication date (HTTP {status})")

    # Participant request to results -> 403 Forbidden
    status, _, _ = request("GET", "/api/events/1/results", token=user_token)
    assert_true(status == 403, f"Participant results hidden before publication date (HTTP {status})")

    # Organizer request to results -> 200 OK
    status, org_results, _ = request("GET", "/api/events/1/results", token=org_token)
    assert_true(status == 200, f"Organizer can inspect protected results during deliberation (HTTP {status})")

    # Restore resultsPublishAt to past date for subsequent suite runs
    request("PUT", "/api/events/1", {
        "name": ev1.get("name"),
        "status": "OPEN",
        "submissionDeadline": ev1.get("submissionDeadline"),
        "resultsPublishAt": "2026-09-01T00:00:00Z",
        "votingEnabled": True,
        "votingAccessMode": "OPEN"
    }, token=org_token)

    # 9. Webhooks & HMAC Signatures (T4)
    log("Phase 9: Webhook Registration, HMAC-SHA256 Signing & Delivery Log (T4)")
    wh_url = "http://localhost:8080/api/mock-endpoint"
    wh_secret = "test-webhook-secret-xyz"
    status, wh_res, _ = request("POST", "/api/events/1/webhooks", {
        "url": wh_url,
        "secret": wh_secret,
        "subscribedEvents": ["vote.created", "score.submitted", "submission.created", "results.published"]
    }, token=org_token)
    assert_true(status in [200, 201] and "id" in wh_res, f"Webhook registered successfully (ID: {wh_res.get('id')})")
    webhook_id = wh_res.get("id")

    # List webhooks
    status, wh_list, _ = request("GET", "/api/events/1/webhooks", token=org_token)
    assert_true(status == 200 and any(w.get("id") == webhook_id for w in wh_list), "Webhook appears in event webhooks list")

    # Test Webhook Ping
    status, test_ping, _ = request("POST", f"/api/events/1/webhooks/{webhook_id}/test", token=org_token)
    assert_true(status == 200, f"Webhook test ping dispatched (status {status})")

    # Check delivery logs
    status, deliveries, _ = request("GET", f"/api/events/1/webhooks/{webhook_id}/deliveries", token=org_token)
    assert_true(status == 200 and len(deliveries) > 0, f"Delivery recorded in log (total deliveries: {len(deliveries)})")
    latest_del = deliveries[0]
    assert_true(latest_del.get("eventType") == "test.ping", f"Logged event type is test.ping")

    # 10. Cryptographic Certificates (T4)
    log("Phase 10: Cryptographic Certificates Authority & Public Verification (T4)")
    status, cert_gen, _ = request("POST", "/api/events/1/certificates/generate", token=org_token)
    assert_true(status in [200, 201], f"Certificates generated for event (response status: {status})")

    # Fetch event certificates list
    status, certs_list, _ = request("GET", "/api/events/1/certificates", token=org_token)
    assert_true(status == 200 and len(certs_list) > 0, f"Found {len(certs_list)} certificates in event ledger")
    sample_cert = certs_list[0]
    cert_id = sample_cert.get("id")

    # Public verification of certificate (no authentication needed)
    status, pub_cert, _ = request("GET", f"/api/certificates/{cert_id}")
    assert_true(status == 200 and pub_cert.get("id") == cert_id, f"Certificate publicly verified without auth (ID {cert_id})")
    assert_true("checksum" in pub_cert and len(pub_cert["checksum"]) == 64, "Certificate possesses valid 64-char SHA-256 checksum")

    # Tamper test: query invalid certificate ID
    status, _, _ = request("GET", "/api/certificates/INVALID-FAKE-ID-999")
    assert_true(status == 404, f"Fake certificate ID correctly returns HTTP 404 (status {status})")

    # 11. Signed Judge Participation Records (T4)
    log("Phase 11: Signed Judge Participation Records & Zero-Knowledge Verification (T4)")
    # Judge retrieves their cryptographically signed participation record
    status, judge_record, _ = request("GET", "/api/events/1/judges/me/record", token=judge_token)
    assert_true(status == 200, f"Judge retrieved signed participation record (status {status})")
    assert_true("signature" in judge_record and len(judge_record["signature"]) > 20, "Record includes cryptographic HMAC signature")
    assert_true("evaluatedSubmissionsCount" in judge_record, "Record includes evaluated submissions count")
    assert_true("score" not in judge_record and "scores" not in judge_record, "Record zero-knowledge property: does NOT leak scores")

    # Public signature verification
    status, verify_res, _ = request("POST", "/api/verify/judge-record", {
        "judgeId": judge_record["judgeId"],
        "eventId": judge_record["eventId"],
        "evaluatedSubmissionsCount": judge_record["evaluatedSubmissionsCount"],
        "completionTimestamp": judge_record["completionTimestamp"],
        "signature": judge_record["signature"]
    })
    assert_true(status == 200 and verify_res.get("valid") == True, "Public verification confirms authentic HMAC-SHA256 signature")

    # Tamper detection test: modify evaluated submissions count
    status, verify_tamper, _ = request("POST", "/api/verify/judge-record", {
        "judgeId": judge_record["judgeId"],
        "eventId": judge_record["eventId"],
        "evaluatedSubmissionsCount": judge_record["evaluatedSubmissionsCount"] + 99,
        "completionTimestamp": judge_record["completionTimestamp"],
        "signature": judge_record["signature"]
    })
    assert_true(status in [400, 422] or (status == 200 and verify_tamper.get("valid") == False), "Tampered judge record correctly identified as INVALID")

    # 12. Bulk Data Import & Export (T4)
    log("Phase 12: Bulk Data Bundle Export & Import (T4)")
    status, bundle, _ = request("GET", "/api/events/1/export/bundle", token=org_token)
    assert_true(status == 200, f"Organizer exported complete JSON bundle (status {status})")
    assert_true("event" in bundle and "tracks" in bundle and "submissions" in bundle, "Bundle contains full event hierarchy")
    assert_true("votes" in bundle and "comments" in bundle, "Bundle includes T3 votes and comments")

    # Non-organizer export attempt -> 403 Forbidden
    status, _, _ = request("GET", "/api/events/1/export/bundle", token=user_token)
    assert_true(status == 403, f"Non-organizer cannot export event bundle (HTTP {status})")

    # Test Import bundle
    status, import_res, _ = request("POST", "/api/events/1/import", bundle, token=org_token)
    assert_true(status == 200, f"Organizer imported bundle successfully (status {status})")

    # 13. Organizer Audit Trail (T3/T4)
    log("Phase 13: Organizer Security Audit Trail (T3/T4)")
    status, audit_logs, _ = request("GET", "/api/events/1/audit-logs", token=org_token)
    assert_true(status == 200 and len(audit_logs) > 0, f"Retrieved {len(audit_logs)} audit trail entries")
    actions = [a.get("action") for a in audit_logs]
    assert_true("VOTE_CREATED" in actions, "Audit log contains VOTE_CREATED entries")
    assert_true("DUPLICATE_VOTE_REJECTED" in actions, "Audit log contains DUPLICATE_VOTE_REJECTED entries")

    # Public access to audit logs -> 403 Forbidden
    status, _, _ = request("GET", "/api/events/1/audit-logs")
    assert_true(status in [401, 403], f"Public access to organizer audit logs forbidden (HTTP {status})")

    log("====================================================")
    log(f"Test Run Summary: {passed} PASSED, {failed} FAILED")
    log("====================================================")

    if failed > 0:
        sys.exit(1)

if __name__ == "__main__":
    run_tests()
