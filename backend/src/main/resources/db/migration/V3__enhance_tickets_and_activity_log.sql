-- Activity log table
CREATE TABLE activity_log (
    id BIGSERIAL PRIMARY KEY,
    actor_id BIGINT REFERENCES users(id),
    actor_name VARCHAR(255),
    action VARCHAR(50) NOT NULL,
    target_type VARCHAR(50),
    target_id BIGINT,
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_activity_log_created ON activity_log(created_at DESC);
CREATE INDEX idx_activity_log_actor ON activity_log(actor_id);

-- Ticket satisfaction rating
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS satisfaction_rating INTEGER CHECK (satisfaction_rating BETWEEN 1 AND 5);
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS rated_at TIMESTAMP;

-- Migrate free-text categories to enum values
UPDATE tickets SET category = 'GENERAL_MAINTENANCE' WHERE category NOT IN
  ('ELECTRICAL','PLUMBING','HVAC','IT_EQUIPMENT','FURNITURE','CLEANING','SECURITY','OTHER');
