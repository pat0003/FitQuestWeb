import { ExerciseCategory, Difficulty } from '../types';
import { StreakTier, getEffectiveCoefficients } from './streakService';

export interface SetInput {
  category: ExerciseCategory;
  difficulty: Difficulty;
  bodyWeightKg: number;
  reps?: number;
  weightKg?: number;
  seconds?: number;
  ballastKg?: number;
  // Tier streak corrente (Fase 4). Default 0 = nessun bonus.
  streakTier?: StreakTier;
}

/**
 * Calcola l'XP per un singolo set.
 * Le 4 formule sono IDENTICHE al progetto FitQuest mobile (sezione 8.1 della spec).
 *
 *  - pesi:         d × reps × peso_kg × Cw_effettivo
 *  - corpo_libero: d × reps × (peso_corporeo + zavorra) × Cb_effettivo
 *  - isometrico:   d × (secondi/5) × (peso_corporeo + zavorra) × Cb_effettivo
 *  - cardio:       d × (secondi/60) × peso_corporeo × Cb_effettivo
 *
 * Cw_effettivo / Cb_effettivo includono il moltiplicatore streak:
 *  - tier 0 → 0.08 / 0.10 (no bonus)
 *  - tier 3 → 0.104 / 0.130 (+30%)
 *
 * Arrotondato a intero con Math.round.
 */
export function calcSetXp(s: SetInput): number {
  const d = s.difficulty;
  const bw = s.bodyWeightKg;
  const tier = s.streakTier ?? 0;
  const { cw, cb } = getEffectiveCoefficients(tier);

  switch (s.category) {
    case 'pesi':
      return Math.round(d * (s.reps ?? 0) * (s.weightKg ?? 0) * cw);
    case 'corpo_libero':
      return Math.round(d * (s.reps ?? 0) * (bw + (s.ballastKg ?? 0)) * cb);
    case 'isometrico':
      return Math.round(d * ((s.seconds ?? 0) / 5) * (bw + (s.ballastKg ?? 0)) * cb);
    case 'cardio':
      return Math.round(d * ((s.seconds ?? 0) / 60) * bw * cb);
  }
}

/**
 * Valida che i campi inviati siano coerenti con la categoria dell'esercizio.
 * Ritorna un messaggio di errore leggibile, o `null` se tutto ok.
 */
export function validateSetInput(
  category: ExerciseCategory,
  body: { reps?: number; weightKg?: number; seconds?: number; ballastKg?: number },
): string | null {
  const { reps, weightKg, seconds } = body;

  switch (category) {
    case 'pesi':
      if (!reps || reps <= 0) return 'reps (>0) richiesto per esercizi con pesi';
      if (weightKg === undefined || weightKg < 0)
        return 'weightKg (>=0) richiesto per esercizi con pesi';
      return null;
    case 'corpo_libero':
      if (!reps || reps <= 0) return 'reps (>0) richiesto per esercizi a corpo libero';
      return null;
    case 'isometrico':
      if (!seconds || seconds <= 0) return 'seconds (>0) richiesto per esercizi isometrici';
      return null;
    case 'cardio':
      if (!seconds || seconds <= 0) return 'seconds (>0) richiesto per esercizi cardio';
      return null;
  }
}
