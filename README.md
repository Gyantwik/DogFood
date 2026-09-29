# DogFood 2026 Platform

> **Autonomous, self-hostable, offline-first hackathon submission, judging, and verification platform with statistical Z-score score normalization, conflict-of-interest enforcement, community voting, and cryptographic verification certificates.**

DogFood 2026 provides complete lifecycle management for hackathons—spanning:
- **Tier 1 (Core)**: Public project galleries, draft auto-saving, strict deadline enforcement, and team invite management.
- **Tier 2 (Judging & Normalization)**: Multi-track rubric evaluations, strict server-side judge isolation, conflict of interest (COI) declaration, statistical Z-score score normalization ($T = 50 + 10Z$), and RFC 4180 CSV exports.
- **Tier 3 (Public Features)**: Public community choice voting with multi-mode access (`OPEN`, `EMAIL`, `AUTHENTICATED`), real-time project comments feed, and cryptographic deliberation protection.
- **Tier 4 (Stretch Engineering)**: Immutable certificate ledger with SHA-256 proofs, zero-knowledge signed judge participation records, asynchronous HMAC-SHA256 webhooks, embeddable project gallery widget, and bulk hierarchical JSON migration bundles.

---

## Table of Contents
- [Architecture & Tech Stack](#architecture--tech-stack)
- [Tier 1 through Tier 4 Capabilities](#tier-1-through-tier-4-capabilities)
- [Quickstart & Offline Startup](#quickstart--offline-startup)
- [REST API Reference](#rest-api-reference)
- [Security & JWT Configuration](#security--jwt-configuration)
- [Dynamic Test Token Acquisition](#dynamic-test-token-acquisition)
- [Fixture Data Ingestion & Event ID Discovery](#fixture-data-ingestion--event-id-discovery)
- [Official Acceptance Checker (`run.py`)](#official-acceptance-checker-runpy)
- [Verification & Automated Test Suites](#verification--automated-test-suites)
- [Documentation Index](#documentation-index)
- [License](#license)

---

## Architecture & Tech Stack

The platform is designed to operate completely self-contained with no external cloud dependencies, CDNs, or third-party SaaS connections (100% offline-ready):

- **Backend**: Java 17, Spring Boot 3.2.5, Spring Security 6 (Stateless JWT JJWT 0.12.5), Spring Data JPA, Hibernate 6.4.4, Flyway 9.22.3 Database Migrations, Apache Commons CSV 1.10.0.
- **Frontend**: Zero-build Vanilla ES6 JavaScript Single-Page Application (SPA) with uninterrupted scrolling design, responsive role portals, iframe-friendly embed widget, and custom CSS design tokens, served via Nginx Alpine.
- **Database**: PostgreSQL 16 Alpine with Flyway migrations V1 through V13.
- **Containerization**: Docker Compose orchestrating all services with health checks and volume persistence.

For system topology, sequence diagrams, and mathematical specifications, see [ARCHITECTURE.md](ARCHITECTURE.md) and [DATA-MODEL.md](DATA-MODEL.md).

---

## Tier 1 through Tier 4 Capabilities

### Tier 1 — Core Hackathon Lifecycle & Submission Hardening
* **Public Project Showcase**: High-performance gallery with search, track filtering, and rich project detail inspection.
* **Server-Persisted Drafts & Version History**: Participants can save in-progress submissions to the server without accidental loss. Pre-deadline updates increment `version_number` and record `updated_by` without duplicating project identity or public URLs.
* **Pre-Flight Submission Readiness Checklist**: Integrated pre-flight validator (`GET /api/events/{id}/submissions/readiness`) ensuring title, tagline, description, track, repo URL, window status, and registration prerequisites are satisfied before submission.
* **Strict Server-Side Deadlines & Dynamic Countdown**: Submissions strictly reject with HTTP 409 past `submission_deadline`. Real-time second-by-second countdown with visual phase indicators (Open, Closing Soon, Closed).
* **Team Management**: Team creation, private invite codes, and participant roster management.

### Tier 2 — Rubric Judging, Operations & Score Normalization
* **Role Isolation**: Strict server-side separation where builders, judges, and organizers see only what they are authorized to see.
* **Peer Judge Isolation**: Judges can only retrieve their own scores (`/api/judge/scores`). Inquiring peer scores is rejected with HTTP 403 Forbidden.
* **Conflict of Interest (COI)**: Prompt declaration of conflicts with automated re-assignment and scoring quarantine.
* **Judge Coverage Dashboard**: Visual evaluation saturation tracking ($3/3 \checkmark$, $2/3 \triangle$, $0/3 \times$) across all submitted projects.
* **Judge Workload Balancing Dashboard**: Real-time monitoring of assignments, completions, remaining reviews, and completion percentages.
* **Scoring Health & Anomaly Monitoring**: Organizer-level visibility into judge grading distributions ($\mu_i, \sigma_i$) and flat-judge alerts without leaking individual reviews to peers.
* **Statistical Score Normalization**: Re-scales scores across strict and generous judges using standard normal distribution ($T = 50 + 10Z$) with zero-variance fallbacks ($T_{\text{flat}} = 50.0$).
* **Reproducible Normalization Proof**: Complete mathematical and cryptographic audit report modal (`GET /api/events/{id}/judging/normalization-proof`) explaining per-judge distributions and per-submission derivation steps.
* **Verified RFC 4180 CSV Exports**: Submissions, raw judge scores, and normalized leaderboard results exportable via standardized CSV.

### Tier 3 — Public Community, Anti-Sybil Voting & Deliberation Protection
* **Community Choice Voting Engine**:
  * Configurable access modes: `OPEN` (sliding-window IP + client identifier), `EMAIL` (email-gated validation), `AUTHENTICATED` (JWT account-gated).
  * **Anti-Sybil Phone Voter Verification**: Phone-verified voting (`1 Phone = 1 Vote`) preventing multiple-email abuse and Sybil voting attacks.
  * **Lifecycle Voting Schedule Tied to Event Dates**: Voting officially opens when the hackathon reaches its `submissionDeadline`, and automatically closes 24 hours (1 day) prior to the final winner declaration (`resultsPublishAt` / `judgingEnd`).
  * Server-side duplicate prevention (`409 Conflict`), anti-abuse rate limiting (`429 Too Many Requests`), and cryptographic ballot receipts.
  * Public ballot endpoint with randomized presentation order, real-time search, and pagination.
* **Top 3 Winners Standing Podium**:
  * Official winners podium displayed exclusively after the hackathon concludes (`status == CLOSED` or current time past winner publication).
  * Distinct 3-pedestal layout: 1st Place Gold Champion (middle, highest 310px box), 2nd Place Silver Runner-up (right, 250px box), and 3rd Place Bronze (left, 200px box).
* **Project Discussion Feed**:
  * Real-time comments stream with character validation (1 to 1000 characters) and server-side persistence.
* **Deliberation Gate**:
  * Results are sealed (`403 Forbidden`) from participants and public visitors until `results_publish_at` expires, preventing mid-competition judging bias while allowing organizers full review access.
* **User Profile & Official Certificate Downloader (`#/profile`)**:
  * Identity management, mobile phone anti-Sybil verification, and personal certificate wallet (`/api/certificates/me`).
  * Direct vector SVG/PDF certificate download with tamper-evident SHA-256 ledger checksum fingerprints and digital seals.

### Tier 4 — Cryptographic Trust & Integration
* **Cryptographic Certificate Authority & Verification Portal**:
  * Immutable certificate records on PostgreSQL ledger with canonical SHA-256 verification proofs.
  * Public zero-authentication verification endpoint (`/api/certificates/{id}`) and dedicated public portal (`#/verify`, `#/verify/cert`).
  * Instant vector SVG certificate download and printable credential formatting.
* **Zero-Knowledge Signed Judge Records & Letters of Service**:
  * Tamper-evident participation records certified via HMAC-SHA256, proving review counts without exposing confidential project scores or comments.
  * Public zero-knowledge verification endpoint (`/api/verify/judge-record`) and dedicated portal (`#/verify/judge`).
* **Asynchronous Webhook Engine & Built-in Local Test Sink**:
  * Event dispatch for 9 system events (`vote.created`, `score.submitted`, `submission.created`, `submission.updated`, `submission.submitted`, `results.published`, `judge.assigned`, `comment.created`, `test.ping`).
  * HMAC-SHA256 signed payload headers (`X-DogFood-Signature: sha256=<hex>`) and complete delivery audit logging.
  * **Built-in Local Test Sink (`/api/webhooks/receiver` & `/api/webhooks/received`)**: In-memory circular buffer for 100% offline, local testing with instant UI inspection and payload retries.
* **Hackathon Replicator & Hierarchical Bulk Migration**:
  * **One-Click Hackathon Cloner (`POST /api/events/{id}/clone`)**: Replicates any existing hackathon into a new edition with all tracks, rubrics, custom questions, and forward date shifts.
  * One-click JSON export/import preserving full event hierarchy (tracks, submissions, teams, scores, votes, comments, certificates).
* **Security & Forensic Audit Trail Explorer**:
  * Live searchable security audit trail tracking anti-abuse events, duplicate vote rejections, rate limits, COI recusals, and event mutations.
  * One-click RFC 4180 CSV export (`GET /api/events/{id}/audit-logs/export`) for compliance reporting.
* **Embeddable Showcase Widget**:
  * Responsive, iframe-friendly standalone route (`#/embed/gallery?event={id}`) for embedding hackathon showcases on external blogs and sites.

### Bonus Challenge — Pairwise Judging Mode & Bradley-Terry Ranking Engine (+5)
* **Organizer-Configurable Pairwise Mode**: Toggleable per event via `POST /api/events/{id}/pairwise/toggle` (`pairwise_judging_enabled`).
* **Side-by-Side Duel Interface**: Judges compare exactly TWO eligible projects at a time (`[ Project A is Better ]` vs `[ Project B is Better ]`) with keyboard controls (`A`/`Left Arrow`, `B`/`Right Arrow`, `S` for Skip) and comparative rationale notes.
* **Bounded Smart Heuristic Matchups**: Prioritizes least-compared projects to accelerate graph coverage, bounded ($K \le 40$) to prevent $O(N^2)$ memory explosion on large datasets.
* **Zero-Leakage Peer Privacy**: Never reveals peer scores, rubric ratings, normalized scores, or global ranks to judges.
* **Canonical Duplicate Prevention**: Persists pairs as $\min(A, B) < \max(A, B)$ with database check constraint and unique constraint; rejects identical and reversed duplicates with **HTTP 409 Conflict**.
* **Bradley-Terry Minorization-Maximization (MM) Engine**:
  * Recovers latent strength parameters ($s_i$) via iterative Minorization-Maximization with Bayesian smoothing prior ($\alpha = 0.05$).
  * Scale-normalizes strengths to mean $\bar{s} = 1.000$ with convergence threshold $\Delta < 10^{-6}$.
  * Detects comparison graph connectivity via BFS components: returns `INSUFFICIENT_COVERAGE` with component counts when disconnected, and `CONVERGED` when connected.
* **Coverage Dashboard & RFC 4180 CSV Export**: Real-time coverage telemetry (`/api/events/{id}/judging/pairwise/coverage`) and downloadable CSV rankings (`/api/events/{id}/export/pairwise`).
* **51-Step Verification Suite**: Verified by `py tests/pairwise-judging-test.py` covering all algorithmic, security, and operational requirements.

---

## Quickstart & Offline Startup

The entire platform boots offline with a single Docker Compose command:

```bash
# 1. Create a local .env file with your JWT signing secret (see Security section)
echo "JWT_SECRET=$(openssl rand -hex 32)" > .env

# 2. Start the database, backend, and frontend containers
docker compose up -d --build
```

### Port Mapping
- **Frontend Web UI**: `http://localhost:3000` (Vanilla SPA served by Nginx)
- **Backend REST API**: `http://localhost:8080` (Spring Boot API)
- **PostgreSQL Database**: `localhost:5432`

To run locally without Docker:
```bash
# Backend (requires local PostgreSQL on port 5432)
cd backend
mvn spring-boot:run

# Frontend (served with any static HTTP server)
cd frontend
python -m http.server 3000
```

---

## REST API Reference

### Authentication (`/api/auth`)
| Method | Endpoint | Access | Description |
|:---|:---|:---|:---|
| `POST` | `/api/auth/signup` | Public | Register new user account (`username`, `email`, `password`) |
| `POST` | `/api/auth/login` | Public | Authenticate user and receive HMAC-SHA512 signed JWT |
| `GET` | `/api/auth/me` | Authenticated | Retrieve current user profile and event-scoped roles |

### Events, Submissions & Teams (`/api/events`)
| Method | Endpoint | Access | Description |
|:---|:---|:---|:---|
| `GET` | `/api/events` | Public | List all hackathons |
| `GET` | `/api/events/{id}` | Public | Get hackathon details and lifecycle dates |
| `GET` | `/api/events/{id}/submissions` | Public | Retrieve submitted projects for gallery |
| `POST` | `/api/events/{id}/submissions` | Participant | Lock and submit final project before deadline |
| `POST` | `/api/events/{id}/submissions/draft` | Participant | Save in-progress draft to server |
| `GET` | `/api/events/{id}/submissions/draft` | Participant | Hydrate existing draft from server |

### Judging & Score Normalization (`/api`)
| Method | Endpoint | Access | Description |
|:---|:---|:---|:---|
| `GET` | `/api/judge/scores` | Judge / Org | Get caller's assigned project scores (peer scores blocked with 403) |
| `GET` | `/api/judges/me/assignments` | Judge | Get assigned projects queue |
| `POST` | `/api/events/{id}/scores` | Judge | Submit rubric scores for assigned project |
| `POST` | `/api/events/{id}/coi` | Judge | Declare Conflict of Interest for reassignment |
| `GET` | `/api/events/{id}/leaderboard` | Deliberation Gated | Retrieve Z-score normalized standings ($T = 50 + 10Z$) |
| `GET` | `/api/events/{id}/export/scores` | Organizer | Download CSV export of scores and normalized standings |

### Tier 3 Community Features (`/api/events/{id}`)
| Method | Endpoint | Access | Description |
|:---|:---|:---|:---|
| `GET` | `/api/events/{id}/voting/status` | Public | Check if voting is open, active mode, and vote count |
| `GET` | `/api/events/{id}/voting/ballot` | Public | Retrieve randomized community ballot projects |
| `POST` | `/api/events/{id}/voting/vote` | Dynamic | Submit community vote (`OPEN`, `EMAIL`, or `AUTH` mode) |
| `GET` | `/api/events/{id}/voting/results` | Deliberation Gated | Retrieve public voting totals after publication |
| `GET` | `/api/events/{id}/submissions/{subId}/comments` | Public | Get public comments feed for project |
| `POST` | `/api/events/{id}/submissions/{subId}/comments` | Public | Post comment (1 to 1000 characters) |

### Tier 4 Cryptographic Trust & Webhooks (`/api`)
| Method | Endpoint | Access | Description |
|:---|:---|:---|:---|
| `GET` | `/api/certificates/{id}` | Public | Verify authenticity and SHA-256 hash of certificate |
| `POST` | `/api/events/{id}/certificates/generate` | Organizer | Generate tamper-proof certificates for event |
| `GET` | `/api/events/{id}/judges/me/record` | Judge | Get caller's HMAC-SHA256 signed participation record |
| `POST` | `/api/verify/judge-record` | Public | Verify zero-knowledge judge participation signature |
| `GET` | `/api/events/{id}/webhooks` | Organizer | List registered webhook endpoints |
| `POST` | `/api/events/{id}/webhooks` | Organizer | Register webhook URL and secret |
| `POST` | `/api/events/{id}/webhooks/{id}/test` | Organizer | Dispatch signed test ping |
| `GET` | `/api/events/{id}/webhooks/{id}/deliveries` | Organizer | Inspect delivery status and latency log |
| `GET` | `/api/events/{id}/export/bundle` | Organizer | Export complete event hierarchy JSON bundle |
| `POST` | `/api/events/{id}/import/bundle` | Organizer | Import hierarchical event bundle idempotently |

---

## Security & JWT Configuration

### Managing `JWT_SECRET`
The application requires a cryptographically secure 256-bit or 512-bit signing secret. To adhere to strict security hygiene, **no real signing secrets or live tokens are ever committed to version control**.

1. Create a `.env` file at the repository root (this file is excluded by `.gitignore`):
   ```ini
   JWT_SECRET=your_secure_random_512_bit_hex_secret_here
   ```
2. When starting with Docker Compose, `docker-compose.yml` automatically passes `JWT_SECRET` from `.env` to the backend container.

---

## Dynamic Test Token Acquisition

Test credentials are automatically seeded on startup by `DataSeeder.java`. You can acquire live, valid JWT bearer tokens dynamically through the `/api/auth/login` endpoint:

### Using cURL:
```bash
# Organizer Token
ORGANIZER_TOKEN=$(curl -s -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"organizer@dogfood.local","password":"organizer_pass123"}' \
  | jq -r '.data.token')

# Judge A Token
JUDGE_A_TOKEN=$(curl -s -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"judge_a@dogfood.local","password":"judge_a_pass123"}' \
  | jq -r '.data.token')
```

### Using PowerShell:
```powershell
$orgToken = (Invoke-RestMethod -Uri "http://localhost:8080/api/auth/login" -Method POST -Body (@{email="organizer@dogfood.local"; password="organizer_pass123"} | ConvertTo-Json) -ContentType "application/json").data.token
$judgeAToken = (Invoke-RestMethod -Uri "http://localhost:8080/api/auth/login" -Method POST -Body (@{email="judge_a@dogfood.local"; password="judge_a_pass123"} | ConvertTo-Json) -ContentType "application/json").data.token
```

---

## Fixture Data Ingestion & Event ID Discovery

On startup, `DataSeeder.java` reads `fixtures.json` (containing 40 projects, tracks, teams, and scores). Ingestion is fully idempotent:
- The event is matched by name (`"Sample Hack 2026"`).
- Existing records are never wiped or clobbered.
- The fixture event's `submission_deadline` timestamp is preserved in the past, ensuring accurate deadline-rejection testing.

### Event ID Discovery
```bash
EVENT_ID=$(curl -s http://localhost:8080/api/events | jq '.data[] | select(.name=="Sample Hack 2026") | .id')
```
In PowerShell:
```powershell
$EVENT_ID = (Invoke-RestMethod http://localhost:8080/api/events).data | Where-Object { $_.name -eq "Sample Hack 2026" } | Select-Object -ExpandProperty id
```

---

## Official Acceptance Checker (`run.py`)

Create `.dogfood.toml` at the root of the repository (template provided in `example.dogfood.toml`). Run the official checker:

```bash
python run.py .dogfood.toml
```

Output:
```text
DOGFOOD 2026 acceptance report
portal: http://localhost:8080
claimed: T1 T2
fixtures: fixtures.json

T1  gallery is public ................. PASS
T1  project from fixtures shown ....... PASS
T1  closed event refuses submissions .. PASS
T2  judge sees own scores ............. PASS
T2  judge cannot see peer scores ...... PASS
T2  participant blocked ............... PASS
T2  csv export works .................. PASS

claimed T1 T2, verified T1 T2
```

---

## Verification & Automated Test Suites

The platform includes end-to-end automated test suites verifying all claimed tiers with 100% pass rates:

```
================================================================================
TEST SUITE MATRIX                                               CHECKS   STATUS
================================================================================
1. Official Acceptance Suite (run.py .dogfood.toml)                 7    PASSED
2. T1 & T2 Hardening Suite (tests/t1-t2-hardening-suite.py)        21    PASSED
3. Pairwise Judging & Bradley-Terry (tests/pairwise-judging-test)  51    PASSED
4. T3 & T4 Verification Suite (tests/t3-t4-verification-suite.py)  52    PASSED
5. Regression Verification Suite (tests/final-verification-suite)  18    PASSED
6. Frontend Truthfulness Suite (frontend/tests/truthfulness.test)  42    PASSED
7. Submission Lifecycle Suite (tests/submission-lifecycle-test)    11    PASSED
--------------------------------------------------------------------------------
TOTAL VERIFIED AUTOMATED CHECKS:                                  202    100% PASS
================================================================================
```

To run the verification suites:
```bash
# 1. Run official acceptance suite
python run.py .dogfood.toml

# 2. Run T1/T2 hardening and operations suite
python tests/t1-t2-hardening-suite.py

# 3. Run Pairwise Judging & Bradley-Terry MM engine suite
python tests/pairwise-judging-test.py

# 4. Run T3/T4 complete verification suite
python tests/t3-t4-verification-suite.py

# 5. Run targeted regression verification suite
python tests/final-verification-suite.py

# 6. Run submission lifecycle verification
python tests/submission-lifecycle-test.py

# 7. Run frontend truthfulness and routing suite
node frontend/tests/truthfulness.test.mjs
```

---

## Documentation Index

- [ARCHITECTURE.md](ARCHITECTURE.md) - System topology, component interactions, security layers, cryptographic formulas, and webhooks.
- [DATA-MODEL.md](DATA-MODEL.md) - Relational schema, entity specifications, Flyway migrations (V1–V13), and fixture mappings.
- [JUDGING.md](JUDGING.md) - Judging workflows, score normalization mathematics ($T = 50 + 10Z$), operational dashboards, Bradley-Terry Pairwise engine, and reproducible proof reports.
- [THREAT-MODEL.md](THREAT-MODEL.md) - Threat analysis, peer score isolation, anti-sybil defenses, HMAC-SHA256 signature verification, and security boundaries.

---

## License

This project is licensed under the [MIT License](LICENSE).
