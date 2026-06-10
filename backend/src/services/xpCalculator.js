import { getEffectiveCoefficients } from './streakService.js';

export function calcSetXp(s) {
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

export function validateSetInput(category, body) {
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
