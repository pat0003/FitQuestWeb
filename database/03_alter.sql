-- ============================================================
-- Migrazione Fase 4: anti-exploit weekly_goal
-- Aggiunge goal_at_week_start a streak_state per snapshottare
-- l'obiettivo settimanale all'inizio di ogni settimana.
-- IF NOT EXISTS rende lo script idempotente.
-- ============================================================

ALTER TABLE streak_state
  ADD COLUMN IF NOT EXISTS goal_at_week_start INT NOT NULL DEFAULT 3;
