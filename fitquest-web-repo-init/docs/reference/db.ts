// ============================================================
// FIT QUEST — Database Layer (SDK 52)
// ============================================================

import * as SQLite from 'expo-sqlite';
import * as Crypto from 'expo-crypto';
import {
  type MuscleGroup, type ExerciseCategory, type Difficulty,
  type BossStatus, type BossTier, type StreakTier,
  type MobilityExerciseType, type MedalCategory, type NotificationType, type RecordType,
  type UserProfile, type Exercise, type MobilityExercise,
  type Workout, type WorkoutExercise, type ExerciseSet,
  type MuscleGroupProgress, type StreakState, type WeeklyWorkoutLog,
  type Boss, type Medal, type PersonalRecord,
  type MobilitySession, type MobilitySessionExercise, type NotificationSetting,
} from './types';
import { getEffectiveCoefficients, getXpCostForLevel, BOSS_HP } from '../constants/game';

// ============================================================
// Helpers
// ============================================================
export function generateId(): string {
  return Crypto.randomUUID();
}

function now(): string {
  return new Date().toISOString();
}

// ============================================================
// Database instance (SDK 52 async API)
// ============================================================
let db: SQLite.SQLiteDatabase | null = null;

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (db) return db;
  db = await SQLite.openDatabaseAsync('fitquest.db');
  await db.execAsync('PRAGMA journal_mode = WAL;');
  await db.execAsync('PRAGMA foreign_keys = ON;');
  return db;
}

