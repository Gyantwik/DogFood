# DogFood 2026 Platform

DogFood 2026 is an autonomous, full-stack hackathon submission, judging, and evaluation platform built for high-stakes builder competitions. It provides complete lifecycle management for hackathon events—from public project galleries and strictly enforced submission deadlines (Tier 1) to multi-track rubric scoring, server-side judge isolation, conflict-of-interest prevention, and CSV results export (Tier 2), extensible community voting and project comments (Tier 3), and cryptographic certificate ledgers, signed judge participation records, HMAC-SHA256 webhooks, and bulk JSON bundle import/export (Tier 4).

---

## Table of Contents
- [Architecture & Tech Stack](#architecture--tech-stack)
- [Quickstart & Offline Startup](#quickstart--offline-startup)
- [Tier 3 & Tier 4 Capabilities](#tier-3--tier-4-capabilities)
- [Security & JWT Configuration](#security--jwt-configuration)
- [Dynamic Test Token Acquisition](#dynamic-test-token-acquisition)
- [Fixture Data Ingestion & Event ID Discovery](#fixture-data-ingestion--event-id-discovery)
- [Acceptance Checker (.dogfood.toml)](#acceptance-checker-dogfoodtoml)
- [Verification & Acceptance Results](#verification--acceptance-results)
- [Testing, Isolation & Quality Assurance](#testing-isolation--quality-assurance)
- [Additional Documentation](#additional-documentation)
- [License](#license)

---

## Architecture & Tech Stack

The platform is designed to operate completely self-contained with no external cloud dependencies or third-party SaaS connections:

- **Backend**: Java 17, Spring Boot 3.2.5, Spring Security 6 (Stateless JWT JJWT 0.12.5), Spring Data JPA, Hibernate 6.4.4, Flyway 9.22.3 Database Migrations, Apache Commons CSV 1.10.0.
- **Frontend**: Vanilla ES6 JavaScript Single-Page Application (SPA with modular router, reactive auth state, and dynamic DOM rendering) with custom CSS design system, served via Nginx Alpine.
- **Database**: PostgreSQL 16 Alpine.
- **Containerization**: Docker Compose orchestrating all services with health checks and volume persistence.

For detailed architecture diagrams and security flowcharts, refer to [ARCHITECTURE.md](ARCHITECTURE.md).

---

## Tier 3 & Tier 4 Capabilities

### Tier 3 (Public Features)
1. **Community Voting Engine**:
   - Access modes: `OPEN` (client token + IP sliding window), `EMAIL` (email-gated validation), `AUTHENTICATED` (JWT bearer-gated).
   - Server-side duplicate prevention (`409 Conflict`), rate limiter (`429 Too Many Requests`), and window rejection outside event voting dates.
   - Public ballot endpoint with randomized presentation order.
2. **Project Comments Stream**:
   - Public submissions comments feed with real-time length validation (1 to 1000 characters) and server-side persistence.
3. **Hidden Standings During Deliberation**:
   - Leaderboard access is strictly hidden from participants and visitors (`403 Forbidden`) until `results_publish_at` has passed. Organizers maintain full preview access.

### Tier 4 (Stretch Engineering)
1. **Cryptographic Certificate Authority**:
   - Immutable certificates ledger with canonical SHA-256 verification hashes.
   - Public verification endpoint `/api/certificates/{id}` requiring zero authentication.
2. **Signed Judge Participation Records**:
   - HMAC-SHA256 tamper-evident records certifying review completion count without leaking confidential individual project scores.
   - Public verification endpoint `/api/verify/judge-record`.
3. **Event Webhooks**:
   - Webhook registration for 8 event types (`vote.created`, `score.submitted`, `submission.created`, `results.published`, etc.).
   - HMAC-SHA256 signature dispatch (`X-DogFood-Signature`) with delivery logs.
4. **Bulk JSON Bundle Export & Import**:
   - Organizer export of complete event hierarchy (event, tracks, submissions, votes, comments, leaderboard, certificates).
   - Idempotent import endpoint for seamless data migration.

---

## Quickstart & Offline Startup

The entire platform boots offline with a single Docker Compose command:

```bash
# 1. Create a local .env file with your JWT signing secret (see Security section)
echo "JWT_SECRET=$(openssl rand -hex 32)" > .env

# 2. Start the database, backend, and frontend containers
docker compose up -d --build
```

### Service Health & Ports
- **Frontend Web UI**: `http://localhost:3000` (Nginx container serving static SPA assets)
- **Backend REST API**: `http://localhost:8080` (Spring Boot API)
- **PostgreSQL Database**: `localhost:5432`

To run locally without Docker:
```bash
# Backend (requires local PostgreSQL on port 5432)
cd backend
mvn spring-boot:run

# Frontend (served with any static HTTP server, e.g. Python http.server or Nginx)
cd frontend
python -m http.server 3000
```

---

## Security & JWT Configuration

### Managing `JWT_SECRET`
The application requires a cryptographically secure 256-bit or 512-bit signing secret. To adhere to strict security hygiene, **no real signing secrets or live tokens are ever committed to version control**.

1. Create a `.env` file at the repository root (this file is excluded by `.gitignore`):
   ```ini
   JWT_SECRET=your_secure_random_512_bit_hex_secret_here
   ```
2. When starting with Docker Compose, `docker-compose.yml` automatically passes `JWT_SECRET` from `.env` to the backend container.
3. If running via IDE or CLI, set `JWT_SECRET` as an environment variable before running `mvn spring-boot:run`.

---

## Dynamic Test Token Acquisition

Test credentials are automatically seeded on startup by `DataSeeder.java`. You can acquire live, valid JWT bearer tokens dynamically through the `/api/auth/login` endpoint without manual secret crafting:

### Using Bash / cURL:
```bash
# Obtain Organizer Token
ORGANIZER_TOKEN=$(curl -s -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"organizer@dogfood.local","password":"organizer_pass123"}' \
  | jq -r '.data.token')

# Obtain Judge A Token
JUDGE_A_TOKEN=$(curl -s -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"judge_a@dogfood.local","password":"judge_a_pass123"}' \
  | jq -r '.data.token')

# Obtain Judge B Token
JUDGE_B_TOKEN=$(curl -s -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"judge_b@dogfood.local","password":"judge_b_pass123"}' \
  | jq -r '.data.token')

# Obtain Participant Token
PARTICIPANT_TOKEN=$(curl -s -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"participant@dogfood.local","password":"participant_pass123"}' \
  | jq -r '.data.token')
```

### Using PowerShell:
```powershell
$orgToken = (Invoke-RestMethod -Uri "http://localhost:8080/api/auth/login" -Method POST -Body (@{email="organizer@dogfood.local"; password="organizer_pass123"} | ConvertTo-Json) -ContentType "application/json").data.token
$judgeAToken = (Invoke-RestMethod -Uri "http://localhost:8080/api/auth/login" -Method POST -Body (@{email="judge_a@dogfood.local"; password="judge_a_pass123"} | ConvertTo-Json) -ContentType "application/json").data.token
$judgeBToken = (Invoke-RestMethod -Uri "http://localhost:8080/api/auth/login" -Method POST -Body (@{email="judge_b@dogfood.local"; password="judge_b_pass123"} | ConvertTo-Json) -ContentType "application/json").data.token
$partToken = (Invoke-RestMethod -Uri "http://localhost:8080/api/auth/login" -Method POST -Body (@{email="participant@dogfood.local"; password="participant_pass123"} | ConvertTo-Json) -ContentType "application/json").data.token
```

---

## Fixture Data Ingestion & Event ID Discovery

### Idempotent Fixture Ingestion
On boot, `DataSeeder.java` reads `fixtures.json` (containing 40 projects, tracks, teams, and scores). Ingestion is fully idempotent and lookup-driven:
- The event is matched by name (`"Sample Hack 2026"`).
- Existing records are never wiped or clobbered.
- The fixture event's `submissions_close` timestamp (`2026-03-01T18:00:00Z`) is preserved in the past, ensuring accurate deadline-rejection testing.

### Fixture Event ID Discovery
Because database auto-increment sequences vary depending on preexisting database state, you can dynamically discover the exact numeric ID assigned to the fixture event:

```bash
# Query the public events list:
EVENT_ID=$(curl -s http://localhost:8080/api/events | jq '.data[] | select(.name=="Sample Hack 2026") | .id')
```

In PowerShell:
```powershell
$EVENT_ID = (Invoke-RestMethod http://localhost:8080/api/events).data | Where-Object { $_.name -eq "Sample Hack 2026" } | Select-Object -ExpandProperty id
```

Use the discovered `$EVENT_ID` when filling in `.dogfood.toml`.

---

## Acceptance Checker (.dogfood.toml)

Create `.dogfood.toml` at the root of the repository (template provided in `example.dogfood.toml`). Note that `.dogfood.toml` is ignored by `.gitignore` to prevent leaking live tokens.

### Configuration Template
```toml
[portal]
base_url = "http://localhost:8080"

[tiers]
claimed = ["T1", "T2"]
pitch = "Self-hostable hackathon submission and judging platform with rigorous RBAC, judge isolation, and z-score normalization."

[auth]
organizer   = "Authorization: Bearer <ORGANIZER_TOKEN>"
judge_a     = "Authorization: Bearer <JUDGE_A_TOKEN>"
judge_b     = "Authorization: Bearer <JUDGE_B_TOKEN>"
participant = "Authorization: Bearer <PARTICIPANT_TOKEN>"

[routes]
gallery      = "/api/events/<EVENT_ID>/submissions"
submit       = "/api/events/<EVENT_ID>/submissions"
judge_scores = "/api/judge/scores"
peer_scores  = "/api/judge/scores?judge=judge_a"
csv_export   = "/api/events/<EVENT_ID>/export/scores"
```
*(Replace `<EVENT_ID>` with the discovered fixture event ID, e.g. `1`).*

### Running the Official Acceptance Checker
Run the unmodified organizer acceptance checker using standard Python 3:

```bash
python run.py .dogfood.toml
```

---

## Verification & Acceptance Results

The official unmodified organizer acceptance suite runs 7 checks against the live portal:

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

## Testing, Isolation & Quality Assurance

### Java Unit & Security Tests
The backend includes 47 unit, integration, and security tests:
- **Judge Security Isolation**: Verifies that judges cannot view peer scores, participants are rejected with 403 Forbidden, and judges with conflicts of interest cannot submit scores.
- **Track-Matched Judge Assignment & COI**: `TrackMatchedJudgeAssignmentTest` verifies track-matched judge allocation, non-matching exclusions, declared conflict exclusions, team membership exclusions, idempotent repeat runs, and organizer manual cross-track overrides.
- **Z-Score Normalization & Zero-Variance Fallback**: `ZScoreNormalizationServiceTest` verifies $T = 50 + 10Z$ standard scoring and zero-variance $T_{\text{flat}} = 50.0$ fallback, ensuring no scale-mixing occurs with flat judges.
- **Export & Audit Logging Security**: `ExportAuditLoggingTest` verifies that authorized CSV exports generate structured `EXPORT_CSV` audit log entries with user and event IDs, without leaking bearer tokens or CSV payloads, and that unauthorized or failing requests produce no success audit records.
- **Fixture Event Isolation**: `FixtureEventIdIsolationTest` (a mocked unit test) verifies repository logic ensuring that if an unrelated event exists at ID 1, the fixture event is cleanly mapped to ID 2 without overwriting legacy data.
- **Data Model & Service Tests**: Validates rubric score calculations, event state transitions, and CSV generation.

Run all tests:
```bash
cd backend
mvn clean test
```

> **Explicit Verification Scope**:
> - **Official Acceptance Checker (`run.py`)**: The 7 official organizer checks verify public galleries, fixture loading, closed-event submission rejections, judge self-scores, peer score isolation, participant score blockade, and CSV export. *Note*: `run.py` does not test normalization math or track assignment logic.
> - **Mocked Unit Verification**: `FixtureEventIdIsolationTest.java` is a mocked unit test verifying ID allocation safety in isolation when unrelated events exist.
> - **Clean-Database Installation Verification**: Verified on an empty database using an isolated Docker Compose project (`dogfood-fresh-test`) and fresh volume. Flyway executed all 6 migrations (`V1`–`V6`) from scratch, `DataSeeder` loaded all fixtures idempotently, and the unmodified organizer checker achieved **7/7 PASS**.
> - **Primary Environment Verification**: Verified against the active Docker container instance using dynamic bearer tokens generated via `POST /api/auth/login`.

---

## Additional Documentation

- [ARCHITECTURE.md](ARCHITECTURE.md) - System topology, component interactions, security layers, and data pipelines.
- [DATA-MODEL.md](DATA-MODEL.md) - Relational schema, entity specifications, Flyway migrations, and fixture mappings.
- [JUDGING.md](JUDGING.md) - Judging workflows, score normalization mathematics, peer isolation rules, and CSV exports.

---

## License

This project is licensed under the [MIT License](LICENSE).
