import { MuscleGroup } from '../types';

// Nomi boss per fascia di rank-up (sezione 8.4 spec)
// tier 1 = Bronzo→Argento, ..., tier 5 = Platino→Diamante
const BOSS_NAMES_BY_TIER: Record<number, string> = {
  1: 'Guardiano',
  2: 'Sentinella',
  3: 'Campione',
  4: 'Signore',
  5: 'Titano',
};

const GROUP_LABEL: Record<MuscleGroup, string> = {
  petto: 'del Petto',
  schiena: 'della Schiena',
  gambe: 'delle Gambe',
  spalle: 'delle Spalle',
  braccia: 'delle Braccia',
  core: 'del Core',
  cardio: 'del Cardio',
};

/**
 * Compone il nome del boss combinando tier (1-5) e gruppo muscolare.
 * Esempio: bossNameFor(1, 'petto') → "Guardiano del Petto"
 */
export function bossNameFor(tier: number, group: MuscleGroup): string {
  const tierName = BOSS_NAMES_BY_TIER[tier] ?? 'Boss';
  const label = GROUP_LABEL[group];
  return `${tierName} ${label}`;
}
