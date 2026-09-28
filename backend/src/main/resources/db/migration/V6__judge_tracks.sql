-- V6: Judge Track Associations
CREATE TABLE IF NOT EXISTS judge_tracks (
    id BIGSERIAL PRIMARY KEY,
    event_id BIGINT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    judge_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    track_id BIGINT NOT NULL REFERENCES tracks(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_judge_event_track UNIQUE (judge_id, track_id)
);

CREATE INDEX IF NOT EXISTS idx_judge_tracks_judge ON judge_tracks(judge_id);
CREATE INDEX IF NOT EXISTS idx_judge_tracks_track ON judge_tracks(track_id);
CREATE INDEX IF NOT EXISTS idx_judge_tracks_event ON judge_tracks(event_id);
