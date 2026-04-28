// Adattato dal progetto personale FitQuest (React Native)
// Tipi condivisi tra i componenti frontend

export interface User {
  id: string;
  username: string;
  email: string;
  body_weight_kg: number;
  weekly_goal: number;
  created_at: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

// ============================================================
// Domain types — matchano lo schema API backend
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

export const MUSCLE_GROUPS: { value: MuscleGroup; label: string }[] = [
  { value: 'petto', label: 'Petto' },
  { value: 'schiena', label: 'Schiena' },
  { value: 'spalle', label: 'Spalle' },
  { value: 'braccia', label: 'Braccia' },
  { value: 'gambe', label: 'Gambe' },
  { value: 'core', label: 'Core' },
  { value: 'cardio', label: 'Cardio' },
];

export const EXERCISE_CATEGORIES: { value: ExerciseCategory; label: string }[] = [
  { value: 'pesi', label: 'Pesi' },
  { value: 'corpo_libero', label: 'Corpo libero' },
  { value: 'isometrico', label: 'Isometrico' },
  { value: 'cardio', label: 'Cardio' },
];

export interface Exercise {
  id: string;
  name: string;
  muscle_group: MuscleGroup;
  category: ExerciseCategory;
  difficulty: Difficulty;
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

export interface WorkoutExercise {
  id: string;
  workout_id: string;
  exercise_id: string;
  order_index: number;
  xp_earned: number;
  exercise?: Exercise;
  sets?: ExerciseSet[];
}

export interface Workout {
  id: string;
  user_id: string;
  started_at: string;
  completed_at: string | null;
  total_xp: number;
  notes: string | null;
}

export interface XpSummary {
  totalXp: number;
  perMuscleGroup: Partial<Record<MuscleGroup, number>>;
}

// ============================================================
// Progressione + Boss
// ============================================================

export const RANK_BAND_NAMES = [
  'Bronzo',
  'Argento',
  'Oro',
  'Giada',
  'Platino',
  'Diamante',
] as const;

export const RANK_BAND_COLORS = [
  '#CD7F32',
  '#A0A0A0',
  '#B8960C',
  '#00A86B',
  '#7B7B7B',
  '#3FACC6',
] as const;

export interface RankInfo {
  band: number;
  sub: number;
  displayName: string;
  color: string;
}

export interface BossSummary {
  tier: number;
  boss_name: string;
  max_hp: number;
  current_hp: number;
  defeated: boolean;
}

export interface MuscleGroupProgress {
  muscle_group: MuscleGroup;
  total_xp: number;
  current_xp: number;
  rank_band: number;
  rank_sub: number;
  rankInfo: RankInfo;
  xpToNext: number;
  isAtRankUp: boolean;
  isMaxRank: boolean;
  boss: BossSummary | null;
}

export interface Boss {
  muscle_group: MuscleGroup;
  boss_name: string;
  tier: number;
  max_hp: number;
  current_hp: number;
  defeated: boolean;
  defeated_at: string | null;
  rank_band: number;
  rank_sub: number;
  isActive: boolean;
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

export interface StreakSummary {
  current_streak: number;
  streak_tier: 0 | 1 | 2 | 3;
  weekly_goal: number;
  workouts_this_week: number;
  best_streak: number;
  bonus_pct: number;
  week_start: string;
}

export interface CompleteWorkoutResponse {
  workout: Workout;
  xpSummary: XpSummary;
  rankUps: RankUpEvent[];
  bossUpdates: BossUpdate[];
}
