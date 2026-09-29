# Dogfood — Shared API Contract

This document defines the central API contract for all endpoints across Dogfood. Both frontend and backend reference this specification to ensure zero-drift integration.

---

## 1. Health & System Status (Stage 1 & 2)

| Method | Endpoint | Auth | Request Body | Response (200 OK) | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/health` | None | None | `{"status":"UP","database":"CONNECTED","seeded":true,"roles_loaded":4,"events_count":1}` | System health and boot readiness check |

---

## 2. Authentication & RBAC (Stage 2)

| Method | Endpoint | Auth | Request Body | Response Body | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/signup` | None | `{"username":"string","email":"string","password":"string"}` | `{"token":"string","user":{"id":1,"username":"string","email":"string"},"rolesByEvent":{}}` (201 Created) | Register a new user |
| `POST` | `/api/auth/login` | None | `{"email":"string","password":"string"}` | `{"token":"string","user":{"id":1,"username":"string","email":"string"},"rolesByEvent":{"1":"ORGANIZER"}}` (200 OK) | User login, returns JWT token |
| `GET` | `/api/auth/me` | Bearer JWT | None | `{"user":{"id":1,"username":"string","email":"string"},"rolesByEvent":{"1":"ORGANIZER"}}` (200 OK) | Current authenticated identity and event-scoped roles |

---

## 3. Events, Tracks & Teams (Stage 3 - Person 2)

| Method | Endpoint | Auth | Request Body | Response Body | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/events` | None | None | `[{"id":1,"name":"Dogfood Hackathon 2026","status":"OPEN","submissionDeadline":"2026-10-01T00:00:00Z"}]` | List all events |
| `GET` | `/api/events/{id}` | None | None | `{"id":1,"name":"...","description":"...","tracks":[{"id":1,"name":"AI/ML"}],"submissionDeadline":"..."}` | Event details |
| `POST` | `/api/events` | Bearer (ORGANIZER) | `{"name":"...","description":"...","submissionDeadline":"..."}` | `{"id":1,...}` (201 Created) | Create event |
| `POST` | `/api/events/{id}/teams` | Bearer (PARTICIPANT) | `{"name":"Team Alpha"}` | `{"id":1,"name":"Team Alpha","inviteCode":"ALPHA123"}` (201 Created) | Create team |
| `POST` | `/api/teams/join` | Bearer (PARTICIPANT) | `{"inviteCode":"ALPHA123"}` | `{"id":1,"name":"Team Alpha","members":[...]}` (200 OK) | Join team with code |

---

## 4. Submissions & Gallery (Stage 4 - Person 2)

| Method | Endpoint | Auth | Request Body | Response Body | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/submissions` | None | Query params: `eventId`, `trackId`, `search` | `[{"id":1,"title":"Smart AI","tagline":"...","repoUrl":"...","status":"SUBMITTED"}]` | Public gallery submissions |
| `GET` | `/api/submissions/{id}` | None | None | `{"id":1,"title":"...","description":"...","repoUrl":"...","tags":["AI","Web"]}` | Submission details |
| `POST` | `/api/events/{id}/submissions` | Bearer (PARTICIPANT) | `{"title":"...","tagline":"...","description":"...","repoUrl":"...","trackId":1,"tags":["ai"]}` | `{"id":1,"status":"DRAFT",...}` (201 Created) | Create/Save draft submission |
| `POST` | `/api/submissions/{id}/submit` | Bearer (PARTICIPANT) | None | `{"id":1,"status":"SUBMITTED"}` (200 OK) | Final submission before deadline |

---

## 5. Judging, Assignments & Scoring (Stage 5 - Person 2)

| Method | Endpoint | Auth | Request Body | Response Body | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/judges/me/assignments` | Bearer (JUDGE) | None | `[{"assignmentId":1,"submissionId":10,"submissionTitle":"...","status":"PENDING"}]` | Isolated judge queue |
| `POST` | `/api/events/{id}/assignments` | Bearer (ORGANIZER) | `{"autoAssign":true}` or `{"judgeId":2,"submissionId":10}` | `{"message":"Auto-assigned 77 assignments","count":77}` | Trigger track-matched auto-assignment or manual override |
| `POST` | `/api/judges/me/assignments/{id}/score` | Bearer (JUDGE) | `{"rubricScores":[{"criterionId":1,"score":9.5}],"comment":"Great work"}` | `{"status":"COMPLETED"}` (200 OK) | Submit single score (upsert) |
| `POST` | `/api/judges/coi` | Bearer (JUDGE) | `{"submissionId":10,"coiReason":"SAME_TEAM"}` | `{"status":"DECLARED"}` (200 OK) | Conflict of interest declaration |

---

## 6. Normalization, Distribution & Exports (Stage 7 - Person 1)

| Method | Endpoint | Auth | Request Body | Response Body | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/events/{id}/leaderboard` | None | Query param: `mode=raw` or `mode=normalized` | `[{"rank":1,"submissionId":1,"title":"...","score":94.5,"rawScore":91.0,"zScore":1.42}]` | Ranked results with raw/normalized toggle |
| `GET` | `/api/events/{id}/score-distribution` | Bearer (ORGANIZER) | None | `[{"judgeId":2,"judgeName":"Judge A","rawMean":8.5,"rawStdDev":1.2,"normalizedMean":50.0,"reviewsCount":12}]` | Per-judge scoring distribution stats |
| `GET` | `/api/events/{id}/export/submissions` | Bearer (ORGANIZER) | None | CSV binary stream (`text/csv`) | Export all event submissions |
| `GET` | `/api/events/{id}/export/scores` | Bearer (ORGANIZER) | None | CSV binary stream (`text/csv`) | Export raw scores & comments |
| `GET` | `/api/events/{id}/export/results` | Bearer (ORGANIZER) | None | CSV binary stream (`text/csv`) | Export final ranked leaderboard |
