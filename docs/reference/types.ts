// ============================================================
// FIT QUEST — Database Types
// ============================================================

export type MuscleGroup = 'petto' | 'schiena' | 'spalle' | 'braccia' | 'gambe' | 'core' | 'cardio';
export type ExerciseCategory = 'pesi' | 'corpo_libero' | 'isometrico' | 'cardio';
export type Difficulty = 1 | 2 | 3;
export type BossStatus = 'dormant' | 'active' | 'defeated';
export type BossTier = 1 | 2 | 3 | 4 | 5;
export type StreakTier = 0 | 1 | 2 | 3;
export type MobilitySessionType = 'pre_workout' | 'post_workout' | 'rest_day';
export type MobilityExerciseType = 'mobilita' | 'stretching';
export type RecordType = 'weight' | 'reps' | 'time';
export type NotificationType = 'workout_reminder' | 'urgent_reminder' | 'mobility_rest_day' | 'weekly_recap';
export type MedalCategory = 'volume' | 'costanza' | 'pr' | 'esplorazione' | 'ranghi' | 'sfide' | 'mobilita';
export type RankBand = 'bronzo' | 'argento' | 'oro' | 'giada' | 'platino' | 'diamante';
export type RankSubLevel = 1 | 2 | 3;

export interface RankInfo {
  band: RankBand;
  subLevel: RankSubLevel;
  level: number;
  displayName: string;
  color: string;
}

export interface UserProfile {
  id: string;
  username: string;
  bodyWeightKg: number;
  weeklyWorkoutGoal: number;
  totalZenPoints: number;
  totalWorkouts: number;
  totalKgLifted: number;
  totalReps: number;
  totalCardioSeconds: number;
  totalPrCount: number;
  totalExercisesTried: number;
  createdAt: string;
  updatedAt: string;
}

export interface Exercise {
  id: string;
  name: string;
  muscleGroup: MuscleGroup;
  category: ExerciseCategory;
  difficulty: Difficulty;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface MobilityExercise {
  id: string;
  name: string;
  zoneTarget: string;
  type: MobilityExerciseType;
  suggestedDurationSec: number;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface Workout {
  id: string;
  userId: string;
  date: string;
  totalXp: number;
  startedAt: string;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface WorkoutExercise {
  id: string;
  workoutId: string;
  exerciseId: string;
  orderIndex: number;
  xpEarned: number;
  createdAt: string;
  updatedAt: string;
}

export interface ExerciseSet {
  id: string;
  workoutExerciseId: string;
  setNumber: number;
  reps: number | null;
  weightKg: number | null;
  seconds: number | null;
  ballastKg: number;
  createdAt: string;
  updatedAt: string;
}

export interface MuscleGroupProgress {
  id: string;
  userId: string;
  muscleGroup: MuscleGroup;
  rankLevel: number;
  currentXp: number;
  totalXp: number;
  createdAt: string;
  updatedAt: string;
}

export interface StreakState {
  id: string;
  userId: string;
  currentStreakWeeks: number;
  tier: StreakTier;
  lastVerifiedWeek: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface WeeklyWorkoutLog {
  id: string;
  userId: string;
  week: string;
  workoutsDone: number;
  goal: number;
  completed: boolean;
  totalXp: number;
  prCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface Boss {
  id: string;
  userId: string;
  muscleGroup: MuscleGroup;
  name: string;
  tier: BossTier;
  hpTotal: number;
  hpRemaining: number;
  status: BossStatus;
  activatedAt: string | null;
  defeatedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Medal {
  id: string;
  userId: string;
  medalKey: string;
  category: MedalCategory;
  name: string;
  description: string;
  requirementType: string;
  requirementValue: number;
  unlockedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PersonalRecord {
  id: string;
  userId: string;
  exerciseId: string;
  recordType: RecordType;
  value: number;
  previousValue: number | null;
  achievedAt: string;
  workoutId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MobilitySession {
  id: string;
  userId: string;
  sessionType: MobilitySessionType;
  zenPoints: number;
  completed: boolean;
  date: string;
  workoutId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MobilitySessionExercise {
  id: string;
  sessionId: string;
  exerciseId: string;
  orderIndex: number;
  completed: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationSetting {
  id: string;
  userId: string;
  notificationType: NotificationType;
  enabled: boolean;
  scheduledTime: string;
  createdAt: string;
  updatedAt: string;
}

// --- Tipi composti per la UI ---

export interface WorkoutExerciseWithDetails extends WorkoutExercise {
  exercise: Exercise;
  sets: ExerciseSet[];
}

export interface WorkoutWithDetails extends Workout {
  exercises: WorkoutExerciseWithDetails[];
}

export interface MuscleGroupProgressWithRank extends MuscleGroupProgress {
  rankInfo: RankInfo;
  xpToNextLevel: number;
  activeBoss: Boss | null;
}

export interface WorkoutRecap {
  workout: Workout;
  xpByGroup: Record<MuscleGroup, number>;
  newPrs: PersonalRecord[];
  medalsUnlocked: Medal[];
  bossesDefeated: Boss[];
  bossesActive: Boss[];
}

export interface WeeklyRecap {
  week: string;
  totalXp: number;
  workoutsDone: number;
  goal: number;
  streakTier: StreakTier;
  streakWeeks: number;
  bossesDefeated: Boss[];
  medalsUnlocked: Medal[];
  prCount: number;
}
