-- V2: Audit Log Schema
CREATE TABLE IF NOT EXISTS audit_log (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
    event_id BIGINT,
    action VARCHAR(100) NOT NULL,
    details TEXT,
    ip_address VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_audit_log_user ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_event ON audit_log(event_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_action ON audit_log(action);
