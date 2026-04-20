import { apiGet, apiPost } from './client';
import {
  Workout,
  WorkoutExercise,
  ExerciseSet,
  CompleteWorkoutResponse,
} from '../types';

export interface LogSetBody {
  reps?: number;
  weightKg?: number;
  seconds?: number;
  ballastKg?: number;
}

export const startWorkout = (notes?: string) =>
  apiPost<{ workout: Workout }>('/workouts', { notes });

export const listWorkouts = (limit = 10, offset = 0) =>
  apiGet<Workout[]>(`/workouts?limit=${limit}&offset=${offset}`);

export const getWorkout = (id: string) =>
  apiGet<{ workout: Workout; exercises: WorkoutExercise[] }>(`/workouts/${id}`);

export const addExerciseToWorkout = (workoutId: string, exerciseId: string) =>
  apiPost<{ workoutExercise: WorkoutExercise }>(
    `/workouts/${workoutId}/exercises`,
    { exerciseId },
  );

export const logSet = (workoutId: string, weId: string, body: LogSetBody) =>
  apiPost<{ set: ExerciseSet; xpEarned: number }>(
    `/workouts/${workoutId}/exercises/${weId}/sets`,
    body,
  );

export const completeWorkout = (workoutId: string) =>
  apiPost<CompleteWorkoutResponse>(`/workouts/${workoutId}/complete`, {});
