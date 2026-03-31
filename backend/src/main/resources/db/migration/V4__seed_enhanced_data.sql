-- ============================================================
-- V4: Seed enhanced demo data (activity logs, satisfaction ratings, category standardization)
-- ============================================================

-- Update existing ticket categories to standardized enum values
UPDATE tickets SET category = 'ELECTRICAL' WHERE LOWER(category) = 'electrical';
UPDATE tickets SET category = 'IT_EQUIPMENT' WHERE LOWER(category) IN ('it/network', 'it_equipment');
UPDATE tickets SET category = 'PLUMBING' WHERE LOWER(category) = 'plumbing';
UPDATE tickets SET category = 'HVAC' WHERE LOWER(category) = 'hvac';
UPDATE tickets SET category = 'FURNITURE' WHERE LOWER(category) = 'furniture';
UPDATE tickets SET category = 'SECURITY' WHERE LOWER(category) = 'safety';
UPDATE tickets SET category = 'CLEANING' WHERE LOWER(category) = 'cleaning';
UPDATE tickets SET category = 'GENERAL_MAINTENANCE' WHERE LOWER(category) IN ('equipment', 'general', 'other', 'general_maintenance');
UPDATE tickets SET category = 'GENERAL_MAINTENANCE' WHERE category NOT IN
  ('ELECTRICAL','PLUMBING','HVAC','IT_EQUIPMENT','FURNITURE','CLEANING','SECURITY','OTHER','GENERAL_MAINTENANCE');

-- Add satisfaction ratings to resolved/closed tickets
UPDATE tickets SET satisfaction_rating = 5, rated_at = updated_at + INTERVAL '1 day'
WHERE id = (SELECT id FROM tickets WHERE status = 'RESOLVED' AND category = 'FURNITURE' LIMIT 1);

UPDATE tickets SET satisfaction_rating = 4, rated_at = updated_at + INTERVAL '2 days'
WHERE id = (SELECT id FROM tickets WHERE status = 'RESOLVED' AND category = 'IT_EQUIPMENT' LIMIT 1);

UPDATE tickets SET satisfaction_rating = 5, rated_at = updated_at + INTERVAL '1 day'
WHERE id = (SELECT id FROM tickets WHERE status = 'RESOLVED' AND category = 'GENERAL_MAINTENANCE' LIMIT 1);

UPDATE tickets SET satisfaction_rating = 4, rated_at = updated_at + INTERVAL '3 days'
WHERE id = (SELECT id FROM tickets WHERE status = 'CLOSED' AND category = 'SECURITY' LIMIT 1);

UPDATE tickets SET satisfaction_rating = 5, rated_at = updated_at + INTERVAL '2 days'
WHERE id = (SELECT id FROM tickets WHERE status = 'CLOSED' AND category = 'CLEANING' LIMIT 1);

