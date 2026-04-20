import { ExerciseCategory, Difficulty } from '../types';

// Coefficienti base dal Game Design Spec v1.5 (sezione 8.1)
// In Fase 2 si usa tier streak = 0 → nessun bonus
const CW = 0.08; // pesi
const CB = 0.1; // corpo libero / isometrico / cardio

export interface SetInput {
  category: ExerciseCategory;
  difficulty: Difficulty;
  bodyWeightKg: number;
  reps?: number;
  weightKg?: number;
  seconds?: number;
  ballastKg?: number;
}

/**
 * Calcola l'XP per un singolo set.
 * Le 4 formule sono IDENTICHE al progetto FitQuest mobile (sezione 8.1 della spec).
 *
 *  - pesi:         d × reps × peso_kg × Cw
 *  - corpo_libero: d × reps × (peso_corporeo + zavorra) × Cb
 *  - isometrico:   d × (secondi/5) × (peso_corporeo + zavorra) × Cb
 *  - cardio:       d × (secondi/60) × peso_corporeo × Cb
 *
 * Arrotondato a intero con Math.round.
 */
export function calcSetXp(s: SetInput): number {
  const d = s.difficulty;
  const bw = s.bodyWeightKg;

  switch (s.category) {
    case 'pesi':
      return Math.round(d * (s.reps ?? 0) * (s.weightKg ?? 0) * CW);
    case 'corpo_libero':
      return Math.round(d * (s.reps ?? 0) * (bw + (s.ballastKg ?? 0)) * CB);
    case 'isometrico':
      return Math.round(d * ((s.seconds ?? 0) / 5) * (bw + (s.ballastKg ?? 0)) * CB);
    case 'cardio':
      return Math.round(d * ((s.seconds ?? 0) / 60) * bw * CB);
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
      if (weightKg === undefined || weightKg < 0) return 'weightKg (>=0) richiesto per esercizi con pesi';
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
