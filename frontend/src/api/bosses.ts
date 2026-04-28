import { apiGet } from './client';
import { Boss } from '../types';

export const listBosses = () => apiGet<Boss[]>('/bosses');
