import { apiGet } from './client';
import { MuscleGroup, MuscleGroupProgress } from '../types';

export const listProgress = () => apiGet<MuscleGroupProgress[]>('/progress');

export const getProgressDetail = (group: MuscleGroup) =>
  apiGet<MuscleGroupProgress>(`/progress/${group}`);
