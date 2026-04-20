-- ============================================================
-- FIT QUEST WEB — Database Schema
-- Adattato dal progetto personale FitQuest (React Native)
-- ============================================================

-- Utenti (NUOVO — non presente nel progetto mobile)
CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username        VARCHAR(50) UNIQUE NOT NULL,
    email           VARCHAR(255) UNIQUE NOT NULL,
    password_hash   VARCHAR(255) NOT NULL,  -- bcrypt
    body_weight_kg  REAL NOT NULL DEFAULT 75.0,
    weekly_goal     INTEGER NOT NULL DEFAULT 3,  -- workout a settimana
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Libreria esercizi (pre-popolata, condivisa tra tutti gli utenti)
CREATE TABLE exercises (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(100) NOT NULL,
    muscle_group    VARCHAR(20) NOT NULL
                    CHECK (muscle_group IN (
                        'petto','schiena','gambe','spalle','braccia','core','cardio'
                    )),
    category        VARCHAR(20) NOT NULL
                    CHECK (category IN (
                        'pesi','corpo_libero','isometrico','cardio'
                    )),
    difficulty      SMALLINT NOT NULL CHECK (difficulty BETWEEN 1 AND 3)
);

-- Workout (sessioni di allenamento)
CREATE TABLE workouts (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    started_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at    TIMESTAMPTZ,
    total_xp        INTEGER NOT NULL DEFAULT 0,
    notes           TEXT
);
CREATE INDEX idx_workouts_user ON workouts(user_id, started_at DESC);

-- Esercizi all'interno di un workout
CREATE TABLE workout_exercises (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workout_id      UUID NOT NULL REFERENCES workouts(id) ON DELETE CASCADE,
    exercise_id     UUID NOT NULL REFERENCES exercises(id),
    order_index     SMALLINT NOT NULL DEFAULT 0,
    xp_earned       INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX idx_we_workout ON workout_exercises(workout_id);

-- Serie (set) per ogni esercizio nel workout
CREATE TABLE exercise_sets (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workout_exercise_id UUID NOT NULL REFERENCES workout_exercises(id) ON DELETE CASCADE,
    set_number      SMALLINT NOT NULL,
    reps            SMALLINT,           -- per pesi e corpo libero
    weight_kg       REAL,               -- per pesi
    seconds         INTEGER,            -- per isometrici e cardio
    ballast_kg      REAL DEFAULT 0,     -- zavorra corpo libero
    xp_earned       INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX idx_sets_we ON exercise_sets(workout_exercise_id);

-- Progressione per gruppo muscolare (per utente)
CREATE TABLE muscle_group_progress (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    muscle_group    VARCHAR(20) NOT NULL,
    total_xp        BIGINT NOT NULL DEFAULT 0,
    current_xp      INTEGER NOT NULL DEFAULT 0,  -- XP nel rango corrente
    rank_band       SMALLINT NOT NULL DEFAULT 1,  -- 1=Bronzo ... 6=Diamante
    rank_sub        SMALLINT NOT NULL DEFAULT 1,  -- 1, 2, 3
    UNIQUE(user_id, muscle_group)
);

-- Streak settimanale
CREATE TABLE streak_state (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    current_streak  INTEGER NOT NULL DEFAULT 0,
    streak_tier     SMALLINT NOT NULL DEFAULT 0 CHECK (streak_tier BETWEEN 0 AND 3),
    week_start      DATE NOT NULL DEFAULT CURRENT_DATE,
    workouts_this_week INTEGER NOT NULL DEFAULT 0,
    best_streak     INTEGER NOT NULL DEFAULT 0
);

-- Boss attivi (uno per gruppo muscolare per utente)
CREATE TABLE bosses (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    muscle_group    VARCHAR(20) NOT NULL,
    boss_name       VARCHAR(100) NOT NULL,
    tier            SMALLINT NOT NULL DEFAULT 1,  -- 1-5 (Guardiano..Titano)
    max_hp          INTEGER NOT NULL,
    current_hp      INTEGER NOT NULL,
    defeated        BOOLEAN NOT NULL DEFAULT FALSE,
    defeated_at     TIMESTAMPTZ,
    UNIQUE(user_id, muscle_group)
);
