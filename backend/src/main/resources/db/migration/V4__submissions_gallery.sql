-- V4: Submissions enhancements for gallery, search, and duplicate detection
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS team_id BIGINT REFERENCES teams(id) ON DELETE SET NULL;
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS track VARCHAR(100);
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS demo_url VARCHAR(500);
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS tech_stack TEXT;
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS duplicate_flag BOOLEAN DEFAULT FALSE;
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS content_hash VARCHAR(64);
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS created_by BIGINT REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX IF NOT EXISTS idx_submissions_repo_url ON submissions(repo_url);
CREATE INDEX IF NOT EXISTS idx_submissions_content_hash ON submissions(content_hash);
CREATE INDEX IF NOT EXISTS idx_submissions_event_status ON submissions(event_id, status);