-- Activity log entries covering all action types
INSERT INTO activity_log (actor_id, actor_name, action, target_type, target_id, description, created_at) VALUES
(1, 'Dr. Sarah Chen', 'RESOURCE_CREATED', 'RESOURCE', 1, 'Created resource: Main Lecture Hall A', NOW() - INTERVAL '120 days'),
(1, 'Dr. Sarah Chen', 'RESOURCE_CREATED', 'RESOURCE', 2, 'Created resource: Lecture Hall B', NOW() - INTERVAL '120 days'),
(1, 'Dr. Sarah Chen', 'RESOURCE_CREATED', 'RESOURCE', 3, 'Created resource: Physics Laboratory', NOW() - INTERVAL '100 days'),
(1, 'Dr. Sarah Chen', 'RESOURCE_CREATED', 'RESOURCE', 4, 'Created resource: Computer Science Lab', NOW() - INTERVAL '100 days'),
(1, 'Dr. Sarah Chen', 'RESOURCE_CREATED', 'RESOURCE', 5, 'Created resource: Chemistry Laboratory', NOW() - INTERVAL '100 days'),
(1, 'Dr. Sarah Chen', 'RESOURCE_CREATED', 'RESOURCE', 6, 'Created resource: Board Room', NOW() - INTERVAL '90 days'),
(1, 'Dr. Sarah Chen', 'RESOURCE_CREATED', 'RESOURCE', 7, 'Created resource: Faculty Meeting Room', NOW() - INTERVAL '90 days'),
(1, 'Dr. Sarah Chen', 'RESOURCE_CREATED', 'RESOURCE', 8, 'Created resource: Innovation Hub', NOW() - INTERVAL '80 days'),
(1, 'Dr. Sarah Chen', 'RESOURCE_UPDATED', 'RESOURCE', 5, 'Updated resource: Chemistry Laboratory — status changed to OUT_OF_SERVICE', NOW() - INTERVAL '50 days'),
(3, 'John Anderson', 'BOOKING_CREATED', 'BOOKING', 1, 'Booked Main Lecture Hall A', NOW() - INTERVAL '15 days'),
(3, 'John Anderson', 'BOOKING_CREATED', 'BOOKING', 2, 'Booked Computer Science Lab', NOW() - INTERVAL '8 days'),
(4, 'Jane Williams', 'BOOKING_CREATED', 'BOOKING', 3, 'Booked Board Room', NOW() - INTERVAL '7 days'),
(5, 'Alex Thompson', 'BOOKING_CREATED', 'BOOKING', 4, 'Booked Innovation Hub', NOW() - INTERVAL '4 days'),
(1, 'Dr. Sarah Chen', 'BOOKING_APPROVED', 'BOOKING', 1, 'Approved booking for Main Lecture Hall A', NOW() - INTERVAL '14 days'),
(1, 'Dr. Sarah Chen', 'BOOKING_APPROVED', 'BOOKING', 2, 'Approved booking for Computer Science Lab', NOW() - INTERVAL '7 days'),
(1, 'Dr. Sarah Chen', 'BOOKING_APPROVED', 'BOOKING', 3, 'Approved booking for Board Room', NOW() - INTERVAL '6 days'),
(1, 'Dr. Sarah Chen', 'BOOKING_APPROVED', 'BOOKING', 4, 'Approved booking for Innovation Hub', NOW() - INTERVAL '3 days'),
(1, 'Dr. Sarah Chen', 'BOOKING_REJECTED', 'BOOKING', 11, 'Rejected booking for Main Lecture Hall A — non-academic use', NOW() - INTERVAL '24 days'),
(3, 'John Anderson', 'BOOKING_CANCELLED', 'BOOKING', 13, 'Cancelled booking for Physics Laboratory', NOW() - INTERVAL '11 days'),
(3, 'John Anderson', 'TICKET_CREATED', 'TICKET', 1, 'Created ticket: ELECTRICAL — Flickering lights in Main Lecture Hall A', NOW() - INTERVAL '2 hours'),
(4, 'Jane Williams', 'TICKET_CREATED', 'TICKET', 2, 'Created ticket: IT_EQUIPMENT — WiFi drops in CS Lab', NOW() - INTERVAL '5 hours'),
(5, 'Alex Thompson', 'TICKET_CREATED', 'TICKET', 3, 'Created ticket: GENERAL_MAINTENANCE — 3D printer filament jam', NOW() - INTERVAL '1 day'),
(3, 'John Anderson', 'TICKET_CREATED', 'TICKET', 4, 'Created ticket: PLUMBING — Chemical waste drain clogged', NOW() - INTERVAL '3 days'),
(1, 'Dr. Sarah Chen', 'TICKET_ASSIGNED', 'TICKET', 4, 'Assigned ticket #4 to Mike Rodriguez', NOW() - INTERVAL '2 days'),
(1, 'Dr. Sarah Chen', 'TICKET_ASSIGNED', 'TICKET', 5, 'Assigned ticket #5 to Mike Rodriguez', NOW() - INTERVAL '1 day'),
(2, 'Mike Rodriguez', 'TICKET_STATUS_CHANGED', 'TICKET', 4, 'Status changed to IN_PROGRESS', NOW() - INTERVAL '2 days'),
(2, 'Mike Rodriguez', 'TICKET_STATUS_CHANGED', 'TICKET', 5, 'Status changed to IN_PROGRESS', NOW() - INTERVAL '12 hours'),
(2, 'Mike Rodriguez', 'TICKET_STATUS_CHANGED', 'TICKET', 6, 'Status changed to RESOLVED', NOW() - INTERVAL '3 days'),
(2, 'Mike Rodriguez', 'TICKET_STATUS_CHANGED', 'TICKET', 7, 'Status changed to RESOLVED', NOW() - INTERVAL '5 days'),
(2, 'Mike Rodriguez', 'TICKET_STATUS_CHANGED', 'TICKET', 8, 'Status changed to RESOLVED', NOW() - INTERVAL '4 days'),
(1, 'Dr. Sarah Chen', 'TICKET_STATUS_CHANGED', 'TICKET', 9, 'Status changed to CLOSED', NOW() - INTERVAL '11 days'),
(1, 'Dr. Sarah Chen', 'TICKET_STATUS_CHANGED', 'TICKET', 10, 'Status changed to CLOSED', NOW() - INTERVAL '18 days'),
(2, 'Mike Rodriguez', 'TICKET_COMMENTED', 'TICKET', 4, 'Added comment on ticket #4', NOW() - INTERVAL '2 days'),
(3, 'John Anderson', 'TICKET_COMMENTED', 'TICKET', 4, 'Added comment on ticket #4', NOW() - INTERVAL '1 day'),
(2, 'Mike Rodriguez', 'TICKET_COMMENTED', 'TICKET', 5, 'Added comment on ticket #5', NOW() - INTERVAL '10 hours'),
(4, 'Jane Williams', 'TICKET_RATED', 'TICKET', 6, 'Rated ticket #6 — 5 stars', NOW() - INTERVAL '2 days'),
(3, 'John Anderson', 'TICKET_RATED', 'TICKET', 7, 'Rated ticket #7 — 4 stars', NOW() - INTERVAL '4 days'),
(5, 'Alex Thompson', 'TICKET_RATED', 'TICKET', 8, 'Rated ticket #8 — 5 stars', NOW() - INTERVAL '3 days'),
(1, 'Dr. Sarah Chen', 'USER_ROLE_CHANGED', 'USER', 2, 'Changed role to TECHNICIAN', NOW() - INTERVAL '84 days');
