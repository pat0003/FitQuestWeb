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
