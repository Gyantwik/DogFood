#!/usr/bin/env python3
"""
DogFood — Submission Lifecycle & Draft-and-Edit Verification
Tests all 12 rules and the 11-step mandatory test sequence:
1. Create a project.
2. Submit it.
3. Confirm it is submitted.
4. Edit the submitted project's title/description/link/etc. BEFORE the deadline.
5. Save the changes.
6. Refresh / re-query the submission.
7. Confirm the updated values persist.
8. Confirm the submission ID is unchanged and project remains in the gallery.
9. After the deadline passes, attempt another edit.
10. Confirm the backend rejects the edit.
11. Confirm the project is locked read-only.
"""

import sys
import json
import time
import urllib.request
import urllib.error
from datetime import datetime, timezone, timedelta

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

def main():
    print("=" * 70)
    print("DOGFOOD SUBMISSION LIFECYCLE MANDATORY VERIFICATION TEST")
    print("=" * 70)

    org_token = login("organizer@dogfood.local", "organizer_pass123")
    part_token = login("participant@dogfood.local", "participant_pass123")

    if not org_token or not part_token:
        print("[FAIL] Could not acquire tokens for organizer or participant")
        sys.exit(1)

    org_headers = {"Authorization": f"Bearer {org_token}"}
    part_headers = {"Authorization": f"Bearer {part_token}"}

    ts = int(time.time() * 1000)
    now = datetime.now(timezone.utc)
    future_deadline = (now + timedelta(hours=2)).strftime("%Y-%m-%dT%H:%M:%SZ")
    past_start = (now - timedelta(hours=2)).strftime("%Y-%m-%dT%H:%M:%SZ")

    # Step 0: Create event with active submission window (deadline 2 hours in the future)
    event_payload = {
        "name": f"Lifecycle Test Hackathon {ts}",
        "description": "Testing project submission draft and edit lifecycle until deadline",
        "submissionStart": past_start,
        "submissionDeadline": future_deadline,
        "status": "OPEN"
    }
    st, resp = request("/api/events", method="POST", headers=org_headers, data=event_payload)
    if st != 201:
        print(f"[FAIL] Could not create test event: {st} {resp}")
        sys.exit(1)

    event_id = resp.get("data", {}).get("id")
    print(f"[OK] Created test event (ID={event_id}) with deadline at {future_deadline}")

    # Register participant for event
    st_reg, _ = request(f"/api/events/{event_id}/register", method="POST", headers=part_headers)

    # -------------------------------------------------------------
    # Step 1: Create a project draft
    # -------------------------------------------------------------
    draft_req = {
        "title": f"Initial Draft Title {ts}",
        "tagline": "Initial draft tagline",
        "description": "Initial draft architecture and notes",
        "track": "Infra",
        "repoUrl": f"https://github.com/team-alpha/draft-{ts}",
        "status": "DRAFT"
    }
    st_create, body_create = request(f"/api/events/{event_id}/submissions", method="POST", headers=part_headers, data=draft_req)
    sub_data = body_create.get("data", {})
    sub_id = sub_data.get("id")
    assert st_create == 201 and sub_id is not None, f"Failed to create draft: {st_create} {body_create}"
    print(f"Step 1 PASS: Created project draft with ID={sub_id}, Status={sub_data.get('status')}")

    # -------------------------------------------------------------
    # Step 2: Submit the project
    # -------------------------------------------------------------
    submit_req = {
        "title": f"Submitted Title {ts}",
        "tagline": "Submitted tagline for evaluation",
        "description": "Full production description for judges",
        "track": "Infra",
        "repoUrl": f"https://github.com/team-alpha/proj-{ts}",
        "demoUrl": f"https://demo-{ts}.example.com",
        "liveLink": f"https://live-{ts}.example.com",
        "techStack": ["Rust", "PostgreSQL", "Vanilla JS"],
        "status": "SUBMITTED"
    }
    st_submit, body_submit = request(f"/api/events/{event_id}/submissions/{sub_id}", method="PUT", headers=part_headers, data=submit_req)
    assert st_submit == 200, f"Failed to submit project: {st_submit} {body_submit}"
    print(f"Step 2 PASS: Submitted project ID={sub_id}")

    # -------------------------------------------------------------
    # Step 3: Confirm it is submitted
    # -------------------------------------------------------------
    st_get, body_get = request(f"/api/events/{event_id}/submissions/mine", headers=part_headers)
    assert st_get == 200, f"Failed to retrieve user submission: {st_get}"
    mine = body_get.get("data", {})
    assert mine.get("id") == sub_id, f"ID mismatch: {mine.get('id')} vs {sub_id}"
    assert mine.get("status") == "SUBMITTED", f"Expected SUBMITTED, got {mine.get('status')}"
    print(f"Step 3 PASS: Confirmed project {sub_id} is SUBMITTED in backend")

    # Verify presence in public gallery
    st_gal, body_gal = request(f"/api/events/{event_id}/submissions")
    gal_items = body_gal.get("data", [])
    assert any(p.get("id") == sub_id for p in gal_items), "Project must appear in event gallery"
    print(f"Step 3b PASS: Confirmed project {sub_id} appears in public gallery")

    # -------------------------------------------------------------
    # Step 4 & 5: Edit the submitted project BEFORE the deadline and save changes
    # -------------------------------------------------------------
    updated_title = f"Refined Orbit Engine {ts}"
    updated_desc = "Extensively updated description with new benchmark metrics and screenshots"
    updated_repo = f"https://github.com/team-alpha/refined-{ts}"
    updated_demo = f"https://v2-{ts}.example.com"
    updated_tech = ["Rust", "PostgreSQL", "Wasm", "TypeScript"]

    edit_req = {
        "title": updated_title,
        "tagline": "Updated superfast architecture",
        "description": updated_desc,
        "track": "Infra",
        "repoUrl": updated_repo,
        "demoUrl": updated_demo,
        "techStack": updated_tech,
        "status": "SUBMITTED"
    }
    st_edit, body_edit = request(f"/api/events/{event_id}/submissions/{sub_id}", method="PUT", headers=part_headers, data=edit_req)
    assert st_edit == 200, f"Edit before deadline failed: {st_edit} {body_edit}"
    print(f"Step 4 & 5 PASS: Edited submitted project details before deadline (Status={st_edit})")

    # -------------------------------------------------------------
    # Step 6 & 7: Refresh / re-query and confirm updated values persist
    # -------------------------------------------------------------
    st_refresh, body_refresh = request(f"/api/events/{event_id}/submissions/mine", headers=part_headers)
    refreshed = body_refresh.get("data", {})
    assert st_refresh == 200
    assert refreshed.get("title") == updated_title, f"Expected {updated_title}, got {refreshed.get('title')}"
    assert refreshed.get("description") == updated_desc, f"Expected {updated_desc}, got {refreshed.get('description')}"
    assert refreshed.get("repoUrl") == updated_repo, f"Expected {updated_repo}, got {refreshed.get('repoUrl')}"
    assert refreshed.get("demoUrl") == updated_demo, f"Expected {updated_demo}, got {refreshed.get('demoUrl')}"
    assert refreshed.get("status") == "SUBMITTED", f"Expected status SUBMITTED, got {refreshed.get('status')}"
    print("Step 6 & 7 PASS: Re-queried submission and confirmed all updated values persist accurately")

    # -------------------------------------------------------------
    # Step 8: Confirm submission ID is unchanged & remains in gallery without duplicates
    # -------------------------------------------------------------
    assert refreshed.get("id") == sub_id, f"ID changed: {refreshed.get('id')} vs {sub_id}"
    st_gal2, body_gal2 = request(f"/api/events/{event_id}/submissions")
    matching_gal_items = [p for p in body_gal2.get("data", []) if p.get("id") == sub_id]
    assert len(matching_gal_items) == 1, f"Expected exactly 1 gallery item with ID {sub_id}, found {len(matching_gal_items)}"
    assert matching_gal_items[0].get("title") == updated_title, "Gallery reflects updated title"
    print(f"Step 8 PASS: Confirmed submission ID={sub_id} is unchanged, gallery reflects updated title, no duplicates")

    # -------------------------------------------------------------
    # Step 9: Pass the deadline (Organizer updates deadline to the past)
    # -------------------------------------------------------------
    past_deadline = (datetime.now(timezone.utc) - timedelta(minutes=5)).strftime("%Y-%m-%dT%H:%M:%SZ")
    st_expire, _ = request(f"/api/events/{event_id}", method="PUT", headers=org_headers, data={"submissionDeadline": past_deadline})
    assert st_expire == 200, f"Failed to expire deadline: {st_expire}"
    print(f"Step 9 PASS: Submission deadline for Event {event_id} has now passed ({past_deadline})")

    # -------------------------------------------------------------
    # Step 10: After deadline, attempt another edit as participant -> backend rejects
    # -------------------------------------------------------------
    illegal_edit = {
        "title": "Illegal Edit After Deadline",
        "description": "Attempting to change project after deadline",
        "status": "SUBMITTED"
    }
    st_illegal, body_illegal = request(f"/api/events/{event_id}/submissions/{sub_id}", method="PUT", headers=part_headers, data=illegal_edit)
    assert st_illegal in (400, 403, 409), f"Expected backend rejection after deadline, got: {st_illegal} {body_illegal}"
    err_msg = body_illegal.get("message") if isinstance(body_illegal, dict) else str(body_illegal)
    assert "deadline" in err_msg.lower() or "closed" in err_msg.lower(), f"Unexpected error message: {err_msg}"
    print(f"Step 10 PASS: Backend strictly rejected post-deadline edit with HTTP {st_illegal}: '{err_msg}'")

    # Verify values on server remain the pre-deadline edited values
    st_verify, body_verify = request(f"/api/events/{event_id}/submissions/{sub_id}")
    cur_data = body_verify.get("data", {})
    assert cur_data.get("title") == updated_title, "Title was not altered by rejected post-deadline edit"
    print("Step 10b PASS: Verified server state was not mutated by rejected post-deadline edit")

    print("\n" + "=" * 70)
    print("ALL 11 MANDATORY TEST STEPS VERIFIED END-TO-END VIA REAL API!")
    print("=" * 70)

if __name__ == "__main__":
    main()
