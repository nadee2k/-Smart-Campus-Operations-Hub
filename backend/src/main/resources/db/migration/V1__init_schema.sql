-- ============================================================
-- Smart Campus Operations Hub - Database Schema
-- ============================================================

-- Users table (populated via OAuth2 login)
CREATE TABLE users (
    id              BIGSERIAL PRIMARY KEY,
    email           VARCHAR(255) NOT NULL UNIQUE,
    name            VARCHAR(255) NOT NULL,
    picture_url     VARCHAR(512),
    role            VARCHAR(20)  NOT NULL DEFAULT 'USER',
    provider        VARCHAR(20)  NOT NULL DEFAULT 'GOOGLE',
    provider_id     VARCHAR(255) NOT NULL,
    created_at      TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);

-- Campus resources / facilities
CREATE TABLE resources (
    id                      BIGSERIAL PRIMARY KEY,
    name                    VARCHAR(255) NOT NULL,
    type                    VARCHAR(30)  NOT NULL,
    capacity                INTEGER      NOT NULL DEFAULT 0,
    location                VARCHAR(255),
    availability_start_time TIME         NOT NULL DEFAULT '08:00:00',
    availability_end_time   TIME         NOT NULL DEFAULT '18:00:00',
    status                  VARCHAR(20)  NOT NULL DEFAULT 'ACTIVE',
    deleted                 BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at              TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_resources_type ON resources(type);
CREATE INDEX idx_resources_status ON resources(status);
CREATE INDEX idx_resources_deleted ON resources(deleted);

-- Bookings
CREATE TABLE bookings (
    id                  BIGSERIAL PRIMARY KEY,
    resource_id         BIGINT       NOT NULL REFERENCES resources(id),
    user_id             BIGINT       NOT NULL REFERENCES users(id),
    start_time          TIMESTAMP    NOT NULL,
    end_time            TIMESTAMP    NOT NULL,
    purpose             VARCHAR(500) NOT NULL,
    expected_attendees  INTEGER      NOT NULL DEFAULT 1,
    status              VARCHAR(20)  NOT NULL DEFAULT 'PENDING',
    admin_comment       TEXT,
    created_at          TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_bookings_resource ON bookings(resource_id);
CREATE INDEX idx_bookings_user ON bookings(user_id);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_bookings_time ON bookings(start_time, end_time);

-- Maintenance / incident tickets
CREATE TABLE tickets (
    id                  BIGSERIAL PRIMARY KEY,
    resource_id         BIGINT       NOT NULL REFERENCES resources(id),
    created_by          BIGINT       NOT NULL REFERENCES users(id),
    category            VARCHAR(100) NOT NULL,
    description         TEXT         NOT NULL,
    priority            VARCHAR(10)  NOT NULL DEFAULT 'MEDIUM',
    status              VARCHAR(20)  NOT NULL DEFAULT 'OPEN',
    assigned_technician BIGINT       REFERENCES users(id),
    resolution_notes    TEXT,
    sla_deadline        TIMESTAMP,
    created_at          TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tickets_resource ON tickets(resource_id);
CREATE INDEX idx_tickets_created_by ON tickets(created_by);
CREATE INDEX idx_tickets_status ON tickets(status);
CREATE INDEX idx_tickets_priority ON tickets(priority);
CREATE INDEX idx_tickets_assigned ON tickets(assigned_technician);

-- Ticket file attachments
CREATE TABLE ticket_attachments (
    id           BIGSERIAL PRIMARY KEY,
    ticket_id    BIGINT       NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    file_path    VARCHAR(512) NOT NULL,
    file_name    VARCHAR(255) NOT NULL,
    content_type VARCHAR(100) NOT NULL,
    file_size    BIGINT       NOT NULL,
    created_at   TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_attachments_ticket ON ticket_attachments(ticket_id);

-- Ticket comments
CREATE TABLE ticket_comments (
    id         BIGSERIAL PRIMARY KEY,
    ticket_id  BIGINT    NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    user_id    BIGINT    NOT NULL REFERENCES users(id),
    content    TEXT      NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_comments_ticket ON ticket_comments(ticket_id);

-- Notifications
CREATE TABLE notifications (
    id             BIGSERIAL PRIMARY KEY,
    user_id        BIGINT       NOT NULL REFERENCES users(id),
    type           VARCHAR(50)  NOT NULL,
    message        TEXT         NOT NULL,
    is_read        BOOLEAN      NOT NULL DEFAULT FALSE,
    reference_type VARCHAR(50),
    reference_id   BIGINT,
    created_at     TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_read ON notifications(user_id, is_read);
