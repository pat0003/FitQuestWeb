import { apiGet } from './client';
import { Exercise, ExerciseCategory, MuscleGroup } from '../types';

export function listExercises(filters?: {
  muscleGroup?: MuscleGroup;
  category?: ExerciseCategory;
}): Promise<Exercise[]> {
  const params = new URLSearchParams();
  if (filters?.muscleGroup) params.set('muscleGroup', filters.muscleGroup);
  if (filters?.category) params.set('category', filters.category);
  const qs = params.toString();
  return apiGet<Exercise[]>(`/exercises${qs ? `?${qs}` : ''}`);
}
