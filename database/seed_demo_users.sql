-- ============================================================
-- Seed utenti demo — per sviluppo e presentazione
-- Idempotente: ON CONFLICT DO NOTHING su email univoca.
--
-- Credenziali:
--   demo@fitquest.dev   / Demo1234!
--   fase3@fitquest.dev  / Test1234!
--   fase4@fitquest.dev  / Test1234!
-- ============================================================

DO $$
DECLARE
  uid_demo  UUID;
  uid_fase3 UUID;
  uid_fase4 UUID;
  groups    TEXT[] := ARRAY['petto','schiena','gambe','spalle','braccia','core','cardio'];
  g         TEXT;
  tier1_hp  INTEGER := 1600; -- rankUpCost(1) = 1600
BEGIN

  -- ── demo@fitquest.dev ────────────────────────────────────────
  INSERT INTO users (username, email, password_hash, body_weight_kg, weekly_goal)
  VALUES ('demo', 'demo@fitquest.dev',
          '$2b$12$9IBi.BCiNZqzDtN8ic9OJeM2if3bter0fXj.ajWh5AP78XZrH5LRm',
          75, 3)
  ON CONFLICT (email) DO NOTHING;

  SELECT id INTO uid_demo FROM users WHERE email = 'demo@fitquest.dev';

  IF uid_demo IS NOT NULL THEN
    FOREACH g IN ARRAY groups LOOP
      INSERT INTO muscle_group_progress (user_id, muscle_group)
      VALUES (uid_demo, g) ON CONFLICT (user_id, muscle_group) DO NOTHING;

      INSERT INTO bosses (user_id, muscle_group, boss_name, tier, max_hp, current_hp)
      VALUES (uid_demo, g,
        CASE g
          WHEN 'petto'    THEN 'Guardiano del Petto'
          WHEN 'schiena'  THEN 'Guardiano della Schiena'
          WHEN 'gambe'    THEN 'Guardiano delle Gambe'
          WHEN 'spalle'   THEN 'Guardiano delle Spalle'
          WHEN 'braccia'  THEN 'Guardiano delle Braccia'
          WHEN 'core'     THEN 'Guardiano del Core'
          WHEN 'cardio'   THEN 'Guardiano del Cardio'
        END,
        1, tier1_hp, tier1_hp)
      ON CONFLICT (user_id, muscle_group) DO NOTHING;
    END LOOP;

    INSERT INTO streak_state (user_id, goal_at_week_start)
    VALUES (uid_demo, 3) ON CONFLICT (user_id) DO NOTHING;
  END IF;

  -- ── fase3@fitquest.dev ───────────────────────────────────────
  INSERT INTO users (username, email, password_hash, body_weight_kg, weekly_goal)
  VALUES ('fase3', 'fase3@fitquest.dev',
          '$2b$12$NHgm8yYlNn6c2U1Y4yBlnOzgCN16fNakkAYZXdCYbigsHV.evos.C',
          75, 3)
  ON CONFLICT (email) DO NOTHING;

  SELECT id INTO uid_fase3 FROM users WHERE email = 'fase3@fitquest.dev';

  IF uid_fase3 IS NOT NULL THEN
    FOREACH g IN ARRAY groups LOOP
      INSERT INTO muscle_group_progress (user_id, muscle_group)
      VALUES (uid_fase3, g) ON CONFLICT (user_id, muscle_group) DO NOTHING;

      INSERT INTO bosses (user_id, muscle_group, boss_name, tier, max_hp, current_hp)
      VALUES (uid_fase3, g,
        CASE g
          WHEN 'petto'    THEN 'Guardiano del Petto'
          WHEN 'schiena'  THEN 'Guardiano della Schiena'
          WHEN 'gambe'    THEN 'Guardiano delle Gambe'
          WHEN 'spalle'   THEN 'Guardiano delle Spalle'
          WHEN 'braccia'  THEN 'Guardiano delle Braccia'
          WHEN 'core'     THEN 'Guardiano del Core'
          WHEN 'cardio'   THEN 'Guardiano del Cardio'
        END,
        1, tier1_hp, tier1_hp)
      ON CONFLICT (user_id, muscle_group) DO NOTHING;
    END LOOP;

    INSERT INTO streak_state (user_id, goal_at_week_start)
    VALUES (uid_fase3, 3) ON CONFLICT (user_id) DO NOTHING;
  END IF;

  -- ── fase4@fitquest.dev ───────────────────────────────────────
  INSERT INTO users (username, email, password_hash, body_weight_kg, weekly_goal)
  VALUES ('fase4', 'fase4@fitquest.dev',
          '$2b$12$NHgm8yYlNn6c2U1Y4yBlnOzgCN16fNakkAYZXdCYbigsHV.evos.C',
          75, 3)
  ON CONFLICT (email) DO NOTHING;

  SELECT id INTO uid_fase4 FROM users WHERE email = 'fase4@fitquest.dev';

  IF uid_fase4 IS NOT NULL THEN
    FOREACH g IN ARRAY groups LOOP
      INSERT INTO muscle_group_progress (user_id, muscle_group)
      VALUES (uid_fase4, g) ON CONFLICT (user_id, muscle_group) DO NOTHING;

      INSERT INTO bosses (user_id, muscle_group, boss_name, tier, max_hp, current_hp)
      VALUES (uid_fase4, g,
        CASE g
          WHEN 'petto'    THEN 'Guardiano del Petto'
          WHEN 'schiena'  THEN 'Guardiano della Schiena'
          WHEN 'gambe'    THEN 'Guardiano delle Gambe'
          WHEN 'spalle'   THEN 'Guardiano delle Spalle'
          WHEN 'braccia'  THEN 'Guardiano delle Braccia'
          WHEN 'core'     THEN 'Guardiano del Core'
          WHEN 'cardio'   THEN 'Guardiano del Cardio'
        END,
        1, tier1_hp, tier1_hp)
      ON CONFLICT (user_id, muscle_group) DO NOTHING;
    END LOOP;

    INSERT INTO streak_state (user_id, goal_at_week_start)
    VALUES (uid_fase4, 3) ON CONFLICT (user_id) DO NOTHING;
  END IF;

END $$;
