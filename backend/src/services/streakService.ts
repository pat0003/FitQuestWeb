// Streak settimanale + bonus tier — sezione 8.3 della spec.
// Funzioni pure: nessun I/O, testabili in isolamento.

export type StreakTier = 0 | 1 | 2 | 3;

// Moltiplicatori applicati ai coefficienti base Cw=0.08, Cb=0.10
export const STREAK_BONUS: Record<
  StreakTier,
  { cwMultiplier: number; cbMultiplier: number }
> = {
  0: { cwMultiplier: 1.0, cbMultiplier: 1.0 },
  1: { cwMultiplier: 1.1, cbMultiplier: 1.1 },
  2: { cwMultiplier: 1.2, cbMultiplier: 1.2 },
  3: { cwMultiplier: 1.3, cbMultiplier: 1.3 },
};

/**
 * Calcola Cw e Cb effettivi dato il tier corrente.
 * Tier 0 → 0.08 / 0.10 (no bonus). Tier 3 → 0.104 / 0.130 (+30%).
 */
export function getEffectiveCoefficients(tier: StreakTier): { cw: number; cb: number } {
  const m = STREAK_BONUS[tier];
  return { cw: 0.08 * m.cwMultiplier, cb: 0.1 * m.cbMultiplier };
}

/**
 * Bonus percentuale leggibile per la UI: 0/10/20/30.
 */
export function bonusPctFor(tier: StreakTier): number {
  return tier * 10;
}

/**
 * Lunedì della settimana di `d` come Date alle 00:00 UTC.
 * ISO 8601: la settimana inizia il lunedì.
 *
 * Nota: usiamo getUTC* per evitare problemi di timezone — il rollover
 * deve essere consistente indipendentemente da dove gira il server.
 * In produzione il backend è in container UTC.
 */
export function startOfISOWeek(d: Date): Date {
  const day = d.getUTCDay(); // 0=Dom..6=Sab
  const diff = day === 0 ? 6 : day - 1;
  return new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - diff),
  );
}

/**
 * Differenza in settimane intere tra due date (entrambe portate al lunedì).
 * Esempio: oggi = mercoledì 28 apr; week_start nel DB = lunedì 21 apr → diff = 1.
 */
export function weeksBetween(a: Date, b: Date): number {
  const aMonday = startOfISOWeek(a);
  const bMonday = startOfISOWeek(b);
  const ms = bMonday.getTime() - aMonday.getTime();
  return Math.round(ms / (7 * 24 * 60 * 60 * 1000));
}

export interface StreakStateInput {
  current_streak: number;
  streak_tier: StreakTier;
  week_start: Date; // viene da DATE Postgres → Date JS
  workouts_this_week: number;
  best_streak: number;
  goal_at_week_start: number;
}

export interface RolloverResult {
  state: StreakStateInput;
  changed: boolean; // true se servirà UPDATE su DB
  weekCompleted: boolean | null; // true/false se è avvenuta una valutazione di settimana, null altrimenti
}

/**
 * Esegue il rollover settimanale se necessario.
 *
 * Logica (sezione 8.3):
 *  - Stessa settimana: nessun cambiamento
 *  - Esattamente 1 settimana fa: valuta workouts_this_week vs goal_at_week_start.
 *    Se >= goal → streak++ (capped) e tier++. Else → streak=0, tier=0.
 *  - Più settimane fa: una settimana saltata interrompe la streak → streak=0, tier=0.
 *
 * Anti-exploit: il check usa state.goal_at_week_start (snapshot all'inizio della
 * settimana che si sta chiudendo), NON weeklyGoalCorrente. Quest'ultimo viene usato
 * SOLO per snapshottare la NUOVA settimana che stiamo aprendo ora.
 */
export function processWeekRolloverIfNeeded(
  state: StreakStateInput,
  weeklyGoalCorrente: number,
  today: Date,
): RolloverResult {
  const currentMonday = startOfISOWeek(today);
  const weeksDiff = weeksBetween(state.week_start, today);

  if (weeksDiff <= 0) {
    // Stessa settimana (o anomalia: today < week_start) → no-op
    return { state, changed: false, weekCompleted: null };
  }

  let weekCompleted = false;
  let newStreak = state.current_streak;

  if (weeksDiff === 1) {
    // La settimana che stava in week_start si è appena chiusa
    if (state.workouts_this_week >= state.goal_at_week_start) {
      newStreak = state.current_streak + 1;
      weekCompleted = true;
    } else {
      newStreak = 0;
    }
  } else {
    // weeksDiff > 1 → settimana(e) saltata(e) → streak interrotta
    newStreak = 0;
    weekCompleted = false;
  }

  const newTier = Math.min(3, newStreak) as StreakTier;
  const newBest = Math.max(state.best_streak, newStreak);

  return {
    state: {
      current_streak: newStreak,
      streak_tier: newTier,
      best_streak: newBest,
      week_start: currentMonday,
      workouts_this_week: 0,
      goal_at_week_start: weeklyGoalCorrente, // snapshot della settimana che inizia ora
    },
    changed: true,
    weekCompleted,
  };
}
