-- V13: Pairwise judging mode & comparisons ledger
ALTER TABLE events ADD COLUMN IF NOT EXISTS pairwise_judging_enabled BOOLEAN DEFAULT FALSE;

CREATE TABLE IF NOT EXISTS pairwise_comparisons (
    id BIGSERIAL PRIMARY KEY,
    event_id BIGINT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    track_id BIGINT REFERENCES tracks(id) ON DELETE SET NULL,
    judge_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    project_a_id BIGINT NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
    project_b_id BIGINT NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
    winner_project_id BIGINT NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_canonical_pair CHECK (project_a_id < project_b_id),
    CONSTRAINT uk_judge_event_pair UNIQUE (judge_id, event_id, project_a_id, project_b_id)
);

CREATE INDEX IF NOT EXISTS idx_pairwise_event ON pairwise_comparisons(event_id);
CREATE INDEX IF NOT EXISTS idx_pairwise_judge_event ON pairwise_comparisons(judge_id, event_id);
CREATE INDEX IF NOT EXISTS idx_pairwise_track ON pairwise_comparisons(track_id);
CREATE INDEX IF NOT EXISTS idx_pairwise_winner ON pairwise_comparisons(winner_project_id);
