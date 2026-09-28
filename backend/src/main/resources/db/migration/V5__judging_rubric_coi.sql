-- V5: Judging Rubric, Assignments, Conflict of Interest, and Score Breakdown
CREATE TABLE IF NOT EXISTS rubrics (
    id BIGSERIAL PRIMARY KEY,
    event_id BIGINT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    locked BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_event_rubric UNIQUE (event_id)
);

CREATE TABLE IF NOT EXISTS rubric_criteria (
    id BIGSERIAL PRIMARY KEY,
    rubric_id BIGINT NOT NULL REFERENCES rubrics(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    criterion_key VARCHAR(50) NOT NULL,
    weight DOUBLE PRECISION NOT NULL,
    min_score DOUBLE PRECISION DEFAULT 1.0,
    max_score DOUBLE PRECISION DEFAULT 5.0,
    CONSTRAINT uk_rubric_key UNIQUE (rubric_id, criterion_key)
);

CREATE TABLE IF NOT EXISTS judge_assignments (
    id BIGSERIAL PRIMARY KEY,
    event_id BIGINT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    judge_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    submission_id BIGINT NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
    status VARCHAR(50) NOT NULL DEFAULT 'ASSIGNED',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_judge_assignment UNIQUE (judge_id, submission_id)
);

CREATE TABLE IF NOT EXISTS conflict_of_interests (
    id BIGSERIAL PRIMARY KEY,
    event_id BIGINT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    judge_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    submission_id BIGINT NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
    reason VARCHAR(50) NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_judge_submission_coi UNIQUE (judge_id, submission_id)
);

CREATE TABLE IF NOT EXISTS score_criteria_values (
    id BIGSERIAL PRIMARY KEY,
    score_id BIGINT NOT NULL REFERENCES scores(id) ON DELETE CASCADE,
    criterion_key VARCHAR(50) NOT NULL,
    score_value DOUBLE PRECISION NOT NULL,
    CONSTRAINT uk_score_criterion UNIQUE (score_id, criterion_key)
);

CREATE INDEX IF NOT EXISTS idx_judge_assignments_judge ON judge_assignments(judge_id, status);
CREATE INDEX IF NOT EXISTS idx_judge_assignments_event ON judge_assignments(event_id);
CREATE INDEX IF NOT EXISTS idx_coi_judge_sub ON conflict_of_interests(judge_id, submission_id);
