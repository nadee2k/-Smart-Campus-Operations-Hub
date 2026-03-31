-- ============================================================
-- V2: Add password authentication support & seed demo data
-- ============================================================

ALTER TABLE users ADD COLUMN password_hash VARCHAR(255);
ALTER TABLE users ALTER COLUMN provider_id DROP NOT NULL;

-- BCrypt hash of "password123"
-- Users: 5 local accounts + 1 google-only account
INSERT INTO users (email, name, picture_url, role, provider, provider_id, password_hash, created_at, updated_at) VALUES
('admin@uniops.edu',       'Dr. Sarah Chen',   NULL, 'ADMIN',      'LOCAL',  NULL, '$2a$10$k/Gf8h/f1T3YD..WXe8daOZx7M4Bbj7Dg1OUWGnhBPogNxbSIXB/W', NOW() - INTERVAL '90 days', NOW() - INTERVAL '1 day'),
('tech@uniops.edu',        'Mike Rodriguez',    NULL, 'TECHNICIAN', 'LOCAL',  NULL, '$2a$10$k/Gf8h/f1T3YD..WXe8daOZx7M4Bbj7Dg1OUWGnhBPogNxbSIXB/W', NOW() - INTERVAL '85 days', NOW() - INTERVAL '2 days'),
('john@uniops.edu',        'John Anderson',     NULL, 'USER',       'LOCAL',  NULL, '$2a$10$k/Gf8h/f1T3YD..WXe8daOZx7M4Bbj7Dg1OUWGnhBPogNxbSIXB/W', NOW() - INTERVAL '60 days', NOW() - INTERVAL '1 day'),
('jane@uniops.edu',        'Jane Williams',     NULL, 'USER',       'LOCAL',  NULL, '$2a$10$k/Gf8h/f1T3YD..WXe8daOZx7M4Bbj7Dg1OUWGnhBPogNxbSIXB/W', NOW() - INTERVAL '45 days', NOW() - INTERVAL '3 days'),
('alex@uniops.edu',        'Alex Thompson',     NULL, 'USER',       'LOCAL',  NULL, '$2a$10$k/Gf8h/f1T3YD..WXe8daOZx7M4Bbj7Dg1OUWGnhBPogNxbSIXB/W', NOW() - INTERVAL '30 days', NOW() - INTERVAL '5 days'),
('diwyanvithana@gmail.com','Diwyan Vithana',    NULL, 'USER',       'GOOGLE', 'google-placeholder', NULL, NOW() - INTERVAL '20 days', NOW() - INTERVAL '1 day');

-- Resources: 10 campus facilities
INSERT INTO resources (name, type, capacity, location, availability_start_time, availability_end_time, status, deleted, created_at, updated_at) VALUES
('Main Lecture Hall A',       'LECTURE_HALL',  250, 'Block A, Ground Floor',   '07:00', '21:00', 'ACTIVE',         FALSE, NOW() - INTERVAL '120 days', NOW() - INTERVAL '5 days'),
('Lecture Hall B',            'LECTURE_HALL',  150, 'Block A, First Floor',    '08:00', '20:00', 'ACTIVE',         FALSE, NOW() - INTERVAL '120 days', NOW() - INTERVAL '10 days'),
('Physics Laboratory',       'LAB',            40, 'Block C, Second Floor',   '08:00', '17:00', 'ACTIVE',         FALSE, NOW() - INTERVAL '100 days', NOW() - INTERVAL '3 days'),
('Computer Science Lab',     'LAB',            60, 'Block D, First Floor',    '07:30', '21:00', 'ACTIVE',         FALSE, NOW() - INTERVAL '100 days', NOW() - INTERVAL '1 day'),
('Chemistry Laboratory',     'LAB',            35, 'Block C, Ground Floor',   '08:00', '17:00', 'OUT_OF_SERVICE', FALSE, NOW() - INTERVAL '100 days', NOW() - INTERVAL '2 days'),
('Board Room',               'MEETING_ROOM',   20, 'Admin Block, Third Floor','09:00', '18:00', 'ACTIVE',         FALSE, NOW() - INTERVAL '90 days',  NOW() - INTERVAL '7 days'),
('Faculty Meeting Room',     'MEETING_ROOM',   15, 'Block B, Second Floor',   '08:00', '18:00', 'ACTIVE',         FALSE, NOW() - INTERVAL '90 days',  NOW() - INTERVAL '4 days'),
('Innovation Hub',           'MEETING_ROOM',   30, 'Block D, Ground Floor',   '08:00', '22:00', 'ACTIVE',         FALSE, NOW() - INTERVAL '80 days',  NOW() - INTERVAL '1 day'),
('3D Printer Station',       'EQUIPMENT',       5, 'Maker Space, Block D',    '09:00', '17:00', 'ACTIVE',         FALSE, NOW() - INTERVAL '60 days',  NOW() - INTERVAL '6 days'),
('Video Recording Studio',   'EQUIPMENT',       4, 'Media Center, Block B',   '09:00', '18:00', 'ACTIVE',         FALSE, NOW() - INTERVAL '60 days',  NOW() - INTERVAL '8 days');

