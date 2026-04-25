CREATE TABLE resource_blackouts (
    id          BIGSERIAL PRIMARY KEY,
    resource_id BIGINT       NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
    title       VARCHAR(255) NOT NULL,
    reason      TEXT,
    start_time  TIMESTAMP    NOT NULL,
    end_time    TIMESTAMP    NOT NULL,
    created_at  TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_resource_blackouts_resource ON resource_blackouts(resource_id);
CREATE INDEX idx_resource_blackouts_time ON resource_blackouts(resource_id, start_time, end_time);
