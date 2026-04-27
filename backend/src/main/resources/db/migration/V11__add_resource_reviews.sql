CREATE TABLE resource_reviews (
    id          BIGSERIAL PRIMARY KEY,
    resource_id BIGINT    NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
    user_id     BIGINT    NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    rating      INTEGER   NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment     TEXT,
    created_at  TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT uk_resource_reviews_resource_user UNIQUE (resource_id, user_id)
);

CREATE INDEX idx_resource_reviews_resource ON resource_reviews(resource_id);
CREATE INDEX idx_resource_reviews_user ON resource_reviews(user_id);
