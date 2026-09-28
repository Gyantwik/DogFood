-- V7: Extended submission media fields and organizer custom questions
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS thumbnail_url VARCHAR(1000);
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS gallery_images TEXT;
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS demo_video_url VARCHAR(1000);
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS live_link VARCHAR(1000);
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS custom_answers TEXT;

CREATE TABLE IF NOT EXISTS event_custom_questions (
    id BIGSERIAL PRIMARY KEY,
    event_id BIGINT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    prompt TEXT NOT NULL,
    question_type VARCHAR(50) DEFAULT 'TEXT',
    required BOOLEAN DEFAULT FALSE,
    display_order INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_custom_questions_event ON event_custom_questions(event_id);
