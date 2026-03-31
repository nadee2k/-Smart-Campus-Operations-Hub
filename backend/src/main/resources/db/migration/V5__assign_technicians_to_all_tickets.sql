-- Assign all unassigned tickets to technician Mike Rodriguez (id=2)
UPDATE tickets SET assigned_technician = 2 WHERE assigned_technician IS NULL;
