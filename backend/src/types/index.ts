import { Request } from 'express';

// Estende Express.Request con i campi popolati dal middleware JWT
export interface AuthRequest extends Request {
  userId: string;
  username: string;
}

// ============================================================
// Domain types — matchano lo schema di database/init.sql
// ============================================================

export type MuscleGroup =
  | 'petto'
  | 'schiena'
  | 'gambe'
  | 'spalle'
  | 'braccia'
  | 'core'
  | 'cardio';

export type ExerciseCategory = 'pesi' | 'corpo_libero' | 'isometrico' | 'cardio';

export type Difficulty = 1 | 2 | 3;

export interface Exercise {
  id: string;
  name: string;
  muscle_group: MuscleGroup;
  category: ExerciseCategory;
  difficulty: Difficulty;
}

export interface Workout {
  id: string;
  user_id: string;
  started_at: string;
  completed_at: string | null;
  total_xp: number;
  notes: string | null;
}

export interface WorkoutExercise {
  id: string;
  workout_id: string;
  exercise_id: string;
  order_index: number;
  xp_earned: number;
  exercise?: Exercise;
  sets?: ExerciseSet[];
}

export interface ExerciseSet {
  id: string;
  workout_exercise_id: string;
  set_number: number;
  reps: number | null;
  weight_kg: number | null;
  seconds: number | null;
  ballast_kg: number | null;
  xp_earned: number;
}

export interface MuscleGroupProgress {
  user_id: string;
  muscle_group: MuscleGroup;
  total_xp: number;
  current_xp: number;
  rank_band: number; // 1..6
  rank_sub: number; // 1..3
}

export interface Boss {
  user_id: string;
  muscle_group: MuscleGroup;
  boss_name: string;
  tier: number; // 1..5
  max_hp: number;
  current_hp: number;
  defeated: boolean;
  defeated_at: string | null;
}

export interface RankUpEvent {
  muscle_group: MuscleGroup;
  fromBand: number;
  fromSub: number;
  toBand: number;
  toSub: number;
}

export interface BossUpdate {
  muscle_group: MuscleGroup;
  boss_name: string;
  tier: number;
  current_hp: number;
  max_hp: number;
  defeated: boolean;
  damage_dealt: number;
}

export interface StreakStateRow {
  current_streak: number;
  streak_tier: 0 | 1 | 2 | 3;
  week_start: Date;
  workouts_this_week: number;
  best_streak: number;
  goal_at_week_start: number;
}

export interface StreakSummary {
  current_streak: number;
  streak_tier: 0 | 1 | 2 | 3;
  weekly_goal: number;
  workouts_this_week: number;
  best_streak: number;
  bonus_pct: number;
  week_start: string; // ISO date
}
