import { apiGet } from './client';
import { StreakSummary } from '../types';

export const getStreak = () => apiGet<StreakSummary>('/streak');
