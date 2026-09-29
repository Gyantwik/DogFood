-- V12: Submission versioning & audit fields
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS version_number INTEGER DEFAULT 1;
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS updated_by BIGINT;
