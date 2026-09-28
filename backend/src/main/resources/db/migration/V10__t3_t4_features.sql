-- V10: T3 & T4 features schema: Voting, Comments, Webhooks, and Certificates

-- 1. Voting Configuration on Events
ALTER TABLE events
    ADD COLUMN IF NOT EXISTS voting_enabled BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS voting_access_mode VARCHAR(50) DEFAULT 'OPEN';

-- 2. Votes Table (Community Voting)
CREATE TABLE IF NOT EXISTS votes (
    id BIGSERIAL PRIMARY KEY,
    event_id BIGINT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    submission_id BIGINT NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
    voter_identifier VARCHAR(255) NOT NULL,
    voter_type VARCHAR(50) NOT NULL DEFAULT 'OPEN', -- 'OPEN', 'EMAIL', 'AUTHENTICATED'
    user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
    voter_email VARCHAR(255),
    ip_address VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT uq_event_voter UNIQUE (event_id, voter_identifier)
);

CREATE INDEX IF NOT EXISTS idx_votes_event ON votes(event_id);
CREATE INDEX IF NOT EXISTS idx_votes_submission ON votes(submission_id);

-- 3. Comments Table (Public Project Comments)
CREATE TABLE IF NOT EXISTS comments (
    id BIGSERIAL PRIMARY KEY,
    event_id BIGINT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    submission_id BIGINT NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
    user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
    author_name VARCHAR(150) NOT NULL,
    author_email VARCHAR(255),
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_comments_submission ON comments(submission_id);
CREATE INDEX IF NOT EXISTS idx_comments_event ON comments(event_id);

-- 4. Webhooks Table
CREATE TABLE IF NOT EXISTS webhooks (
    id BIGSERIAL PRIMARY KEY,
    event_id BIGINT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    url VARCHAR(1024) NOT NULL,
    secret VARCHAR(255) NOT NULL,
    events TEXT NOT NULL DEFAULT '*',
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_webhooks_event ON webhooks(event_id);

-- 5. Webhook Deliveries Table
CREATE TABLE IF NOT EXISTS webhook_deliveries (
    id BIGSERIAL PRIMARY KEY,
    webhook_id BIGINT REFERENCES webhooks(id) ON DELETE CASCADE,
    event_id BIGINT NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    payload TEXT NOT NULL,
    response_status INT,
    response_body TEXT,
    status VARCHAR(50) NOT NULL, -- 'SUCCESS', 'FAILED'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_webhook ON webhook_deliveries(webhook_id);

-- 6. Certificates Table
CREATE TABLE IF NOT EXISTS certificates (
    id BIGSERIAL PRIMARY KEY,
    certificate_id VARCHAR(100) UNIQUE NOT NULL,
    event_id BIGINT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    recipient_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
    recipient_name VARCHAR(255) NOT NULL,
    recipient_email VARCHAR(255),
    recipient_type VARCHAR(50) NOT NULL, -- 'PARTICIPANT', 'JUDGE', 'WINNER'
    award_title VARCHAR(255) NOT NULL,
    verification_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_certificates_cert_id ON certificates(certificate_id);
CREATE INDEX IF NOT EXISTS idx_certificates_event ON certificates(event_id);
