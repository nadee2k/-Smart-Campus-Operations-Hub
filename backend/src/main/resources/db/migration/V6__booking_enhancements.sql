-- Booking cancellation reason
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS cancellation_reason VARCHAR(255);

-- Booking check-in fields
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS checked_in BOOLEAN DEFAULT FALSE;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS checked_in_at TIMESTAMP;

-- Internal notes flag for ticket comments
ALTER TABLE ticket_comments ADD COLUMN IF NOT EXISTS is_internal BOOLEAN DEFAULT FALSE;
