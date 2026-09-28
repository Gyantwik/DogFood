-- V1: Core Schema for Dogfood Platform
CREATE TABLE IF NOT EXISTS users (
    id BIGSERIAL PRIMARY KEY,
    username VARCHAR(100) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS event_roles (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    event_id BIGINT NOT NULL,
    role VARCHAR(50) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_user_event_role UNIQUE (user_id, event_id, role)
);

CREATE INDEX IF NOT EXISTS idx_event_roles_user_event ON event_roles(user_id, event_id);

CREATE TABLE IF NOT EXISTS events (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'OPEN',
    submission_deadline TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS submissions (
    id BIGSERIAL PRIMARY KEY,
    event_id BIGINT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    tagline TEXT,
    description TEXT,
    repo_url VARCHAR(500),
    status VARCHAR(50) DEFAULT 'DRAFT',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS scores (
    id BIGSERIAL PRIMARY KEY,
    event_id BIGINT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    submission_id BIGINT NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
    judge_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    raw_score DOUBLE PRECISION NOT NULL,
    normalized_score DOUBLE PRECISION,
    comment TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_judge_submission UNIQUE (judge_id, submission_id)
);

CREATE INDEX IF NOT EXISTS idx_scores_event ON scores(event_id);
CREATE INDEX IF NOT EXISTS idx_scores_judge ON scores(judge_id);
