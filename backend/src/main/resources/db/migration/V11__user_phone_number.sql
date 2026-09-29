-- V11: Add phone number to users table for anti-sybil voter registration
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(50);
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