-- Bookings: 15 items across various statuses
INSERT INTO bookings (resource_id, user_id, start_time, end_time, purpose, expected_attendees, status, admin_comment, created_at) VALUES
(1, 3, NOW() - INTERVAL '10 days' + TIME '09:00', NOW() - INTERVAL '10 days' + TIME '11:00', 'Data Structures mid-semester review session', 120, 'APPROVED', 'Approved - good use of the hall', NOW() - INTERVAL '15 days'),
(4, 3, NOW() - INTERVAL '5 days' + TIME '14:00',  NOW() - INTERVAL '5 days' + TIME '16:00',  'Programming workshop for freshmen', 45, 'APPROVED', NULL, NOW() - INTERVAL '8 days'),
(6, 4, NOW() - INTERVAL '3 days' + TIME '10:00',  NOW() - INTERVAL '3 days' + TIME '12:00',  'Research project group meeting', 12, 'APPROVED', 'Room confirmed', NOW() - INTERVAL '7 days'),
(8, 5, NOW() - INTERVAL '1 day' + TIME '15:00',   NOW() - INTERVAL '1 day' + TIME '17:00',   'Startup pitch practice session', 20, 'APPROVED', NULL, NOW() - INTERVAL '4 days'),
(2, 4, NOW() + INTERVAL '2 days' + TIME '09:00',  NOW() + INTERVAL '2 days' + TIME '11:00',  'Guest lecture on Machine Learning', 100, 'APPROVED', 'Projector setup required', NOW() - INTERVAL '5 days'),
(7, 3, NOW() + INTERVAL '5 days' + TIME '14:00',  NOW() + INTERVAL '5 days' + TIME '15:30',  'Study group - Final exam prep', 10, 'APPROVED', NULL, NOW() - INTERVAL '3 days'),
(1, 5, NOW() + INTERVAL '7 days' + TIME '10:00',  NOW() + INTERVAL '7 days' + TIME '12:00',  'IEEE Student Chapter - Tech Talk', 180, 'PENDING', NULL, NOW() - INTERVAL '1 day'),
(4, 4, NOW() + INTERVAL '8 days' + TIME '09:00',  NOW() + INTERVAL '8 days' + TIME '12:00',  'Hackathon preliminary round', 50, 'PENDING', NULL, NOW() - INTERVAL '2 days'),
(9, 3, NOW() + INTERVAL '4 days' + TIME '10:00',  NOW() + INTERVAL '4 days' + TIME '14:00',  'Print 3D models for capstone project', 3, 'PENDING', NULL, NOW()),
(6, 5, NOW() + INTERVAL '10 days' + TIME '11:00', NOW() + INTERVAL '10 days' + TIME '13:00', 'Thesis committee pre-meeting', 8, 'PENDING', NULL, NOW()),
(1, 4, NOW() - INTERVAL '20 days' + TIME '08:00', NOW() - INTERVAL '20 days' + TIME '17:00', 'Full-day movie screening event', 200, 'REJECTED', 'Non-academic usage - please use the auditorium instead', NOW() - INTERVAL '25 days'),
(10, 5, NOW() - INTERVAL '12 days' + TIME '09:00',NOW() - INTERVAL '12 days' + TIME '18:00', 'Personal YouTube recording', 2, 'REJECTED', 'Studio not available for personal use. Contact Media Office.', NOW() - INTERVAL '14 days'),
(3, 3, NOW() - INTERVAL '8 days' + TIME '10:00',  NOW() - INTERVAL '8 days' + TIME '12:00',  'Physics lab practical session', 35, 'CANCELLED', NULL, NOW() - INTERVAL '12 days'),
(7, 4, NOW() - INTERVAL '2 days' + TIME '16:00',  NOW() - INTERVAL '2 days' + TIME '17:30',  'Club officers meeting - cancelled due to schedule conflict', 10, 'CANCELLED', NULL, NOW() - INTERVAL '6 days'),
(8, 5, NOW() + INTERVAL '3 days' + TIME '09:00',  NOW() + INTERVAL '3 days' + TIME '11:00',  'Design thinking workshop - moved to next week', 25, 'CANCELLED', NULL, NOW() - INTERVAL '1 day');

