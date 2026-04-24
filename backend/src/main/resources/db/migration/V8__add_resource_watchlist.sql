CREATE TABLE resource_watchlist (
    id          BIGSERIAL PRIMARY KEY,
    resource_id BIGINT    NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
    user_id     BIGINT    NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at  TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_resource_watchlist_resource_user UNIQUE (resource_id, user_id)
);

CREATE INDEX idx_resource_watchlist_resource ON resource_watchlist(resource_id);
CREATE INDEX idx_resource_watchlist_user ON resource_watchlist(user_id);
