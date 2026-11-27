-- Data migration: two new system categories for payments between people.
-- prisma/seed.ts has them too, for fresh databases. This makes sure existing
-- databases (including production, where the seed may never run) get them.
-- ON CONFLICT DO NOTHING: safe if the seed already added them.

INSERT INTO "categories" ("id", "user_id", "name", "type", "created_at", "updated_at")
VALUES
  ('sys_people_out', NULL, 'Sent to people', 'EXPENSE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('sys_people_in', NULL, 'Received from people', 'INCOME', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;
