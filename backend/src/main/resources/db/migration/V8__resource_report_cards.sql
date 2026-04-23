CREATE TABLE resource_report_cards (
    id BIGSERIAL PRIMARY KEY,
    resource_id BIGINT NOT NULL REFERENCES resources(id),
    week_start_date DATE NOT NULL,
    week_end_date DATE NOT NULL,
    total_bookings BIGINT NOT NULL,
    approved_bookings BIGINT NOT NULL,
    cancelled_bookings BIGINT NOT NULL,
    booked_hours NUMERIC(8,1) NOT NULL,
    tickets_opened BIGINT NOT NULL,
    tickets_resolved BIGINT NOT NULL,
    average_resolution_hours NUMERIC(8,1) NOT NULL,
    resource_score INTEGER NOT NULL,
    pdf_content BYTEA NOT NULL,
    generated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(resource_id, week_start_date)
);

CREATE INDEX idx_resource_report_cards_resource_week
    ON resource_report_cards(resource_id, week_start_date DESC);