// ============================================================
// Schema SQL
// ============================================================
const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS user_profile (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL DEFAULT 'Guerriero',
  body_weight_kg REAL NOT NULL DEFAULT 75,
  weekly_workout_goal INTEGER NOT NULL DEFAULT 4,
  total_zen_points INTEGER NOT NULL DEFAULT 0,
  total_workouts INTEGER NOT NULL DEFAULT 0,
  total_kg_lifted REAL NOT NULL DEFAULT 0,
  total_reps INTEGER NOT NULL DEFAULT 0,
  total_cardio_seconds INTEGER NOT NULL DEFAULT 0,
  total_pr_count INTEGER NOT NULL DEFAULT 0,
  total_exercises_tried INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS exercises (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  muscle_group TEXT NOT NULL,
  category TEXT NOT NULL,
  difficulty INTEGER NOT NULL,
  notes TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_exercises_muscle ON exercises(muscle_group);
CREATE INDEX IF NOT EXISTS idx_exercises_category ON exercises(category);

CREATE TABLE IF NOT EXISTS mobility_exercises (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  zone_target TEXT NOT NULL,
  type TEXT NOT NULL,
  suggested_duration_sec INTEGER NOT NULL,
  notes TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS workouts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  date TEXT NOT NULL,
  total_xp INTEGER NOT NULL DEFAULT 0,
  started_at TEXT NOT NULL,
  completed_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES user_profile(id)
);
CREATE INDEX IF NOT EXISTS idx_workouts_date ON workouts(date);
CREATE INDEX IF NOT EXISTS idx_workouts_user ON workouts(user_id);

CREATE TABLE IF NOT EXISTS workout_exercises (
  id TEXT PRIMARY KEY,
  workout_id TEXT NOT NULL,
  exercise_id TEXT NOT NULL,
  order_index INTEGER NOT NULL,
  xp_earned INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (workout_id) REFERENCES workouts(id) ON DELETE CASCADE,
  FOREIGN KEY (exercise_id) REFERENCES exercises(id)
);
CREATE INDEX IF NOT EXISTS idx_we_workout ON workout_exercises(workout_id);

CREATE TABLE IF NOT EXISTS exercise_sets (
  id TEXT PRIMARY KEY,
  workout_exercise_id TEXT NOT NULL,
  set_number INTEGER NOT NULL,
  reps INTEGER,
  weight_kg REAL,
  seconds INTEGER,
  ballast_kg REAL NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (workout_exercise_id) REFERENCES workout_exercises(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_sets_we ON exercise_sets(workout_exercise_id);

CREATE TABLE IF NOT EXISTS muscle_group_progress (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  muscle_group TEXT NOT NULL,
  rank_level INTEGER NOT NULL DEFAULT 1,
  current_xp INTEGER NOT NULL DEFAULT 0,
  total_xp INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES user_profile(id)
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_mgp_user_group ON muscle_group_progress(user_id, muscle_group);

CREATE TABLE IF NOT EXISTS streak_state (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  current_streak_weeks INTEGER NOT NULL DEFAULT 0,
  tier INTEGER NOT NULL DEFAULT 0,
  last_verified_week TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES user_profile(id)
);

CREATE TABLE IF NOT EXISTS weekly_workout_log (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  week TEXT NOT NULL,
  workouts_done INTEGER NOT NULL DEFAULT 0,
  goal INTEGER NOT NULL,
  completed INTEGER NOT NULL DEFAULT 0,
  total_xp INTEGER NOT NULL DEFAULT 0,
  pr_count INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES user_profile(id)
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_wwl_user_week ON weekly_workout_log(user_id, week);

CREATE TABLE IF NOT EXISTS bosses (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  muscle_group TEXT NOT NULL,
  name TEXT NOT NULL,
  tier INTEGER NOT NULL,
  hp_total INTEGER NOT NULL,
  hp_remaining INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'dormant',
  activated_at TEXT,
  defeated_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES user_profile(id)
);
CREATE INDEX IF NOT EXISTS idx_bosses_user_group ON bosses(user_id, muscle_group);
CREATE INDEX IF NOT EXISTS idx_bosses_status ON bosses(status);

CREATE TABLE IF NOT EXISTS medals (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  medal_key TEXT NOT NULL,
  category TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  requirement_type TEXT NOT NULL,
  requirement_value REAL NOT NULL,
  unlocked_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES user_profile(id)
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_medals_user_key ON medals(user_id, medal_key);

CREATE TABLE IF NOT EXISTS personal_records (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  exercise_id TEXT NOT NULL,
  record_type TEXT NOT NULL,
  value REAL NOT NULL,
  previous_value REAL,
  achieved_at TEXT NOT NULL,
  workout_id TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES user_profile(id),
  FOREIGN KEY (exercise_id) REFERENCES exercises(id)
);
CREATE INDEX IF NOT EXISTS idx_pr_user_exercise ON personal_records(user_id, exercise_id);

CREATE TABLE IF NOT EXISTS mobility_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  session_type TEXT NOT NULL,
  zen_points INTEGER NOT NULL DEFAULT 0,
  completed INTEGER NOT NULL DEFAULT 0,
  date TEXT NOT NULL,
  workout_id TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES user_profile(id)
);

CREATE TABLE IF NOT EXISTS mobility_session_exercises (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  exercise_id TEXT NOT NULL,
  order_index INTEGER NOT NULL,
  completed INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (session_id) REFERENCES mobility_sessions(id) ON DELETE CASCADE,
  FOREIGN KEY (exercise_id) REFERENCES mobility_exercises(id)
);

CREATE TABLE IF NOT EXISTS notification_settings (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  notification_type TEXT NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 1,
  scheduled_time TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES user_profile(id)
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_ns_user_type ON notification_settings(user_id, notification_type);
`;

// ============================================================
// Row Mappers
// ============================================================
export function mapUserProfile(row: any): UserProfile {
  return { id: row.id, username: row.username, bodyWeightKg: row.body_weight_kg, weeklyWorkoutGoal: row.weekly_workout_goal, totalZenPoints: row.total_zen_points, totalWorkouts: row.total_workouts, totalKgLifted: row.total_kg_lifted, totalReps: row.total_reps, totalCardioSeconds: row.total_cardio_seconds, totalPrCount: row.total_pr_count, totalExercisesTried: row.total_exercises_tried, createdAt: row.created_at, updatedAt: row.updated_at };
}

export function mapExercise(row: any): Exercise {
  return { id: row.id, name: row.name, muscleGroup: row.muscle_group, category: row.category, difficulty: row.difficulty, notes: row.notes, createdAt: row.created_at, updatedAt: row.updated_at };
}

export function mapMobilityExercise(row: any): MobilityExercise {
  return { id: row.id, name: row.name, zoneTarget: row.zone_target, type: row.type, suggestedDurationSec: row.suggested_duration_sec, notes: row.notes, createdAt: row.created_at, updatedAt: row.updated_at };
}

export function mapWorkout(row: any): Workout {
  return { id: row.id, userId: row.user_id, date: row.date, totalXp: row.total_xp, startedAt: row.started_at, completedAt: row.completed_at, createdAt: row.created_at, updatedAt: row.updated_at };
}

export function mapWorkoutExercise(row: any): WorkoutExercise {
  return { id: row.id, workoutId: row.workout_id, exerciseId: row.exercise_id, orderIndex: row.order_index, xpEarned: row.xp_earned, createdAt: row.created_at, updatedAt: row.updated_at };
}

export function mapExerciseSet(row: any): ExerciseSet {
  return { id: row.id, workoutExerciseId: row.workout_exercise_id, setNumber: row.set_number, reps: row.reps, weightKg: row.weight_kg, seconds: row.seconds, ballastKg: row.ballast_kg, createdAt: row.created_at, updatedAt: row.updated_at };
}

export function mapMuscleGroupProgress(row: any): MuscleGroupProgress {
  return { id: row.id, userId: row.user_id, muscleGroup: row.muscle_group, rankLevel: row.rank_level, currentXp: row.current_xp, totalXp: row.total_xp, createdAt: row.created_at, updatedAt: row.updated_at };
}

export function mapStreakState(row: any): StreakState {
  return { id: row.id, userId: row.user_id, currentStreakWeeks: row.current_streak_weeks, tier: row.tier, lastVerifiedWeek: row.last_verified_week, createdAt: row.created_at, updatedAt: row.updated_at };
}

export function mapBoss(row: any): Boss {
  return { id: row.id, userId: row.user_id, muscleGroup: row.muscle_group, name: row.name, tier: row.tier, hpTotal: row.hp_total, hpRemaining: row.hp_remaining, status: row.status, activatedAt: row.activated_at, defeatedAt: row.defeated_at, createdAt: row.created_at, updatedAt: row.updated_at };
}

export function mapMedal(row: any): Medal {
  return { id: row.id, userId: row.user_id, medalKey: row.medal_key, category: row.category, name: row.name, description: row.description, requirementType: row.requirement_type, requirementValue: row.requirement_value, unlockedAt: row.unlocked_at, createdAt: row.created_at, updatedAt: row.updated_at };
}

export function mapPersonalRecord(row: any): PersonalRecord {
  return { id: row.id, userId: row.user_id, exerciseId: row.exercise_id, recordType: row.record_type, value: row.value, previousValue: row.previous_value, achievedAt: row.achieved_at, workoutId: row.workout_id, createdAt: row.created_at, updatedAt: row.updated_at };
}

export function mapNotificationSetting(row: any): NotificationSetting {
  return { id: row.id, userId: row.user_id, notificationType: row.notification_type, enabled: Boolean(row.enabled), scheduledTime: row.scheduled_time, createdAt: row.created_at, updatedAt: row.updated_at };
}

// ============================================================
// XP Formulas
// ============================================================
export function calcXpWeights(difficulty: number, sets: number, reps: number, weightKg: number, streakTier: StreakTier = 0): number {
  const { cw } = getEffectiveCoefficients(streakTier);
  return Math.round(difficulty * sets * reps * weightKg * cw);
}

export function calcXpBodyweight(difficulty: number, sets: number, reps: number, bodyWeightKg: number, ballastKg: number = 0, streakTier: StreakTier = 0): number {
  const { cb } = getEffectiveCoefficients(streakTier);
  return Math.round(difficulty * sets * reps * (bodyWeightKg + ballastKg) * cb);
}

export function calcXpIsometric(difficulty: number, sets: number, seconds: number, bodyWeightKg: number, ballastKg: number = 0, streakTier: StreakTier = 0): number {
  const { cb } = getEffectiveCoefficients(streakTier);
  return Math.round(difficulty * sets * (seconds / 5) * (bodyWeightKg + ballastKg) * cb);
}

export function calcXpCardio(difficulty: number, sets: number, seconds: number, bodyWeightKg: number, streakTier: StreakTier = 0): number {
  const { cb } = getEffectiveCoefficients(streakTier);
  return Math.round(difficulty * sets * (seconds / 60) * bodyWeightKg * cb);
}

export function calcSetXp(category: ExerciseCategory, difficulty: number, reps: number | null, weightKg: number | null, seconds: number | null, ballastKg: number, bodyWeightKg: number, streakTier: StreakTier = 0): number {
  switch (category) {
    case 'pesi': return calcXpWeights(difficulty, 1, reps ?? 0, weightKg ?? 0, streakTier);
    case 'corpo_libero': return calcXpBodyweight(difficulty, 1, reps ?? 0, bodyWeightKg, ballastKg, streakTier);
    case 'isometrico': return calcXpIsometric(difficulty, 1, seconds ?? 0, bodyWeightKg, ballastKg, streakTier);
    case 'cardio': return calcXpCardio(difficulty, 1, seconds ?? 0, bodyWeightKg, streakTier);
    default: return 0;
  }
}

// ============================================================
// Seed Data
// ============================================================
const EXERCISE_SEED: Array<{ name: string; muscleGroup: MuscleGroup; category: ExerciseCategory; difficulty: Difficulty; notes: string }> = [
  // PETTO (18)
  { name: 'Panca piana bilanciere', muscleGroup: 'petto', category: 'pesi', difficulty: 2, notes: '' },
  { name: 'Panca piana manubri', muscleGroup: 'petto', category: 'pesi', difficulty: 2, notes: '' },
  { name: 'Panca inclinata bilanciere', muscleGroup: 'petto', category: 'pesi', difficulty: 2, notes: '' },
  { name: 'Panca inclinata manubri', muscleGroup: 'petto', category: 'pesi', difficulty: 2, notes: '' },
  { name: 'Panca declinata bilanciere', muscleGroup: 'petto', category: 'pesi', difficulty: 2, notes: '' },
  { name: 'Panca declinata manubri', muscleGroup: 'petto', category: 'pesi', difficulty: 2, notes: '' },
  { name: 'Croci manubri panca piana', muscleGroup: 'petto', category: 'pesi', difficulty: 1, notes: '' },
  { name: 'Croci manubri panca inclinata', muscleGroup: 'petto', category: 'pesi', difficulty: 1, notes: '' },
  { name: 'Croci ai cavi', muscleGroup: 'petto', category: 'pesi', difficulty: 1, notes: '' },
  { name: 'Chest press macchina', muscleGroup: 'petto', category: 'pesi', difficulty: 1, notes: '' },
  { name: 'Pec deck / Butterfly', muscleGroup: 'petto', category: 'pesi', difficulty: 1, notes: '' },
  { name: 'Push-up', muscleGroup: 'petto', category: 'corpo_libero', difficulty: 1, notes: '' },
  { name: 'Push-up inclinati', muscleGroup: 'petto', category: 'corpo_libero', difficulty: 1, notes: 'Mani su rialzo' },
  { name: 'Dips', muscleGroup: 'petto', category: 'corpo_libero', difficulty: 2, notes: 'Focus petto, busto inclinato' },
  { name: 'Archer push-up', muscleGroup: 'petto', category: 'corpo_libero', difficulty: 2, notes: 'Calisthenics' },
  { name: 'Pseudo planche push-up', muscleGroup: 'petto', category: 'corpo_libero', difficulty: 3, notes: 'Calisthenics' },
  { name: 'Ring push-up', muscleGroup: 'petto', category: 'corpo_libero', difficulty: 2, notes: 'Calisthenics, anelli' },
  { name: 'Ring dips', muscleGroup: 'petto', category: 'corpo_libero', difficulty: 3, notes: 'Calisthenics, anelli' },
  // SCHIENA (19)
  { name: 'Rematore bilanciere', muscleGroup: 'schiena', category: 'pesi', difficulty: 2, notes: '' },
  { name: 'Rematore manubrio', muscleGroup: 'schiena', category: 'pesi', difficulty: 2, notes: 'Un braccio alla volta' },
  { name: 'Rematore T-bar', muscleGroup: 'schiena', category: 'pesi', difficulty: 2, notes: '' },
  { name: 'Rematore ai cavi (pulley basso)', muscleGroup: 'schiena', category: 'pesi', difficulty: 2, notes: '' },
  { name: 'Lat machine avanti', muscleGroup: 'schiena', category: 'pesi', difficulty: 2, notes: '' },
  { name: 'Lat machine presa stretta', muscleGroup: 'schiena', category: 'pesi', difficulty: 2, notes: '' },
  { name: 'Pullover manubrio', muscleGroup: 'schiena', category: 'pesi', difficulty: 1, notes: '' },
  { name: 'Pulldown ai cavi', muscleGroup: 'schiena', category: 'pesi', difficulty: 1, notes: '' },
  { name: 'Hyperextension', muscleGroup: 'schiena', category: 'corpo_libero', difficulty: 1, notes: '' },
  { name: 'Trazioni presa prona', muscleGroup: 'schiena', category: 'corpo_libero', difficulty: 3, notes: 'Pull-up' },
  { name: 'Trazioni presa supina', muscleGroup: 'schiena', category: 'corpo_libero', difficulty: 3, notes: 'Chin-up' },
  { name: 'Trazioni presa neutra', muscleGroup: 'schiena', category: 'corpo_libero', difficulty: 3, notes: '' },
  { name: 'Australian pull-up', muscleGroup: 'schiena', category: 'corpo_libero', difficulty: 1, notes: 'Body row / inverted row' },
  { name: 'Muscle-up', muscleGroup: 'schiena', category: 'corpo_libero', difficulty: 3, notes: '' },
  { name: 'Dead hang', muscleGroup: 'schiena', category: 'isometrico', difficulty: 1, notes: 'Input in secondi' },
  { name: 'Front lever raise', muscleGroup: 'schiena', category: 'corpo_libero', difficulty: 3, notes: 'Calisthenics' },
  { name: 'Front lever hold', muscleGroup: 'schiena', category: 'isometrico', difficulty: 3, notes: 'Calisthenics, input in secondi' },
  { name: 'Back lever hold', muscleGroup: 'schiena', category: 'isometrico', difficulty: 3, notes: 'Calisthenics, input in secondi' },
  { name: 'Toes to bar', muscleGroup: 'schiena', category: 'corpo_libero', difficulty: 2, notes: 'Calisthenics' },
  // SPALLE (15)
  { name: 'Military press bilanciere', muscleGroup: 'spalle', category: 'pesi', difficulty: 2, notes: 'In piedi' },
  { name: 'Shoulder press manubri', muscleGroup: 'spalle', category: 'pesi', difficulty: 2, notes: 'Seduto' },
  { name: 'Arnold press', muscleGroup: 'spalle', category: 'pesi', difficulty: 2, notes: '' },
  { name: 'Alzate laterali manubri', muscleGroup: 'spalle', category: 'pesi', difficulty: 1, notes: '' },
  { name: 'Alzate laterali ai cavi', muscleGroup: 'spalle', category: 'pesi', difficulty: 1, notes: '' },
  { name: 'Alzate frontali manubri', muscleGroup: 'spalle', category: 'pesi', difficulty: 1, notes: '' },
  { name: 'Rear delt fly manubri', muscleGroup: 'spalle', category: 'pesi', difficulty: 1, notes: '' },
  { name: 'Rear delt ai cavi', muscleGroup: 'spalle', category: 'pesi', difficulty: 1, notes: '' },
  { name: 'Face pull ai cavi', muscleGroup: 'spalle', category: 'pesi', difficulty: 1, notes: '' },
  { name: 'Tirate al mento', muscleGroup: 'spalle', category: 'pesi', difficulty: 2, notes: 'Upright row' },
  { name: 'Shoulder press macchina', muscleGroup: 'spalle', category: 'pesi', difficulty: 1, notes: '' },
  { name: 'Pike push-up', muscleGroup: 'spalle', category: 'corpo_libero', difficulty: 2, notes: '' },
  { name: 'Handstand push-up', muscleGroup: 'spalle', category: 'corpo_libero', difficulty: 3, notes: '' },
  { name: 'Handstand hold', muscleGroup: 'spalle', category: 'isometrico', difficulty: 3, notes: 'Calisthenics, input in secondi' },
  { name: 'L-sit to handstand', muscleGroup: 'spalle', category: 'corpo_libero', difficulty: 3, notes: 'Calisthenics' },
  // BRACCIA (18)
  { name: 'Curl bilanciere dritto', muscleGroup: 'braccia', category: 'pesi', difficulty: 1, notes: '' },
  { name: 'Curl bilanciere EZ', muscleGroup: 'braccia', category: 'pesi', difficulty: 1, notes: '' },
  { name: 'Curl manubri alternati', muscleGroup: 'braccia', category: 'pesi', difficulty: 1, notes: '' },
  { name: 'Curl manubri simultanei', muscleGroup: 'braccia', category: 'pesi', difficulty: 1, notes: '' },
  { name: 'Curl martello', muscleGroup: 'braccia', category: 'pesi', difficulty: 1, notes: 'Hammer curl' },
  { name: 'Curl concentrato', muscleGroup: 'braccia', category: 'pesi', difficulty: 1, notes: '' },
  { name: 'Curl ai cavi', muscleGroup: 'braccia', category: 'pesi', difficulty: 1, notes: '' },
  { name: 'Curl panca Scott', muscleGroup: 'braccia', category: 'pesi', difficulty: 1, notes: 'Preacher curl' },
  { name: 'French press bilanciere', muscleGroup: 'braccia', category: 'pesi', difficulty: 1, notes: '' },
  { name: 'French press manubri', muscleGroup: 'braccia', category: 'pesi', difficulty: 1, notes: '' },
  { name: 'Skull crusher', muscleGroup: 'braccia', category: 'pesi', difficulty: 1, notes: '' },
  { name: 'Tricep pushdown ai cavi', muscleGroup: 'braccia', category: 'pesi', difficulty: 1, notes: '' },
  { name: 'Tricep pushdown corda', muscleGroup: 'braccia', category: 'pesi', difficulty: 1, notes: '' },
  { name: 'Kick-back manubri', muscleGroup: 'braccia', category: 'pesi', difficulty: 1, notes: '' },
  { name: 'Dips stretti', muscleGroup: 'braccia', category: 'corpo_libero', difficulty: 2, notes: 'Focus tricipiti, busto dritto' },
  { name: 'Diamond push-up', muscleGroup: 'braccia', category: 'corpo_libero', difficulty: 2, notes: '' },
  { name: 'Chin-up strette', muscleGroup: 'braccia', category: 'corpo_libero', difficulty: 2, notes: 'Calisthenics, focus bicipiti' },
  { name: 'Pseudo planche lean hold', muscleGroup: 'braccia', category: 'isometrico', difficulty: 2, notes: 'Calisthenics, input in secondi' },
  // GAMBE (25)
  { name: 'Stacco da terra', muscleGroup: 'gambe', category: 'pesi', difficulty: 3, notes: 'Bilanciere' },
  { name: 'Stacco sumo', muscleGroup: 'gambe', category: 'pesi', difficulty: 3, notes: '' },
  { name: 'Squat bilanciere (back squat)', muscleGroup: 'gambe', category: 'pesi', difficulty: 3, notes: '' },
  { name: 'Front squat', muscleGroup: 'gambe', category: 'pesi', difficulty: 3, notes: '' },
  { name: 'Hack squat', muscleGroup: 'gambe', category: 'pesi', difficulty: 2, notes: 'Macchina' },
  { name: 'Leg press', muscleGroup: 'gambe', category: 'pesi', difficulty: 2, notes: '' },
  { name: 'Leg extension', muscleGroup: 'gambe', category: 'pesi', difficulty: 1, notes: '' },
  { name: 'Leg curl sdraiato', muscleGroup: 'gambe', category: 'pesi', difficulty: 1, notes: '' },
  { name: 'Leg curl seduto', muscleGroup: 'gambe', category: 'pesi', difficulty: 1, notes: '' },
  { name: 'Stacco rumeno bilanciere', muscleGroup: 'gambe', category: 'pesi', difficulty: 2, notes: 'Romanian deadlift' },
  { name: 'Stacco rumeno manubri', muscleGroup: 'gambe', category: 'pesi', difficulty: 2, notes: '' },
  { name: 'Hip thrust bilanciere', muscleGroup: 'gambe', category: 'pesi', difficulty: 2, notes: '' },
  { name: 'Affondi bilanciere', muscleGroup: 'gambe', category: 'pesi', difficulty: 2, notes: '' },
  { name: 'Affondi manubri', muscleGroup: 'gambe', category: 'pesi', difficulty: 2, notes: '' },
  { name: 'Bulgarian split squat', muscleGroup: 'gambe', category: 'pesi', difficulty: 2, notes: 'Con manubri' },
  { name: 'Calf raise in piedi', muscleGroup: 'gambe', category: 'pesi', difficulty: 1, notes: '' },
  { name: 'Calf raise seduto', muscleGroup: 'gambe', category: 'pesi', difficulty: 1, notes: '' },
  { name: 'Adductor machine', muscleGroup: 'gambe', category: 'pesi', difficulty: 1, notes: '' },
  { name: 'Abductor machine', muscleGroup: 'gambe', category: 'pesi', difficulty: 1, notes: '' },
  { name: 'Pistol squat', muscleGroup: 'gambe', category: 'corpo_libero', difficulty: 3, notes: '' },
  { name: 'Squat a corpo libero', muscleGroup: 'gambe', category: 'corpo_libero', difficulty: 1, notes: 'Air squat' },
  { name: 'Affondi a corpo libero', muscleGroup: 'gambe', category: 'corpo_libero', difficulty: 1, notes: '' },
  { name: 'Step-up', muscleGroup: 'gambe', category: 'corpo_libero', difficulty: 1, notes: '' },
  { name: 'Jump squat', muscleGroup: 'gambe', category: 'corpo_libero', difficulty: 2, notes: '' },
  { name: 'Wall sit', muscleGroup: 'gambe', category: 'isometrico', difficulty: 1, notes: 'Input in secondi' },
  // CORE (18)
  { name: 'Crunch', muscleGroup: 'core', category: 'corpo_libero', difficulty: 1, notes: '' },
  { name: 'Crunch inverso', muscleGroup: 'core', category: 'corpo_libero', difficulty: 1, notes: '' },
  { name: 'Sit-up', muscleGroup: 'core', category: 'corpo_libero', difficulty: 1, notes: '' },
  { name: 'Russian twist', muscleGroup: 'core', category: 'corpo_libero', difficulty: 1, notes: 'Con o senza peso' },
  { name: 'Mountain climber', muscleGroup: 'core', category: 'corpo_libero', difficulty: 1, notes: 'Reps = passi totali' },
  { name: 'Bicycle crunch', muscleGroup: 'core', category: 'corpo_libero', difficulty: 1, notes: '' },
  { name: 'Leg raise a terra', muscleGroup: 'core', category: 'corpo_libero', difficulty: 1, notes: '' },
  { name: 'Hanging leg raise', muscleGroup: 'core', category: 'corpo_libero', difficulty: 2, notes: 'Alla sbarra' },
  { name: 'Knee raise alla sbarra', muscleGroup: 'core', category: 'corpo_libero', difficulty: 1, notes: '' },
  { name: 'V-up', muscleGroup: 'core', category: 'corpo_libero', difficulty: 2, notes: '' },
  { name: 'Ab wheel rollout', muscleGroup: 'core', category: 'corpo_libero', difficulty: 2, notes: '' },
  { name: 'Dragon flag', muscleGroup: 'core', category: 'corpo_libero', difficulty: 3, notes: '' },
  { name: 'Crunch ai cavi', muscleGroup: 'core', category: 'pesi', difficulty: 1, notes: 'Cable crunch' },
  { name: 'Wood chop ai cavi', muscleGroup: 'core', category: 'pesi', difficulty: 1, notes: '' },
  { name: 'Pallof press ai cavi', muscleGroup: 'core', category: 'pesi', difficulty: 1, notes: 'Anti-rotazione' },
  { name: 'Plank', muscleGroup: 'core', category: 'isometrico', difficulty: 1, notes: 'Input in secondi' },
  { name: 'Side plank', muscleGroup: 'core', category: 'isometrico', difficulty: 1, notes: 'Input in secondi' },
  { name: 'L-sit', muscleGroup: 'core', category: 'isometrico', difficulty: 2, notes: 'Input in secondi' },
  // CARDIO (11)
  { name: 'Corsa', muscleGroup: 'cardio', category: 'cardio', difficulty: 2, notes: 'Input in minuti' },
  { name: 'Camminata veloce', muscleGroup: 'cardio', category: 'cardio', difficulty: 1, notes: 'Input in minuti' },
  { name: 'Bici (cyclette)', muscleGroup: 'cardio', category: 'cardio', difficulty: 1, notes: 'Input in minuti' },
  { name: 'Bici da strada', muscleGroup: 'cardio', category: 'cardio', difficulty: 2, notes: 'Input in minuti' },
  { name: 'Ellittica', muscleGroup: 'cardio', category: 'cardio', difficulty: 1, notes: 'Input in minuti' },
  { name: 'Vogatore (rowing)', muscleGroup: 'cardio', category: 'cardio', difficulty: 2, notes: 'Input in minuti' },
  { name: 'Corda', muscleGroup: 'cardio', category: 'cardio', difficulty: 1, notes: 'Salto della corda, input minuti' },
  { name: 'Nuoto', muscleGroup: 'cardio', category: 'cardio', difficulty: 2, notes: 'Input in minuti' },
  { name: 'HIIT generico', muscleGroup: 'cardio', category: 'cardio', difficulty: 2, notes: 'Input in minuti' },
  { name: 'StairMaster / scale', muscleGroup: 'cardio', category: 'cardio', difficulty: 2, notes: 'Input in minuti' },
  { name: 'Sprint intervallati', muscleGroup: 'cardio', category: 'cardio', difficulty: 2, notes: 'Input in minuti' },
];

const MOBILITY_SEED: Array<{ name: string; zoneTarget: string; type: MobilityExerciseType; suggestedDurationSec: number; notes: string }> = [
  { name: 'Apertura pettorali al muro', zoneTarget: 'Petto / Spalle', type: 'stretching', suggestedDurationSec: 30, notes: 'Un braccio alla volta' },
  { name: 'Stretching pettorali a terra', zoneTarget: 'Petto / Spalle', type: 'stretching', suggestedDurationSec: 30, notes: 'Supino, braccia aperte' },
  { name: 'Stretching deltoide posteriore', zoneTarget: 'Spalle', type: 'stretching', suggestedDurationSec: 30, notes: 'Cross-body shoulder stretch' },
  { name: 'Dislocazioni con bastone', zoneTarget: 'Spalle', type: 'mobilita', suggestedDurationSec: 45, notes: 'Passover, lento e controllato' },
  { name: 'Rotazioni esterne con elastico', zoneTarget: 'Spalle', type: 'mobilita', suggestedDurationSec: 30, notes: '' },
  { name: 'Rotazioni interne con elastico', zoneTarget: 'Spalle', type: 'mobilita', suggestedDurationSec: 30, notes: '' },
  { name: 'Wall slide', zoneTarget: 'Spalle / Schiena', type: 'mobilita', suggestedDurationSec: 30, notes: 'Scapole a contatto col muro' },
  { name: 'Cat-cow', zoneTarget: 'Schiena', type: 'mobilita', suggestedDurationSec: 45, notes: 'Alternare flessione/estensione' },
  { name: "Child's pose", zoneTarget: 'Schiena', type: 'stretching', suggestedDurationSec: 30, notes: '' },
  { name: 'Stretching dorsali al muro', zoneTarget: 'Schiena', type: 'stretching', suggestedDurationSec: 30, notes: '' },
  { name: 'Foam roller toracico', zoneTarget: 'Schiena', type: 'mobilita', suggestedDurationSec: 60, notes: 'Rotolamento avanti-indietro' },
  { name: 'Thread the needle', zoneTarget: 'Schiena', type: 'mobilita', suggestedDurationSec: 30, notes: 'Per lato' },
  { name: 'Stretching bicipiti al muro', zoneTarget: 'Braccia', type: 'stretching', suggestedDurationSec: 30, notes: '' },
  { name: 'Stretching tricipiti overhead', zoneTarget: 'Braccia', type: 'stretching', suggestedDurationSec: 30, notes: '' },
  { name: 'Stretching flessori polso', zoneTarget: 'Braccia / Polsi', type: 'stretching', suggestedDurationSec: 30, notes: 'A terra, dita verso le ginocchia' },
  { name: 'Stretching estensori polso', zoneTarget: 'Braccia / Polsi', type: 'stretching', suggestedDurationSec: 30, notes: '' },
  { name: 'Rotazioni cervicali', zoneTarget: 'Collo', type: 'mobilita', suggestedDurationSec: 30, notes: 'Lente, cerchi completi' },
  { name: 'Stretching trapezio laterale', zoneTarget: 'Collo', type: 'stretching', suggestedDurationSec: 30, notes: 'Orecchio verso spalla' },
  { name: 'Stretching addominali (cobra)', zoneTarget: 'Core', type: 'stretching', suggestedDurationSec: 30, notes: '' },
  { name: 'Stretching psoas in affondo', zoneTarget: 'Core / Anche', type: 'stretching', suggestedDurationSec: 30, notes: 'Ginocchio a terra, per lato' },
  { name: '90/90 hip switch', zoneTarget: 'Anche', type: 'mobilita', suggestedDurationSec: 45, notes: 'Alternare posizione seduta' },
  { name: 'Rotazioni interne anca a terra', zoneTarget: 'Anche', type: 'mobilita', suggestedDurationSec: 30, notes: 'Per lato' },
  { name: 'Rotazioni esterne anca a terra', zoneTarget: 'Anche', type: 'mobilita', suggestedDurationSec: 30, notes: 'Per lato' },
  { name: 'Pigeon stretch', zoneTarget: 'Anche', type: 'stretching', suggestedDurationSec: 30, notes: 'Per lato' },
  { name: 'Frog stretch', zoneTarget: 'Anche', type: 'stretching', suggestedDurationSec: 30, notes: 'Ginocchia larghe a terra' },
  { name: 'Butterfly stretch', zoneTarget: 'Anche', type: 'stretching', suggestedDurationSec: 30, notes: 'Seduto, piante dei piedi unite' },
  { name: 'Stretching quadricipiti in piedi', zoneTarget: 'Gambe', type: 'stretching', suggestedDurationSec: 30, notes: 'Tallone al gluteo, per lato' },
  { name: 'Stretching quadricipiti couch stretch', zoneTarget: 'Gambe', type: 'stretching', suggestedDurationSec: 30, notes: 'Contro un muro, per lato' },
  { name: 'Stretching femorali in piedi', zoneTarget: 'Gambe', type: 'stretching', suggestedDurationSec: 30, notes: 'Gamba su rialzo, per lato' },
  { name: 'Stretching femorali a terra', zoneTarget: 'Gambe', type: 'stretching', suggestedDurationSec: 30, notes: 'Supino con elastico o mani' },
  { name: 'Stretching polpacci al muro', zoneTarget: 'Gambe', type: 'stretching', suggestedDurationSec: 30, notes: 'Per lato' },
  { name: 'Stretching polpacci su scalino', zoneTarget: 'Gambe', type: 'stretching', suggestedDurationSec: 30, notes: '' },
  { name: 'Stretching adduttori in piedi', zoneTarget: 'Gambe', type: 'stretching', suggestedDurationSec: 30, notes: 'Squat laterale' },
  { name: 'Foam roller quadricipiti', zoneTarget: 'Gambe', type: 'mobilita', suggestedDurationSec: 60, notes: '' },
  { name: 'Foam roller IT band', zoneTarget: 'Gambe', type: 'mobilita', suggestedDurationSec: 60, notes: '' },
  { name: 'Foam roller polpacci', zoneTarget: 'Gambe', type: 'mobilita', suggestedDurationSec: 45, notes: '' },
  { name: 'Rotazioni caviglia', zoneTarget: 'Caviglie', type: 'mobilita', suggestedDurationSec: 30, notes: 'Cerchi, per lato' },
  { name: 'Dorsiflessione caviglia al muro', zoneTarget: 'Caviglie', type: 'mobilita', suggestedDurationSec: 30, notes: 'Ginocchio verso muro, per lato' },
  { name: "World's greatest stretch", zoneTarget: 'Full body', type: 'mobilita', suggestedDurationSec: 60, notes: 'Combo: affondo + rotazione + reach' },
  { name: 'Inchworm', zoneTarget: 'Full body', type: 'mobilita', suggestedDurationSec: 45, notes: 'Walk-out e ritorno' },
  { name: 'Down dog to up dog', zoneTarget: 'Full body', type: 'mobilita', suggestedDurationSec: 45, notes: 'Flusso yoga' },
  { name: 'Deep squat hold', zoneTarget: 'Full body', type: 'mobilita', suggestedDurationSec: 45, notes: 'Accosciata profonda' },
  { name: 'Jefferson curl', zoneTarget: 'Full body', type: 'mobilita', suggestedDurationSec: 45, notes: 'Solo a corpo libero, lento' },
  { name: 'Scorpion stretch', zoneTarget: 'Full body', type: 'stretching', suggestedDurationSec: 30, notes: 'Prono, gamba oltre il corpo' },
];

const BOSS_SEED: Array<{ muscleGroup: MuscleGroup; name: string; tier: BossTier }> = [
  { muscleGroup: 'petto', name: "Sentinella d'Acciaio", tier: 1 }, { muscleGroup: 'petto', name: 'Martello Cremisi', tier: 2 }, { muscleGroup: 'petto', name: 'Colosso di Ferro', tier: 3 }, { muscleGroup: 'petto', name: 'Drago Corazzato', tier: 4 }, { muscleGroup: 'petto', name: 'Vulcano Eterno', tier: 5 },
  { muscleGroup: 'schiena', name: 'Ombra Profonda', tier: 1 }, { muscleGroup: 'schiena', name: 'Kraken Abissale', tier: 2 }, { muscleGroup: 'schiena', name: 'Serpente di Pietra', tier: 3 }, { muscleGroup: 'schiena', name: 'Idra delle Tempeste', tier: 4 }, { muscleGroup: 'schiena', name: 'Titano Sommerso', tier: 5 },
  { muscleGroup: 'spalle', name: 'Guardiano dei Cieli', tier: 1 }, { muscleGroup: 'spalle', name: 'Falco Tonante', tier: 2 }, { muscleGroup: 'spalle', name: 'Atlante Spezzato', tier: 3 }, { muscleGroup: 'spalle', name: "Fenice d'Ametista", tier: 4 }, { muscleGroup: 'spalle', name: 'Signore dei Venti', tier: 5 },
  { muscleGroup: 'braccia', name: 'Golem di Bronzo', tier: 1 }, { muscleGroup: 'braccia', name: 'Gladiatore Dorato', tier: 2 }, { muscleGroup: 'braccia', name: 'Minotauro Furioso', tier: 3 }, { muscleGroup: 'braccia', name: 'Ciclope Forgiatore', tier: 4 }, { muscleGroup: 'braccia', name: 'Eracle Redivivo', tier: 5 },
  { muscleGroup: 'gambe', name: 'Toro Selvaggio', tier: 1 }, { muscleGroup: 'gambe', name: "Centauro d'Ossidiana", tier: 2 }, { muscleGroup: 'gambe', name: 'Behemoth Sismico', tier: 3 }, { muscleGroup: 'gambe', name: 'Wyrm Sotterraneo', tier: 4 }, { muscleGroup: 'gambe', name: 'Gaia Risvegliata', tier: 5 },
  { muscleGroup: 'core', name: 'Nucleo Instabile', tier: 1 }, { muscleGroup: 'core', name: 'Sfinge di Giada', tier: 2 }, { muscleGroup: 'core', name: 'Leviatano Astrale', tier: 3 }, { muscleGroup: 'core', name: 'Oracolo Oscuro', tier: 4 }, { muscleGroup: 'core', name: 'Anima del Vuoto', tier: 5 },
  { muscleGroup: 'cardio', name: "Lupo d'Ombra", tier: 1 }, { muscleGroup: 'cardio', name: 'Chimera Ardente', tier: 2 }, { muscleGroup: 'cardio', name: 'Fenrir Instancabile', tier: 3 }, { muscleGroup: 'cardio', name: 'Maelstrom Vivente', tier: 4 }, { muscleGroup: 'cardio', name: 'Crono il Divoratore', tier: 5 },
];

const MEDAL_SEED: Array<{ medalKey: string; category: MedalCategory; name: string; description: string; requirementType: string; requirementValue: number }> = [
  { medalKey: 'prima_tonnellata', category: 'volume', name: 'Prima Tonnellata', description: '1.000 kg sollevati', requirementType: 'total_kg', requirementValue: 1000 },
  { medalKey: 'cinque_tonnellate', category: 'volume', name: 'Cinque Tonnellate', description: '5.000 kg sollevati', requirementType: 'total_kg', requirementValue: 5000 },
  { medalKey: 'dieci_tonnellate', category: 'volume', name: 'Dieci Tonnellate', description: '10.000 kg sollevati', requirementType: 'total_kg', requirementValue: 10000 },
  { medalKey: 'cinquanta_tonnellate', category: 'volume', name: 'Cinquanta Tonnellate', description: '50.000 kg sollevati', requirementType: 'total_kg', requirementValue: 50000 },
  { medalKey: 'centomila', category: 'volume', name: 'Centomila', description: '100.000 kg sollevati', requirementType: 'total_kg', requirementValue: 100000 },
  { medalKey: 'mille_rep', category: 'volume', name: 'Mille Rep', description: '1.000 reps totali', requirementType: 'total_reps', requirementValue: 1000 },
  { medalKey: 'diecimila_rep', category: 'volume', name: 'Diecimila Rep', description: '10.000 reps totali', requirementType: 'total_reps', requirementValue: 10000 },
  { medalKey: 'cinquantamila_rep', category: 'volume', name: 'Cinquantamila Rep', description: '50.000 reps totali', requirementType: 'total_reps', requirementValue: 50000 },
  { medalKey: 'maratoneta', category: 'volume', name: 'Maratoneta', description: '10 ore di cardio', requirementType: 'total_cardio_hours', requirementValue: 10 },
  { medalKey: 'primo_passo', category: 'costanza', name: 'Primo Passo', description: 'Primo workout completato', requirementType: 'total_workouts', requirementValue: 1 },
  { medalKey: 'settimana_perfetta', category: 'costanza', name: 'Settimana Perfetta', description: 'Streak Tier 1 raggiunto', requirementType: 'streak_weeks', requirementValue: 1 },
  { medalKey: 'mese_acciaio', category: 'costanza', name: "Mese d'Acciaio", description: 'Streak di 4 settimane', requirementType: 'streak_weeks', requirementValue: 4 },
  { medalKey: 'trimestre_ferro', category: 'costanza', name: 'Trimestre di Ferro', description: 'Streak di 12 settimane', requirementType: 'streak_weeks', requirementValue: 12 },
  { medalKey: 'semestre_oro', category: 'costanza', name: "Semestre d'Oro", description: 'Streak di 26 settimane', requirementType: 'streak_weeks', requirementValue: 26 },
  { medalKey: 'anno_fuoco', category: 'costanza', name: 'Un Anno di Fuoco', description: 'Streak di 52 settimane', requirementType: 'streak_weeks', requirementValue: 52 },
  { medalKey: 'centurione', category: 'costanza', name: 'Centurione', description: '100 workout completati', requirementType: 'total_workouts', requirementValue: 100 },
  { medalKey: 'mezzo_migliaio', category: 'costanza', name: 'Mezzo Migliaio', description: '500 workout completati', requirementType: 'total_workouts', requirementValue: 500 },
  { medalKey: 'prima_volta', category: 'pr', name: 'Prima Volta', description: 'Primo PR registrato', requirementType: 'total_pr', requirementValue: 1 },
  { medalKey: 'dieci_primati', category: 'pr', name: 'Dieci Primati', description: '10 PR registrati', requirementType: 'total_pr', requirementValue: 10 },
  { medalKey: 'venticinque_primati', category: 'pr', name: 'Venticinque Primati', description: '25 PR registrati', requirementType: 'total_pr', requirementValue: 25 },
  { medalKey: 'cinquanta_primati', category: 'pr', name: 'Cinquanta Primati', description: '50 PR registrati', requirementType: 'total_pr', requirementValue: 50 },
  { medalKey: 'cento_primati', category: 'pr', name: 'Cento Primati', description: '100 PR registrati', requirementType: 'total_pr', requirementValue: 100 },
  { medalKey: 'curioso', category: 'esplorazione', name: 'Curioso', description: '10 esercizi diversi provati', requirementType: 'exercises_tried', requirementValue: 10 },
  { medalKey: 'esploratore', category: 'esplorazione', name: 'Esploratore', description: '25 esercizi diversi provati', requirementType: 'exercises_tried', requirementValue: 25 },
  { medalKey: 'enciclopedia', category: 'esplorazione', name: 'Enciclopedia', description: '50 esercizi diversi provati', requirementType: 'exercises_tried', requirementValue: 50 },
  { medalKey: 'equilibrio_perfetto', category: 'esplorazione', name: 'Equilibrio Perfetto', description: '7 gruppi in una settimana', requirementType: 'all_groups_week', requirementValue: 7 },
  { medalKey: 'versatile', category: 'esplorazione', name: 'Versatile', description: '4 categorie in una sessione', requirementType: 'all_categories_session', requirementValue: 4 },
  { medalKey: 'luce_argento', category: 'ranghi', name: "Luce d'Argento", description: 'Primo gruppo in fascia Argento', requirementType: 'rank_band_any', requirementValue: 4 },
  { medalKey: 'tocco_oro', category: 'ranghi', name: "Tocco d'Oro", description: 'Primo gruppo in fascia Oro', requirementType: 'rank_band_any', requirementValue: 7 },
  { medalKey: 'spirito_giada', category: 'ranghi', name: 'Spirito di Giada', description: 'Primo gruppo in fascia Giada', requirementType: 'rank_band_any', requirementValue: 10 },
  { medalKey: 'forgia_platino', category: 'ranghi', name: 'Forgia di Platino', description: 'Primo gruppo in fascia Platino', requirementType: 'rank_band_any', requirementValue: 13 },
  { medalKey: 'cuore_diamante', category: 'ranghi', name: 'Cuore di Diamante', description: 'Primo gruppo in fascia Diamante', requirementType: 'rank_band_any', requirementValue: 16 },
  { medalKey: 'armonia_bronzo', category: 'ranghi', name: 'Armonia di Bronzo', description: 'Tutti i gruppi almeno Bronzo 3', requirementType: 'rank_band_all', requirementValue: 3 },
  { medalKey: 'armonia_argento', category: 'ranghi', name: "Armonia d'Argento", description: 'Tutti i gruppi almeno Argento 3', requirementType: 'rank_band_all', requirementValue: 6 },
  { medalKey: 'armonia_oro', category: 'ranghi', name: "Armonia d'Oro", description: 'Tutti i gruppi almeno Oro 3', requirementType: 'rank_band_all', requirementValue: 9 },
  { medalKey: 'leggenda_vivente', category: 'ranghi', name: 'Leggenda Vivente', description: 'Tutti i gruppi a Diamante 3', requirementType: 'rank_band_all', requirementValue: 18 },
  { medalKey: 'club_100', category: 'sfide', name: 'Club dei 100', description: 'Panca piana 100+ kg', requirementType: 'bench_press_kg', requirementValue: 100 },
  { medalKey: 'doppio_corpo', category: 'sfide', name: 'Doppio Corpo', description: 'Squat >= 2x peso corporeo', requirementType: 'squat_bw_ratio', requirementValue: 2.0 },
  { medalKey: 'volo_libero', category: 'sfide', name: 'Volo Libero', description: '20+ trazioni in una serie', requirementType: 'pullup_reps', requirementValue: 20 },
  { medalKey: 'plank_eterno', category: 'sfide', name: 'Plank Eterno', description: 'Plank 300+ secondi', requirementType: 'plank_seconds', requirementValue: 300 },
  { medalKey: 'guerriero_mattino', category: 'sfide', name: 'Guerriero del Mattino', description: 'Workout prima delle 7:00', requirementType: 'workout_before_hour', requirementValue: 7 },
  { medalKey: 'sessione_titanica', category: 'sfide', name: 'Sessione Titanica', description: '3.000+ XP in un workout', requirementType: 'workout_xp', requirementValue: 3000 },
  { medalKey: 'settimana_record', category: 'sfide', name: 'Settimana da Record', description: '3+ PR in una settimana', requirementType: 'weekly_pr', requirementValue: 3 },
  { medalKey: 'primo_respiro', category: 'mobilita', name: 'Primo Respiro', description: 'Prima sessione mobilita completata', requirementType: 'zen_sessions', requirementValue: 1 },
  { medalKey: 'monaco_zen', category: 'mobilita', name: 'Monaco Zen', description: '30 punti zen accumulati', requirementType: 'total_zen', requirementValue: 30 },
  { medalKey: 'maestro_zen', category: 'mobilita', name: 'Maestro Zen', description: '100 punti zen accumulati', requirementType: 'total_zen', requirementValue: 100 },
  { medalKey: 'illuminato', category: 'mobilita', name: 'Illuminato', description: '300 punti zen accumulati', requirementType: 'total_zen', requirementValue: 300 },
];

// ============================================================
// Initialization
// ============================================================
export async function initializeDatabase(): Promise<void> {
  const database = await getDatabase();
  await database.execAsync(SCHEMA_SQL);

  // Cleanup duplicate exercises BEFORE creating unique index (fixes existing DBs)
  // First, reassign workout_exercises references from duplicates to the kept copy
  await database.runAsync(
    `UPDATE workout_exercises SET exercise_id = (
      SELECT MIN(e2.id) FROM exercises e2 WHERE e2.name = (
        SELECT e3.name FROM exercises e3 WHERE e3.id = workout_exercises.exercise_id
      )
    ) WHERE exercise_id NOT IN (
      SELECT MIN(id) FROM exercises GROUP BY name
    )`
  );
  // Now safe to delete duplicates
  await database.runAsync(
    `DELETE FROM exercises WHERE id NOT IN (
      SELECT MIN(id) FROM exercises GROUP BY name
    )`
  );
  await database.execAsync('CREATE UNIQUE INDEX IF NOT EXISTS idx_exercises_name ON exercises(name)');

  const profileRows = await database.getAllAsync('SELECT id FROM user_profile LIMIT 1');
  if (profileRows.length > 0) return;

  const timestamp = now();
  const userId = generateId();

  await database.runAsync(
    `INSERT INTO user_profile (id, username, body_weight_kg, weekly_workout_goal, total_zen_points, total_workouts, total_kg_lifted, total_reps, total_cardio_seconds, total_pr_count, total_exercises_tried, created_at, updated_at) VALUES (?, ?, ?, ?, 0, 0, 0, 0, 0, 0, 0, ?, ?)`,
    [userId, 'Guerriero', 75, 4, timestamp, timestamp]
  );

  for (const ex of EXERCISE_SEED) {
    await database.runAsync(`INSERT OR IGNORE INTO exercises (id, name, muscle_group, category, difficulty, notes, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, [generateId(), ex.name, ex.muscleGroup, ex.category, ex.difficulty, ex.notes, timestamp, timestamp]);
  }

  for (const mob of MOBILITY_SEED) {
    await database.runAsync(`INSERT INTO mobility_exercises (id, name, zone_target, type, suggested_duration_sec, notes, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, [generateId(), mob.name, mob.zoneTarget, mob.type, mob.suggestedDurationSec, mob.notes, timestamp, timestamp]);
  }

  const muscleGroups: MuscleGroup[] = ['petto', 'schiena', 'spalle', 'braccia', 'gambe', 'core', 'cardio'];
  for (const mg of muscleGroups) {
    await database.runAsync(`INSERT INTO muscle_group_progress (id, user_id, muscle_group, rank_level, current_xp, total_xp, created_at, updated_at) VALUES (?, ?, ?, 1, 0, 0, ?, ?)`, [generateId(), userId, mg, timestamp, timestamp]);
  }

  await database.runAsync(`INSERT INTO streak_state (id, user_id, current_streak_weeks, tier, last_verified_week, created_at, updated_at) VALUES (?, ?, 0, 0, NULL, ?, ?)`, [generateId(), userId, timestamp, timestamp]);

  for (const boss of BOSS_SEED) {
    const hp = BOSS_HP[boss.tier];
    const status: BossStatus = 'dormant';
    const activatedAt = null;
    await database.runAsync(`INSERT INTO bosses (id, user_id, muscle_group, name, tier, hp_total, hp_remaining, status, activated_at, defeated_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?)`, [generateId(), userId, boss.muscleGroup, boss.name, boss.tier, hp, hp, status, activatedAt, timestamp, timestamp]);
  }

  for (const medal of MEDAL_SEED) {
    await database.runAsync(`INSERT INTO medals (id, user_id, medal_key, category, name, description, requirement_type, requirement_value, unlocked_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?)`, [generateId(), userId, medal.medalKey, medal.category, medal.name, medal.description, medal.requirementType, medal.requirementValue, timestamp, timestamp]);
  }

  const notificationDefaults: Array<{ type: NotificationType; time: string }> = [
    { type: 'workout_reminder', time: '10:30' }, { type: 'urgent_reminder', time: '18:00' },
    { type: 'mobility_rest_day', time: '10:30' }, { type: 'weekly_recap', time: '20:00' },
  ];
  for (const notif of notificationDefaults) {
    await database.runAsync(`INSERT INTO notification_settings (id, user_id, notification_type, enabled, scheduled_time, created_at, updated_at) VALUES (?, ?, ?, 1, ?, ?, ?)`, [generateId(), userId, notif.type, notif.time, timestamp, timestamp]);
  }
}

// ============================================================
// Queries
// ============================================================
export async function getOrCreateProfile(): Promise<UserProfile> {
  const database = await getDatabase();
  await initializeDatabase();
  const rows = await database.getAllAsync('SELECT * FROM user_profile LIMIT 1');
  if (rows.length === 0) throw new Error('Profile not found');
  return mapUserProfile(rows[0]);
}

export async function updateProfile(updates: Partial<Pick<UserProfile, 'username' | 'bodyWeightKg' | 'weeklyWorkoutGoal'>>): Promise<void> {
  const database = await getDatabase();
  const sets: string[] = [];
  const values: any[] = [];
  if (updates.username !== undefined) { sets.push('username = ?'); values.push(updates.username); }
  if (updates.bodyWeightKg !== undefined) { sets.push('body_weight_kg = ?'); values.push(updates.bodyWeightKg); }
  if (updates.weeklyWorkoutGoal !== undefined) { sets.push('weekly_workout_goal = ?'); values.push(updates.weeklyWorkoutGoal); }
  if (sets.length === 0) return;
  sets.push('updated_at = ?'); values.push(now());
  await database.runAsync(`UPDATE user_profile SET ${sets.join(', ')}`, values);
}

export async function getAllExercises(): Promise<Exercise[]> {
  const database = await getDatabase();
  const rows = await database.getAllAsync('SELECT * FROM exercises ORDER BY muscle_group, name');
  return rows.map(mapExercise);
}

export async function searchExercises(query: string, muscleGroup?: MuscleGroup, category?: ExerciseCategory): Promise<Exercise[]> {
  const database = await getDatabase();
  let sql = 'SELECT * FROM exercises WHERE 1=1';
  const params: any[] = [];
  if (query) { sql += ' AND name LIKE ?'; params.push(`%${query}%`); }
  if (muscleGroup) { sql += ' AND muscle_group = ?'; params.push(muscleGroup); }
  if (category) { sql += ' AND category = ?'; params.push(category); }
  sql += ' ORDER BY muscle_group, name';
  const rows = await database.getAllAsync(sql, params);
  return rows.map(mapExercise);
}

export async function getAllMuscleGroupProgress(userId: string): Promise<MuscleGroupProgress[]> {
  const database = await getDatabase();
  const rows = await database.getAllAsync('SELECT * FROM muscle_group_progress WHERE user_id = ? ORDER BY muscle_group', [userId]);
  return rows.map(mapMuscleGroupProgress);
}

export async function getActiveBosses(userId: string): Promise<Boss[]> {
  const database = await getDatabase();
  const rows = await database.getAllAsync("SELECT * FROM bosses WHERE user_id = ? AND status = 'active' ORDER BY muscle_group", [userId]);
  return rows.map(mapBoss);
}

export async function getAllBosses(userId: string): Promise<Boss[]> {
  const database = await getDatabase();
  const rows = await database.getAllAsync('SELECT * FROM bosses WHERE user_id = ? ORDER BY muscle_group, tier', [userId]);
  return rows.map(mapBoss);
}

export async function getStreakState(userId: string): Promise<StreakState | null> {
  const database = await getDatabase();
  const rows = await database.getAllAsync('SELECT * FROM streak_state WHERE user_id = ?', [userId]);
  return rows.length > 0 ? mapStreakState(rows[0]) : null;
}

export async function getAllMedals(userId: string): Promise<Medal[]> {
  const database = await getDatabase();
  const rows = await database.getAllAsync('SELECT * FROM medals WHERE user_id = ? ORDER BY category, medal_key', [userId]);
  return rows.map(mapMedal);
}

export async function getAllMobilityExercises(): Promise<MobilityExercise[]> {
  const database = await getDatabase();
  const rows = await database.getAllAsync('SELECT * FROM mobility_exercises ORDER BY zone_target, name');
  return rows.map(mapMobilityExercise);
}

export async function getNotificationSettings(userId: string): Promise<NotificationSetting[]> {
  const database = await getDatabase();
  const rows = await database.getAllAsync('SELECT * FROM notification_settings WHERE user_id = ? ORDER BY notification_type', [userId]);
  return rows.map(mapNotificationSetting);
}

export async function getWorkoutsForWeek(userId: string, start: string, end: string): Promise<Workout[]> {
  const database = await getDatabase();
  const rows = await database.getAllAsync('SELECT * FROM workouts WHERE user_id = ? AND date >= ? AND date <= ? ORDER BY date', [userId, start, end]);
  return rows.map(mapWorkout);
}

// ============================================================
// Phase 2 — Workout CRUD
// ============================================================

export async function createWorkout(userId: string): Promise<Workout> {
  const database = await getDatabase();
  const id = Crypto.randomUUID();
  const now = new Date().toISOString();
  const date = now.split('T')[0];
  await database.runAsync(
    'INSERT INTO workouts (id, user_id, date, total_xp, started_at, created_at, updated_at) VALUES (?, ?, ?, 0, ?, ?, ?)',
    [id, userId, date, now, now, now],
  );
  return { id, userId, date, totalXp: 0, startedAt: now, completedAt: null, createdAt: now, updatedAt: now };
}

export async function addWorkoutExercise(workoutId: string, exerciseId: string, orderIndex: number): Promise<WorkoutExercise> {
  const database = await getDatabase();
  const id = Crypto.randomUUID();
  const now = new Date().toISOString();
  await database.runAsync(
    'INSERT INTO workout_exercises (id, workout_id, exercise_id, order_index, xp_earned, created_at, updated_at) VALUES (?, ?, ?, ?, 0, ?, ?)',
    [id, workoutId, exerciseId, orderIndex, now, now],
  );
  return { id, workoutId, exerciseId, orderIndex, xpEarned: 0, createdAt: now, updatedAt: now };
}

export async function addExerciseSet(
  workoutExerciseId: string, setNumber: number,
  reps: number | null, weightKg: number | null, seconds: number | null, ballastKg: number,
): Promise<ExerciseSet> {
  const database = await getDatabase();
  const id = Crypto.randomUUID();
  const now = new Date().toISOString();
  await database.runAsync(
    'INSERT INTO exercise_sets (id, workout_exercise_id, set_number, reps, weight_kg, seconds, ballast_kg, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [id, workoutExerciseId, setNumber, reps, weightKg, seconds, ballastKg, now, now],
  );
  return { id, workoutExerciseId, setNumber, reps, weightKg, seconds, ballastKg, createdAt: now, updatedAt: now };
}

export async function updateWorkoutExerciseXp(workoutExerciseId: string, xpEarned: number): Promise<void> {
  const database = await getDatabase();
  const now = new Date().toISOString();
  await database.runAsync('UPDATE workout_exercises SET xp_earned = ?, updated_at = ? WHERE id = ?', [xpEarned, now, workoutExerciseId]);
}

export async function countNewExercises(userId: string, exerciseIds: string[], currentWorkoutId: string): Promise<number> {
  if (exerciseIds.length === 0) return 0;
  const database = await getDatabase();
  const placeholders = exerciseIds.map(() => '?').join(',');
  const rows = await database.getAllAsync(
    `SELECT DISTINCT we.exercise_id FROM workout_exercises we
     JOIN workouts w ON we.workout_id = w.id
     WHERE w.user_id = ? AND w.id != ? AND we.exercise_id IN (${placeholders})`,
    [userId, currentWorkoutId, ...exerciseIds],
  ) as any[];
  const alreadyTried = new Set(rows.map((r: any) => r.exercise_id));
  return exerciseIds.filter((id) => !alreadyTried.has(id)).length;
}

export async function deleteWorkout(workoutId: string): Promise<void> {
  const database = await getDatabase();
  await database.runAsync('DELETE FROM workouts WHERE id = ?', [workoutId]);
}

export async function completeWorkout(workoutId: string, totalXp: number): Promise<void> {
  const database = await getDatabase();
  const now = new Date().toISOString();
  await database.runAsync('UPDATE workouts SET total_xp = ?, completed_at = ?, updated_at = ? WHERE id = ?', [totalXp, now, now, workoutId]);
}

export async function updateMuscleGroupXp(userId: string, muscleGroup: MuscleGroup, xpToAdd: number): Promise<void> {
  const database = await getDatabase();
  const now = new Date().toISOString();
  await database.runAsync(
    'UPDATE muscle_group_progress SET current_xp = current_xp + ?, total_xp = total_xp + ?, updated_at = ? WHERE user_id = ? AND muscle_group = ?',
    [xpToAdd, xpToAdd, now, userId, muscleGroup],
  );
}

export async function updateProfileCounters(
  userId: string,
  counters: { kgLifted?: number; reps?: number; cardioSeconds?: number; exercisesTried?: number },
): Promise<void> {
  const database = await getDatabase();
  const now = new Date().toISOString();
  const parts: string[] = ['updated_at = ?'];
  const values: any[] = [now];
  // Zen points are updated ONLY via completeMobilitySession(), not here
  if (counters.kgLifted) { parts.push('total_kg_lifted = total_kg_lifted + ?'); values.push(counters.kgLifted); }
  if (counters.reps) { parts.push('total_reps = total_reps + ?'); values.push(counters.reps); }
  if (counters.cardioSeconds) { parts.push('total_cardio_seconds = total_cardio_seconds + ?'); values.push(counters.cardioSeconds); }
  if (counters.exercisesTried) { parts.push('total_exercises_tried = total_exercises_tried + ?'); values.push(counters.exercisesTried); }
  values.push(userId);
  await database.runAsync(`UPDATE user_profile SET ${parts.join(', ')} WHERE id = ?`, values);
}

export async function incrementTotalWorkouts(userId: string): Promise<void> {
  const database = await getDatabase();
  const now = new Date().toISOString();
  await database.runAsync('UPDATE user_profile SET total_workouts = total_workouts + 1, updated_at = ? WHERE id = ?', [now, userId]);
}

export async function getExerciseById(id: string): Promise<Exercise | null> {
  const database = await getDatabase();
  const row = await database.getFirstAsync('SELECT * FROM exercises WHERE id = ?', [id]);
  return row ? mapExercise(row) : null;
}

// ============================================================
// Phase 3 — Rank Progression, Boss Fight, Personal Records
// ============================================================

export async function getMuscleGroupProgress(userId: string, muscleGroup: MuscleGroup): Promise<MuscleGroupProgress | null> {
  const database = await getDatabase();
  const row = await database.getFirstAsync('SELECT * FROM muscle_group_progress WHERE user_id = ? AND muscle_group = ?', [userId, muscleGroup]);
  return row ? mapMuscleGroupProgress(row) : null;
}

export async function setMuscleGroupRank(userId: string, muscleGroup: MuscleGroup, rankLevel: number, currentXp: number): Promise<void> {
  const database = await getDatabase();
  const now = new Date().toISOString();
  await database.runAsync(
    'UPDATE muscle_group_progress SET rank_level = ?, current_xp = ?, updated_at = ? WHERE user_id = ? AND muscle_group = ?',
    [rankLevel, currentXp, now, userId, muscleGroup],
  );
}

export async function getBossForGroup(userId: string, muscleGroup: MuscleGroup, status: BossStatus): Promise<Boss | null> {
  const database = await getDatabase();
  const row = await database.getFirstAsync('SELECT * FROM bosses WHERE user_id = ? AND muscle_group = ? AND status = ? LIMIT 1', [userId, muscleGroup, status]);
  return row ? mapBoss(row) : null;
}

export async function damageBoss(bossId: string, damage: number): Promise<Boss> {
  const database = await getDatabase();
  const now = new Date().toISOString();
  await database.runAsync(
    'UPDATE bosses SET hp_remaining = MAX(0, hp_remaining - ?), updated_at = ? WHERE id = ?',
    [damage, now, bossId],
  );
  const row = await database.getFirstAsync('SELECT * FROM bosses WHERE id = ?', [bossId]);
  return mapBoss(row as any);
}

export async function defeatBoss(bossId: string): Promise<void> {
  const database = await getDatabase();
  const now = new Date().toISOString();
  await database.runAsync(
    "UPDATE bosses SET status = 'defeated', hp_remaining = 0, defeated_at = ?, updated_at = ? WHERE id = ?",
    [now, now, bossId],
  );
}

export async function activateNextBoss(userId: string, muscleGroup: MuscleGroup): Promise<Boss | null> {
  const database = await getDatabase();
  const now = new Date().toISOString();
  const row = await database.getFirstAsync(
    "SELECT * FROM bosses WHERE user_id = ? AND muscle_group = ? AND status = 'dormant' ORDER BY tier ASC LIMIT 1",
    [userId, muscleGroup],
  );
  if (!row) return null;
  const boss = mapBoss(row as any);
  await database.runAsync(
    "UPDATE bosses SET status = 'active', activated_at = ?, updated_at = ? WHERE id = ?",
    [now, now, boss.id],
  );
  return { ...boss, status: 'active', activatedAt: now };
}

// PR detection: returns new PR if achieved, null otherwise
export async function checkAndSavePR(
  userId: string, exerciseId: string, category: ExerciseCategory,
  reps: number | null, weightKg: number | null, seconds: number | null,
  workoutId: string,
): Promise<PersonalRecord | null> {
  const database = await getDatabase();

  // Determine record type and value based on category
  let recordType: RecordType;
  let value: number;
  switch (category) {
    case 'pesi': recordType = 'weight'; value = weightKg ?? 0; break;
    case 'corpo_libero': recordType = 'reps'; value = reps ?? 0; break;
    case 'isometrico': recordType = 'time'; value = seconds ?? 0; break;
    case 'cardio': recordType = 'time'; value = seconds ?? 0; break;
    default: return null;
  }
  if (value <= 0) return null;

  // Find existing best record for this exercise
  const existing = await database.getFirstAsync(
    'SELECT * FROM personal_records WHERE user_id = ? AND exercise_id = ? AND record_type = ? ORDER BY value DESC LIMIT 1',
    [userId, exerciseId, recordType],
  );

  if (!existing) {
    // First ever value = baseline, previous_value = NULL
    const id = Crypto.randomUUID();
    const now = new Date().toISOString();
    await database.runAsync(
      'INSERT INTO personal_records (id, user_id, exercise_id, record_type, value, previous_value, achieved_at, workout_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, NULL, ?, ?, ?, ?)',
      [id, userId, exerciseId, recordType, value, now, workoutId, now, now],
    );
    // Baseline — NOT a PR, no celebration
    return null;
  }

  const existingRecord = mapPersonalRecord(existing);
  if (value <= existingRecord.value) return null;

  // New PR!
  const id = Crypto.randomUUID();
  const now = new Date().toISOString();
  await database.runAsync(
    'INSERT INTO personal_records (id, user_id, exercise_id, record_type, value, previous_value, achieved_at, workout_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [id, userId, exerciseId, recordType, value, existingRecord.value, now, workoutId, now, now],
  );
  await database.runAsync('UPDATE user_profile SET total_pr_count = total_pr_count + 1, updated_at = ? WHERE id = ?', [now, userId]);

  return { id, userId, exerciseId, recordType, value, previousValue: existingRecord.value, achievedAt: now, workoutId, createdAt: now, updatedAt: now };
}

export async function getPersonalRecordsForGroup(userId: string, muscleGroup: MuscleGroup): Promise<(PersonalRecord & { exerciseName: string })[]> {
  const database = await getDatabase();
  const rows = await database.getAllAsync(
    `SELECT pr.*, e.name as exercise_name FROM personal_records pr
     JOIN exercises e ON pr.exercise_id = e.id
     WHERE pr.user_id = ? AND e.muscle_group = ?
     ORDER BY pr.achieved_at DESC LIMIT 20`,
    [userId, muscleGroup],
  );
  return (rows as any[]).map((r) => ({ ...mapPersonalRecord(r), exerciseName: r.exercise_name }));
}

export async function getRecentExercisesForGroup(userId: string, muscleGroup: MuscleGroup): Promise<{ name: string; date: string; xp: number }[]> {
  const database = await getDatabase();
  const rows = await database.getAllAsync(
    `SELECT e.name, w.date, we.xp_earned as xp FROM workout_exercises we
     JOIN workouts w ON we.workout_id = w.id
     JOIN exercises e ON we.exercise_id = e.id
     WHERE w.user_id = ? AND e.muscle_group = ? AND w.completed_at IS NOT NULL
     ORDER BY w.date DESC LIMIT 5`,
    [userId, muscleGroup],
  );
  return (rows as any[]).map((r) => ({ name: r.name, date: r.date, xp: r.xp }));
}

// Process rank progression for a muscle group after XP added
// Returns events: rank-ups, boss defeats
export interface ProgressionEvent {
  type: 'rank_up' | 'boss_defeated';
  muscleGroup: MuscleGroup;
  oldRankLevel?: number;
  newRankLevel?: number;
  boss?: Boss;
}

// Apply XP to a muscle group with boss fight sequencing.
// If the group is in boss fight, XP goes to boss damage instead of rank progression.
// Returns progression events (rank-ups, boss defeats) and the boss damage dealt.
export async function applyGroupXp(
  userId: string, muscleGroup: MuscleGroup, xpToAdd: number,
): Promise<{ events: ProgressionEvent[]; bossDamage: number }> {
  const events: ProgressionEvent[] = [];
  let bossDamageDealt = 0;
  const mg = await getMuscleGroupProgress(userId, muscleGroup);
  if (!mg) return { events, bossDamage: 0 };

  let rankLevel = mg.rankLevel;
  let currentXp = mg.currentXp;
  let remainingXp = xpToAdd;

  // Always add to total_xp (for stats/medals) regardless of boss fight
  const database = await getDatabase();
  const now = new Date().toISOString();
  await database.runAsync(
    'UPDATE muscle_group_progress SET total_xp = total_xp + ?, updated_at = ? WHERE user_id = ? AND muscle_group = ?',
    [xpToAdd, now, userId, muscleGroup],
  );

  // If currently in boss fight (level is at band boundary with active boss), redirect XP to boss
  if (isInRankUpPhase(rankLevel)) {
    const boss = await getBossForGroup(userId, muscleGroup, 'active');
    if (boss && boss.hpRemaining > 0) {
      const damage = Math.min(remainingXp, boss.hpRemaining);
      const overflow = remainingXp - damage;
      await damageBoss(boss.id, damage);
      bossDamageDealt = damage;

      if (damage >= boss.hpRemaining) {
        // Boss defeated!
        await defeatBoss(boss.id);
        events.push({ type: 'boss_defeated', muscleGroup, boss: { ...boss, status: 'defeated', hpRemaining: 0 } });

        // Rank up past the boss fight level
        const oldRank = rankLevel;
        rankLevel++;
        currentXp = overflow; // Overflow XP goes to new rank
        events.push({ type: 'rank_up', muscleGroup, oldRankLevel: oldRank, newRankLevel: rankLevel });

        // Continue normal progression with overflow
        remainingXp = 0; // Already accounted for via overflow in currentXp
      } else {
        // Boss still alive — all XP consumed as damage, no rank progression
        remainingXp = 0;
      }
    }
  }

  // Normal progression with remaining XP (not in boss fight, or after boss defeat overflow)
  if (remainingXp > 0) {
    currentXp += remainingXp;
  }

  // Process rank-ups from accumulated XP
  while (rankLevel < 18) {
    const xpNeeded = getXpCostForLevel(rankLevel);
    if (currentXp < xpNeeded) break;

    // Check if next level would be a boss fight level
    if ((rankLevel + 1) % 3 === 0 && (rankLevel + 1) < 18) {
      // Consume XP to fill this level, then stop — boss activates
      currentXp -= xpNeeded;
      const oldRank = rankLevel;
      rankLevel++;
      events.push({ type: 'rank_up', muscleGroup, oldRankLevel: oldRank, newRankLevel: rankLevel });

      // Activate the dormant boss for this group
      await activateNextBoss(userId, muscleGroup);

      // Any remaining currentXp becomes first damage to the boss
      if (currentXp > 0) {
        const boss = await getBossForGroup(userId, muscleGroup, 'active');
        if (boss) {
          const damage = Math.min(currentXp, boss.hpRemaining);
          const overflow = currentXp - damage;
          await damageBoss(boss.id, damage);
          bossDamageDealt += damage;
          currentXp = 0; // XP consumed as damage

          if (damage >= boss.hpRemaining) {
            // Instant boss defeat (excess XP)
            await defeatBoss(boss.id);
            events.push({ type: 'boss_defeated', muscleGroup, boss: { ...boss, status: 'defeated', hpRemaining: 0 } });
            const oldR = rankLevel;
            rankLevel++;
            currentXp = overflow;
            events.push({ type: 'rank_up', muscleGroup, oldRankLevel: oldR, newRankLevel: rankLevel });
            // Continue the while loop for further progression
          }
          // else boss alive — stop progression
          else break;
        }
      } else {
        break; // No excess XP, wait for boss fight
      }
    } else {
      // Normal level-up (not a boss fight boundary)
      currentXp -= xpNeeded;
      const oldRank = rankLevel;
      rankLevel++;
      events.push({ type: 'rank_up', muscleGroup, oldRankLevel: oldRank, newRankLevel: rankLevel });
    }
  }

  // Save updated rank
  if (rankLevel !== mg.rankLevel || currentXp !== mg.currentXp) {
    await setMuscleGroupRank(userId, muscleGroup, rankLevel, currentXp);
  }

  return { events, bossDamage: bossDamageDealt };
}

// Legacy wrapper — still used by some callers
export async function processRankProgression(userId: string, muscleGroup: MuscleGroup): Promise<ProgressionEvent[]> {
  const { events } = await applyGroupXp(userId, muscleGroup, 0);
  return events;
}

// Check if a muscle group is in "rank-up phase" (at level 3 of a band, boss fight active)
export function isInRankUpPhase(rankLevel: number): boolean {
  return rankLevel % 3 === 0 && rankLevel < 18;
}

export async function getBossById(bossId: string): Promise<Boss | null> {
  const database = await getDatabase();
  const row = await database.getFirstAsync('SELECT * FROM bosses WHERE id = ?', [bossId]);
  return row ? mapBoss(row as any) : null;
}

export async function getAllPersonalRecords(userId: string): Promise<PersonalRecord[]> {
  const database = await getDatabase();
  const rows = await database.getAllAsync('SELECT * FROM personal_records WHERE user_id = ? ORDER BY achieved_at DESC', [userId]);
  return rows.map(mapPersonalRecord);
}

// Stats queries
export async function getWorkoutCountSince(userId: string, since: string): Promise<number> {
  const database = await getDatabase();
  const row = await database.getFirstAsync(
    'SELECT COUNT(*) as count FROM workouts WHERE user_id = ? AND completed_at IS NOT NULL AND date >= ?',
    [userId, since],
  ) as any;
  return row?.count ?? 0;
}

export async function getXpSumSince(userId: string, since: string): Promise<number> {
  const database = await getDatabase();
  const row = await database.getFirstAsync(
    'SELECT COALESCE(SUM(total_xp), 0) as total FROM workouts WHERE user_id = ? AND completed_at IS NOT NULL AND date >= ?',
    [userId, since],
  ) as any;
  return row?.total ?? 0;
}

export async function getXpByGroupSince(userId: string, since: string): Promise<Record<string, number>> {
  const database = await getDatabase();
  const rows = await database.getAllAsync(
    `SELECT e.muscle_group, COALESCE(SUM(we.xp_earned), 0) as total
     FROM workout_exercises we
     JOIN workouts w ON we.workout_id = w.id
     JOIN exercises e ON we.exercise_id = e.id
     WHERE w.user_id = ? AND w.completed_at IS NOT NULL AND w.date >= ?
     GROUP BY e.muscle_group`,
    [userId, since],
  ) as any[];
  const result: Record<string, number> = {};
  for (const r of rows) result[r.muscle_group] = r.total;
  return result;
}

export async function getDistinctWorkoutDaysSince(userId: string, since: string): Promise<number> {
  const database = await getDatabase();
  const row = await database.getFirstAsync(
    'SELECT COUNT(DISTINCT date) as count FROM workouts WHERE user_id = ? AND completed_at IS NOT NULL AND date >= ?',
    [userId, since],
  ) as any;
  return row?.count ?? 0;
}

// ============================================================
// Phase 4 — Streak, Medals, Boss Lore
// ============================================================

// Streak verification: call at end of week (Sunday)
export async function verifyAndUpdateStreak(userId: string): Promise<{ streakBroken: boolean; newTier: number; newWeeks: number }> {
  const database = await getDatabase();
  const profile = await getOrCreateProfile();
  const streak = await getStreakState(userId);
  if (!streak) return { streakBroken: false, newTier: 0, newWeeks: 0 };

  // Get current week (Mon-Sun)
  const now = new Date();
  const day = now.getDay();
  const diffToMon = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diffToMon);
  monday.setHours(0, 0, 0, 0);
  const weekKey = monday.toISOString().split('T')[0];

  // Already verified this week?
  if (streak.lastVerifiedWeek === weekKey) {
    return { streakBroken: false, newTier: streak.tier as number, newWeeks: streak.currentStreakWeeks };
  }

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const workouts = await getWorkoutsForWeek(userId, weekKey, sunday.toISOString().split('T')[0]);
  const completedWorkouts = workouts.filter((w) => w.completedAt != null).length;
  const goal = profile.weeklyWorkoutGoal;
  const met = completedWorkouts >= goal;

  const nowStr = new Date().toISOString();
  let newWeeks: number;
  let newTier: number;

  if (met) {
    newWeeks = streak.currentStreakWeeks + 1;
    newTier = Math.min(3, newWeeks >= 3 ? 3 : newWeeks);
  } else {
    newWeeks = 0;
    newTier = 0;
  }

  await database.runAsync(
    'UPDATE streak_state SET current_streak_weeks = ?, tier = ?, last_verified_week = ?, updated_at = ? WHERE user_id = ?',
    [newWeeks, newTier, weekKey, nowStr, userId],
  );

  // Write weekly log snapshot
  const logId = Crypto.randomUUID();
  const totalXp = workouts.reduce((s, w) => s + w.totalXp, 0);
  await database.runAsync(
    'INSERT INTO weekly_workout_log (id, user_id, week, workouts_done, goal, completed, total_xp, pr_count, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?)',
    [logId, userId, weekKey, completedWorkouts, goal, met ? 1 : 0, totalXp, nowStr, nowStr],
  );

  return { streakBroken: !met && streak.currentStreakWeeks > 0, newTier, newWeeks };
}

// Get current streak tier for XP calculations
export async function getCurrentStreakTier(userId: string): Promise<number> {
  const streak = await getStreakState(userId);
  return streak?.tier ?? 0;
}

// Medal checking system
export async function checkMedals(userId: string, context: {
  workoutXp?: number;
  workoutId?: string;
  weeklyPrCount?: number;
  workoutHour?: number;
  exercisesInSession?: string[];
  groupsInWeek?: string[];
}): Promise<Medal[]> {
  const database = await getDatabase();
  const profile = await getOrCreateProfile();
  const unlockedMedals: Medal[] = [];

  // Get all locked medals
  const lockedMedals = await database.getAllAsync(
    'SELECT * FROM medals WHERE user_id = ? AND unlocked_at IS NULL',
    [userId],
  ) as any[];

  for (const row of lockedMedals) {
    const medal = mapMedal(row);
    let unlocked = false;

    switch (medal.requirementType) {
      // Volume
      case 'total_kg':
        unlocked = profile.totalKgLifted >= medal.requirementValue;
        break;
      case 'total_reps':
        unlocked = profile.totalReps >= medal.requirementValue;
        break;
      case 'total_cardio_hours':
        unlocked = (profile.totalCardioSeconds / 3600) >= medal.requirementValue;
        break;

      // Costanza
      case 'total_workouts':
        unlocked = profile.totalWorkouts >= medal.requirementValue;
        break;
      case 'streak_weeks': {
        const streak = await getStreakState(userId);
        unlocked = (streak?.currentStreakWeeks ?? 0) >= medal.requirementValue;
        break;
      }

      // PR
      case 'total_pr':
        unlocked = profile.totalPrCount >= medal.requirementValue;
        break;

      // Esplorazione
      case 'exercises_tried': {
        const distinctRow = await database.getFirstAsync(
          `SELECT COUNT(DISTINCT we.exercise_id) as cnt
           FROM workout_exercises we
           JOIN workouts w ON we.workout_id = w.id
           WHERE w.user_id = ?`,
          [userId],
        ) as any;
        unlocked = (distinctRow?.cnt ?? 0) >= medal.requirementValue;
        break;
      }
      case 'all_groups_week':
        if (context.groupsInWeek) {
          unlocked = new Set(context.groupsInWeek).size >= 7;
        }
        break;
      case 'all_categories_session':
        if (context.exercisesInSession) {
          unlocked = new Set(context.exercisesInSession).size >= 4;
        }
        break;

      // Ranghi
      case 'rank_band_any': {
        const progress = await getAllMuscleGroupProgress(userId);
        unlocked = progress.some((mg) => mg.rankLevel >= medal.requirementValue);
        break;
      }
      case 'rank_band_all': {
        const progress = await getAllMuscleGroupProgress(userId);
        unlocked = progress.every((mg) => mg.rankLevel >= medal.requirementValue);
        break;
      }

      // Sfide specifiche
      case 'bench_press_kg': {
        const prs = await database.getAllAsync(
          "SELECT pr.value FROM personal_records pr JOIN exercises e ON pr.exercise_id = e.id WHERE pr.user_id = ? AND e.name LIKE '%Panca piana%' AND pr.record_type = 'weight' ORDER BY pr.value DESC LIMIT 1",
          [userId],
        ) as any[];
        unlocked = prs.length > 0 && prs[0].value >= medal.requirementValue;
        break;
      }
      case 'squat_bw_ratio': {
        const prs = await database.getAllAsync(
          "SELECT pr.value FROM personal_records pr JOIN exercises e ON pr.exercise_id = e.id WHERE pr.user_id = ? AND e.name LIKE '%Squat%' AND pr.record_type = 'weight' ORDER BY pr.value DESC LIMIT 1",
          [userId],
        ) as any[];
        unlocked = prs.length > 0 && (prs[0].value / profile.bodyWeightKg) >= medal.requirementValue;
        break;
      }
      case 'pullup_reps': {
        const prs = await database.getAllAsync(
          "SELECT pr.value FROM personal_records pr JOIN exercises e ON pr.exercise_id = e.id WHERE pr.user_id = ? AND e.name LIKE '%Trazion%' AND pr.record_type = 'reps' ORDER BY pr.value DESC LIMIT 1",
          [userId],
        ) as any[];
        unlocked = prs.length > 0 && prs[0].value >= medal.requirementValue;
        break;
      }
      case 'plank_seconds': {
        const prs = await database.getAllAsync(
          "SELECT pr.value FROM personal_records pr JOIN exercises e ON pr.exercise_id = e.id WHERE pr.user_id = ? AND e.name LIKE '%Plank%' AND pr.record_type = 'time' ORDER BY pr.value DESC LIMIT 1",
          [userId],
        ) as any[];
        unlocked = prs.length > 0 && prs[0].value >= medal.requirementValue;
        break;
      }
      case 'workout_before_hour':
        if (context.workoutHour != null) {
          unlocked = context.workoutHour < medal.requirementValue;
        }
        break;
      case 'workout_xp':
        if (context.workoutXp != null) {
          unlocked = context.workoutXp >= medal.requirementValue;
        }
        break;
      case 'weekly_pr':
        if (context.weeklyPrCount != null) {
          unlocked = context.weeklyPrCount >= medal.requirementValue;
        }
        break;

      // Mobilità
      case 'zen_sessions': {
        const zenSessionCount = await getCompletedMobilitySessionCount(userId);
        unlocked = zenSessionCount >= medal.requirementValue;
        break;
      }
      case 'total_zen':
        unlocked = profile.totalZenPoints >= medal.requirementValue;
        break;
    }

    if (unlocked) {
      const nowStr = new Date().toISOString();
      await database.runAsync(
        'UPDATE medals SET unlocked_at = ?, updated_at = ? WHERE id = ?',
        [nowStr, nowStr, medal.id],
      );
      unlockedMedals.push({ ...medal, unlockedAt: nowStr });
    }
  }

  return unlockedMedals;
}

// Get groups worked this week (for medal checking)
export async function getGroupsWorkedThisWeek(userId: string): Promise<string[]> {
  const database = await getDatabase();
  const now = new Date();
  const day = now.getDay();
  const diffToMon = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diffToMon);
  const start = monday.toISOString().split('T')[0];
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const end = sunday.toISOString().split('T')[0];

  const rows = await database.getAllAsync(
    `SELECT DISTINCT e.muscle_group FROM workout_exercises we
     JOIN workouts w ON we.workout_id = w.id
     JOIN exercises e ON we.exercise_id = e.id
     WHERE w.user_id = ? AND w.completed_at IS NOT NULL AND w.date >= ? AND w.date <= ?`,
    [userId, start, end],
  ) as any[];
  return rows.map((r: any) => r.muscle_group);
}

// Get PR count this week
export async function getPrCountThisWeek(userId: string): Promise<number> {
  const database = await getDatabase();
  const now = new Date();
  const day = now.getDay();
  const diffToMon = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diffToMon);
  const start = monday.toISOString().split('T')[0];

  const row = await database.getFirstAsync(
    'SELECT COUNT(*) as count FROM personal_records WHERE user_id = ? AND previous_value IS NOT NULL AND achieved_at >= ?',
    [userId, start],
  ) as any;
  return row?.count ?? 0;
}

// Boss lore data
export const BOSS_LORE: Record<string, string> = {
  "Sentinella d'Acciaio": "Forgiata nelle fucine del primo allenamento, veglia sull'ingresso dei ranghi superiori. Solo chi spinge il ferro oltre il proprio limite può abbatterla.",
  "Martello Cremisi": "Impugna un maglio rovente che fracassa i deboli di spirito. Ogni colpo che sferra è un giorno in cui hai pensato di saltare il workout.",
  "Colosso di Ferro": "Un gigante corazzato il cui petto è una fortezza impenetrabile. Nessuno ha mai visto cosa si nasconde dietro le sue piastre.",
  "Drago Corazzato": "Le sue scaglie sono fatte di ogni ripetizione che hai completato. Più forte diventi, più resistente diventa lui.",
  "Vulcano Eterno": "Arde da millenni al centro della montagna. Nessun guerriero l'ha mai spento — solo chi raggiunge il rango supremo può guardarlo negli occhi.",
  "Ombra Profonda": "Si muove nell'oscurità delle acque basse. Non la vedi finché non è troppo tardi — come un giorno saltato che diventa un'abitudine.",
  "Kraken Abissale": "I suoi tentacoli ti trascinano verso il fondo. Solo una schiena d'acciaio può resistere alla sua presa.",
  "Serpente di Pietra": "Avvolge le montagne con il suo corpo impossibile. La sua spina dorsale è leggenda — e vuole testare la tua.",
  "Idra delle Tempeste": "Taglia una testa e ne ricrescono due. Come i plateau che superati ne generano altri.",
  "Titano Sommerso": "Dorme sul fondo dell'oceano dalla notte dei tempi. Il giorno in cui si alzerà, solo i più forti resteranno in piedi.",
  "Guardiano dei Cieli": "Pattuglia le nuvole basse alla ricerca di chi osa alzare lo sguardo. Il primo nemico di chiunque punti in alto.",
  "Falco Tonante": "Le sue ali generano tempeste. Ogni battito è un military press che non hai ancora fatto.",
  "Atlante Spezzato": "Reggeva il cielo sulle spalle, poi si è rotto. Ora cerca qualcuno abbastanza forte da sostituirlo.",
  "Fenice d'Ametista": "Rinasce dalle ceneri di ogni sconfitta. Per eliminarla davvero devi essere più tenace di lei.",
  "Signore dei Venti": "Comanda le correnti e piega il mondo al suo volere. Solo spalle granitiche possono reggere la sua tempesta finale.",
  "Golem di Bronzo": "Assemblato con i resti di manubri dimenticati. Lento ma implacabile — non si ferma finché non lo fermi tu.",
  "Gladiatore Dorato": "Combatte nell'arena eterna dove ogni curl è un applauso e ogni french press una sentenza.",
  "Minotauro Furioso": "Le sue braccia hanno abbattuto le mura del labirinto. Adesso cercano qualcosa di più resistente.",
  "Ciclope Forgiatore": "Con un occhio solo vede meglio di chiunque. Ha forgiato le armi di tutti i boss che hai sconfitto finora.",
  "Eracle Redivivo": "Il semidio è tornato, e non è contento. Dodici fatiche non gli sono bastate — ne vuole una tredicesima.",
  "Toro Selvaggio": "Carica senza preavviso attraverso le pianure. Chi salta il leg day non ha speranze contro di lui.",
  "Centauro d'Ossidiana": "Metà uomo, metà incubo. Le sue gambe nere come la notte non conoscono fatica.",
  "Behemoth Sismico": "Ogni suo passo è un terremoto. Il terreno trema quando si avvicina — e le tue gambe devono tremare di meno.",
  "Wyrm Sotterraneo": "Scava tunnel infiniti sotto la crosta terrestre. La sua forza viene dal basso, come quella di uno squat profondo.",
  "Gaia Risvegliata": "La terra stessa ha preso forma. Sconfiggerla significa dimostrare che le tue radici sono più profonde delle sue.",
  "Nucleo Instabile": "Un'entità caotica che oscilla tra la distruzione e il nulla. Solo un core solido può stabilizzarla.",
  "Sfinge di Giada": "Pone enigmi che si risolvono solo con l'equilibrio. Ogni plank è una risposta corretta.",
  "Leviatano Astrale": "Fluttua tra le dimensioni, piegando la realtà attorno al suo centro. Il tuo core contro il suo.",
  "Oracolo Oscuro": "Conosce il futuro e sa che stai arrivando. Eppure non si sposta — vuole vedere se ne sei degno.",
  "Anima del Vuoto": "Non ha forma, non ha peso, non ha misericordia. È l'assenza stessa di forza — e sconfiggerla è la prova definitiva.",
  "Lupo d'Ombra": "Corre più veloce del pensiero e non si stanca mai. Per stargli dietro devi trovare un ritmo che non si spezza.",
  "Chimera Ardente": "Tre teste, tre ritmi, tre modi per ferirti. Solo un cuore allenato può tenere il passo.",
  "Fenrir Instancabile": "Il lupo primordiale che non si ferma mai. Corre dall'alba dei tempi e non ha mai rallentato.",
  "Maelstrom Vivente": "Un vortice di energia pura che divora tutto ciò che si muove troppo lentamente.",
  "Crono il Divoratore": "Il signore del tempo. Ogni secondo che sprechi lo rende più forte. Ogni minuto che corri lo indebolisce.",
};

// Get weekly recap data
export async function getWeeklyRecapData(userId: string): Promise<{
  totalXp: number; workoutsDone: number; goal: number;
  streakWeeks: number; streakTier: number;
  workoutDays: boolean[];
}> {
  const profile = await getOrCreateProfile();
  const streak = await getStreakState(userId);
  const now = new Date();
  const day = now.getDay();
  const diffToMon = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diffToMon);
  monday.setHours(0, 0, 0, 0);
  const start = monday.toISOString().split('T')[0];
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const end = sunday.toISOString().split('T')[0];

  const workouts = await getWorkoutsForWeek(userId, start, end);
  const completed = workouts.filter((w) => w.completedAt != null);
  const totalXp = completed.reduce((s, w) => s + w.totalXp, 0);

  // Build workout dots (Mon-Sun)
  const workoutDates = new Set(completed.map((w) => w.date));
  const workoutDays: boolean[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    workoutDays.push(workoutDates.has(d.toISOString().split('T')[0]));
  }

  return {
    totalXp,
    workoutsDone: completed.length,
    goal: profile.weeklyWorkoutGoal,
    streakWeeks: streak?.currentStreakWeeks ?? 0,
    streakTier: streak?.tier ?? 0,
    workoutDays,
  };
}

// ============================================================
// Phase 5 — Mobility Sessions
// ============================================================

export async function createMobilitySession(
  userId: string,
  sessionType: 'pre_workout' | 'post_workout' | 'rest_day',
  exerciseIds: string[],
  workoutId?: string,
): Promise<string> {
  const database = await getDatabase();
  const sessionId = generateId();
  const timestamp = now();
  const date = new Date().toISOString().split('T')[0];

  await database.runAsync(
    `INSERT INTO mobility_sessions (id, user_id, session_type, zen_points, completed, date, workout_id, created_at, updated_at) VALUES (?, ?, ?, 0, 0, ?, ?, ?, ?)`,
    [sessionId, userId, sessionType, date, workoutId ?? null, timestamp, timestamp],
  );

  for (let i = 0; i < exerciseIds.length; i++) {
    await database.runAsync(
      `INSERT INTO mobility_session_exercises (id, session_id, exercise_id, order_index, completed, created_at, updated_at) VALUES (?, ?, ?, ?, 0, ?, ?)`,
      [generateId(), sessionId, exerciseIds[i], i, timestamp, timestamp],
    );
  }

  return sessionId;
}

export async function completeMobilitySession(sessionId: string, userId: string): Promise<{ zenPoints: number; medalsUnlocked: Medal[] }> {
  const database = await getDatabase();
  const timestamp = now();

  // Get session details
  const sessionRow = await database.getFirstAsync('SELECT * FROM mobility_sessions WHERE id = ?', [sessionId]) as any;
  if (!sessionRow) throw new Error('Session not found');

  const zenPoints = sessionRow.session_type === 'rest_day' ? 2 : 1;

  // Mark session completed
  await database.runAsync(
    'UPDATE mobility_sessions SET completed = 1, zen_points = ?, updated_at = ? WHERE id = ?',
    [zenPoints, timestamp, sessionId],
  );

  // Update profile zen points
  await database.runAsync(
    'UPDATE user_profile SET total_zen_points = total_zen_points + ?, updated_at = ? WHERE id = ?',
    [zenPoints, timestamp, userId],
  );

  // Check mobility medals
  const medalsUnlocked = await checkMedals(userId, {});

  return { zenPoints, medalsUnlocked };
}

export async function getCompletedMobilitySessionCount(userId: string): Promise<number> {
  const database = await getDatabase();
  const row = await database.getFirstAsync(
    'SELECT COUNT(*) as count FROM mobility_sessions WHERE user_id = ? AND completed = 1',
    [userId],
  ) as any;
  return row?.count ?? 0;
}

export async function getTodayMobilityExerciseIds(userId: string): Promise<string[]> {
  const database = await getDatabase();
  const today = new Date().toISOString().split('T')[0];
  const rows = await database.getAllAsync(
    `SELECT mse.exercise_id FROM mobility_session_exercises mse
     JOIN mobility_sessions ms ON mse.session_id = ms.id
     WHERE ms.user_id = ? AND ms.date = ?`,
    [userId, today],
  ) as any[];
  return rows.map((r: any) => r.exercise_id);
}

export async function getRecentWorkoutGroups(userId: string, days: number): Promise<{ date: string; groups: MuscleGroup[] }[]> {
  const database = await getDatabase();
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const cutoffStr = cutoff.toISOString().split('T')[0];

  const rows = await database.getAllAsync(
    `SELECT DISTINCT w.date, e.muscle_group FROM workouts w
     JOIN workout_exercises we ON we.workout_id = w.id
     JOIN exercises e ON e.id = we.exercise_id
     WHERE w.user_id = ? AND w.date >= ? AND w.completed_at IS NOT NULL
     ORDER BY w.date DESC`,
    [userId, cutoffStr],
  ) as any[];

  const byDate: Record<string, MuscleGroup[]> = {};
  for (const r of rows) {
    if (!byDate[r.date]) byDate[r.date] = [];
    if (!byDate[r.date].includes(r.muscle_group as MuscleGroup)) byDate[r.date].push(r.muscle_group as MuscleGroup);
  }

  return Object.entries(byDate).map(([date, groups]) => ({ date, groups }));
}

export async function resetAllData(): Promise<void> {
  const database = await getDatabase();
  await database.runAsync('DELETE FROM exercise_sets');
  await database.runAsync('DELETE FROM workout_exercises');
  await database.runAsync('DELETE FROM workouts');
  await database.runAsync('DELETE FROM personal_records');
  await database.runAsync('DELETE FROM muscle_group_progress');
  await database.runAsync('DELETE FROM bosses');
  await database.runAsync('DELETE FROM medals');
  await database.runAsync('DELETE FROM streak_state');
  await database.runAsync('DELETE FROM weekly_workout_log');
  await database.runAsync('DELETE FROM mobility_sessions');
  await database.runAsync('DELETE FROM mobility_session_exercises');
  await database.runAsync('DELETE FROM notification_settings');
  await database.runAsync('DELETE FROM user_profile');
}