-- Tickets: 10 maintenance/incident tickets
INSERT INTO tickets (resource_id, created_by, category, description, priority, status, assigned_technician, resolution_notes, sla_deadline, created_at, updated_at) VALUES
(1, 3, 'Electrical',  'Three overhead lights in the back section of Main Lecture Hall A are flickering and causing distraction during lectures.', 'HIGH', 'OPEN', NULL, NULL, NOW() + INTERVAL '4 hours', NOW() - INTERVAL '2 hours', NOW() - INTERVAL '2 hours'),
(4, 4, 'IT/Network',  'WiFi connectivity drops intermittently in the CS Lab. Around 15 workstations are affected, usually during peak hours (10am-2pm).', 'HIGH', 'OPEN', NULL, NULL, NOW() + INTERVAL '4 hours', NOW() - INTERVAL '5 hours', NOW() - INTERVAL '5 hours'),
(9, 5, 'Equipment',   'The Ultimaker S5 3D printer is showing a filament jam error. Attempted basic troubleshooting but the error persists.', 'MEDIUM', 'OPEN', NULL, NULL, NOW() + INTERVAL '24 hours', NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day'),
(5, 3, 'Plumbing',    'Chemical waste drain in Chemistry Lab is clogged. Strong odor present. Lab has been temporarily marked out of service.', 'HIGH', 'IN_PROGRESS', 2, NULL, NOW() + INTERVAL '2 hours', NOW() - INTERVAL '3 days', NOW() - INTERVAL '1 day'),
(2, 4, 'HVAC',        'Air conditioning in Lecture Hall B is not cooling properly. Room temperature reaching 30C+ during afternoon lectures.', 'MEDIUM', 'IN_PROGRESS', 2, NULL, NOW() + INTERVAL '20 hours', NOW() - INTERVAL '2 days', NOW() - INTERVAL '12 hours'),
(6, 4, 'Furniture',   'Two office chairs in the Board Room have broken armrests and one conference table has a wobbly leg.', 'LOW', 'RESOLVED', 2, 'Replaced both chairs with new ones from storage. Fixed the table leg with wood shims and tightened bolts.', NOW() - INTERVAL '2 days', NOW() - INTERVAL '10 days', NOW() - INTERVAL '3 days'),
(7, 3, 'IT/Network',  'Projector in Faculty Meeting Room not connecting to HDMI input. Shows No Signal on all inputs.', 'MEDIUM', 'RESOLVED', 2, 'HDMI cable was faulty. Replaced cable and tested with multiple laptops - all working now.', NOW() - INTERVAL '5 days', NOW() - INTERVAL '8 days', NOW() - INTERVAL '5 days'),
(10, 5, 'Equipment',  'Microphone in Video Recording Studio producing static noise. Audio quality is unusable for recordings.', 'HIGH', 'RESOLVED', 2, 'XLR cable had a loose connection. Replaced cable and recalibrated audio interface. Test recording sounds clean.', NOW() - INTERVAL '3 days', NOW() - INTERVAL '6 days', NOW() - INTERVAL '4 days'),
(3, 4, 'Safety',      'Emergency eye wash station in Physics Lab has low water pressure. Annual inspection is also overdue.', 'HIGH', 'CLOSED', 2, 'Water supply valve was partially closed. Opened fully. Completed inspection checklist and logged certification.', NOW() - INTERVAL '10 days', NOW() - INTERVAL '15 days', NOW() - INTERVAL '11 days'),
(8, 5, 'Cleaning',    'Innovation Hub carpet has multiple coffee stains and general wear. Needs professional deep cleaning.', 'LOW', 'CLOSED', 2, 'Professional cleaning service completed. Applied stain protector treatment. Scheduled quarterly deep clean.', NOW() - INTERVAL '20 days', NOW() - INTERVAL '25 days', NOW() - INTERVAL '18 days');

-- Ticket comments
INSERT INTO ticket_comments (ticket_id, user_id, content, created_at, updated_at) VALUES
(1, 3, 'This has been going on for about a week. It affects the back three rows of seating.', NOW() - INTERVAL '2 hours', NOW() - INTERVAL '2 hours'),
(1, 1, 'I will assign a technician to check this today. High priority.', NOW() - INTERVAL '1 hour', NOW() - INTERVAL '1 hour'),
(4, 2, 'I have checked the drain and it needs specialized equipment. Called the plumbing contractor.', NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days'),
(4, 3, 'How long will the lab be out of service? We have practicals next week.', NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day'),
(4, 2, 'Contractor is scheduled for tomorrow. Should be fixed by end of day. Will update.', NOW() - INTERVAL '12 hours', NOW() - INTERVAL '12 hours'),
(5, 2, 'Checked the AC unit. Compressor is running but refrigerant levels seem low. Ordering a refill.', NOW() - INTERVAL '10 hours', NOW() - INTERVAL '10 hours'),
(6, 2, 'Chairs replaced. Table fixed. Please verify when you next use the room.', NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days'),
(6, 4, 'Checked today - everything looks great. Thanks Mike!', NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days'),
(7, 2, 'Found the issue - bad HDMI cable. Replacing now.', NOW() - INTERVAL '6 days', NOW() - INTERVAL '6 days'),
(7, 3, 'Tested it this morning, works perfectly now. Thank you!', NOW() - INTERVAL '5 days', NOW() - INTERVAL '5 days'),
(9, 1, 'Closing this ticket. Quarterly cleaning has been scheduled.', NOW() - INTERVAL '18 days', NOW() - INTERVAL '18 days');

-- Notifications
INSERT INTO notifications (user_id, type, message, is_read, reference_type, reference_id, created_at) VALUES
(3, 'BOOKING_APPROVED',     'Your booking for Main Lecture Hall A has been approved.',                        TRUE,  'BOOKING', 1,  NOW() - INTERVAL '14 days'),
(3, 'BOOKING_APPROVED',     'Your booking for Computer Science Lab has been approved.',                      TRUE,  'BOOKING', 2,  NOW() - INTERVAL '7 days'),
(3, 'BOOKING_APPROVED',     'Your booking for Faculty Meeting Room has been approved.',                      FALSE, 'BOOKING', 6,  NOW() - INTERVAL '2 days'),
(3, 'NEW_COMMENT',          'Dr. Sarah Chen commented on Ticket #1 (Flickering lights)',                     FALSE, 'TICKET',  1,  NOW() - INTERVAL '1 hour'),
(3, 'TICKET_STATUS_CHANGED','Ticket #7 status changed to RESOLVED - Projector cable replaced',              TRUE,  'TICKET',  7,  NOW() - INTERVAL '5 days'),
(4, 'BOOKING_APPROVED',     'Your booking for Board Room has been approved.',                                TRUE,  'BOOKING', 3,  NOW() - INTERVAL '6 days'),
(4, 'BOOKING_REJECTED',     'Your booking for Main Lecture Hall A was rejected. Please use the auditorium.', TRUE,  'BOOKING', 11, NOW() - INTERVAL '24 days'),
(4, 'BOOKING_APPROVED',     'Your booking for Lecture Hall B has been approved.',                             FALSE, 'BOOKING', 5,  NOW() - INTERVAL '4 days'),
(4, 'TICKET_STATUS_CHANGED','Ticket #6 status changed to RESOLVED - Furniture replaced',                    TRUE,  'TICKET',  6,  NOW() - INTERVAL '3 days'),
(4, 'NEW_COMMENT',          'Mike Rodriguez commented on Ticket #5 (AC issue)',                              FALSE, 'TICKET',  5,  NOW() - INTERVAL '10 hours'),
(5, 'BOOKING_APPROVED',     'Your booking for Innovation Hub has been approved.',                             TRUE,  'BOOKING', 4,  NOW() - INTERVAL '3 days'),
(5, 'BOOKING_REJECTED',     'Your booking for Video Recording Studio was rejected.',                         TRUE,  'BOOKING', 12, NOW() - INTERVAL '13 days'),
(5, 'TICKET_STATUS_CHANGED','Ticket #8 status changed to RESOLVED - Microphone cable replaced',             TRUE,  'TICKET',  8,  NOW() - INTERVAL '4 days'),
(5, 'TICKET_STATUS_CHANGED','Ticket #10 status changed to CLOSED - Carpet cleaning completed',              TRUE,  'TICKET',  10, NOW() - INTERVAL '18 days'),
(2, 'TICKET_ASSIGNED',      'Ticket #4 (Chemical drain) has been assigned to you.',                          TRUE,  'TICKET',  4,  NOW() - INTERVAL '2 days'),
(2, 'TICKET_ASSIGNED',      'Ticket #5 (AC not cooling) has been assigned to you.',                          TRUE,  'TICKET',  5,  NOW() - INTERVAL '1 day'),
(2, 'NEW_COMMENT',          'John Anderson commented on Ticket #4 - asking about timeline',                  FALSE, 'TICKET',  4,  NOW() - INTERVAL '1 day');
