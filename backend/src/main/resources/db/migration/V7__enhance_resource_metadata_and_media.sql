ALTER TABLE resources
    ADD COLUMN owner_name VARCHAR(255),
    ADD COLUMN department VARCHAR(255),
    ADD COLUMN maintenance_score INTEGER NOT NULL DEFAULT 100,
    ADD COLUMN layout_map_url VARCHAR(512),
    ADD COLUMN view_360_url VARCHAR(512);

ALTER TABLE resources
    ADD CONSTRAINT chk_resources_maintenance_score
        CHECK (maintenance_score >= 0 AND maintenance_score <= 100);

CREATE TABLE resource_amenities (
    resource_id BIGINT NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
    amenity VARCHAR(100) NOT NULL
);

CREATE TABLE resource_photos (
    resource_id BIGINT NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
    photo_url VARCHAR(512) NOT NULL
);

CREATE INDEX idx_resource_amenities_resource_id ON resource_amenities(resource_id);
CREATE INDEX idx_resource_photos_resource_id ON resource_photos(resource_id);
CREATE INDEX idx_resources_department ON resources(department);
