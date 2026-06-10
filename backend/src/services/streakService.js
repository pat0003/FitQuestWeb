export const STREAK_BONUS = {
  0: { cwMultiplier: 1.0, cbMultiplier: 1.0 },
  1: { cwMultiplier: 1.1, cbMultiplier: 1.1 },
  2: { cwMultiplier: 1.2, cbMultiplier: 1.2 },
  3: { cwMultiplier: 1.3, cbMultiplier: 1.3 },
};

export function getEffectiveCoefficients(tier) {
  const m = STREAK_BONUS[tier];
  return { cw: 0.08 * m.cwMultiplier, cb: 0.1 * m.cbMultiplier };
}

export function bonusPctFor(tier) {
  return tier * 10;
}

export function startOfISOWeek(d) {
  const day = d.getUTCDay();
  const diff = day === 0 ? 6 : day - 1;
  return new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - diff),
  );
}

export function weeksBetween(a, b) {
  const aMonday = startOfISOWeek(a);
  const bMonday = startOfISOWeek(b);
  const ms = bMonday.getTime() - aMonday.getTime();
  return Math.round(ms / (7 * 24 * 60 * 60 * 1000));
}

export function processWeekRolloverIfNeeded(state, weeklyGoalCorrente, today) {
  const currentMonday = startOfISOWeek(today);
  const weeksDiff = weeksBetween(state.week_start, today);

  if (weeksDiff <= 0) {
    return { state, changed: false, weekCompleted: null };
  }

  let weekCompleted = false;
  let newStreak = state.current_streak;

  if (weeksDiff === 1) {
    if (state.workouts_this_week >= state.goal_at_week_start) {
      newStreak = state.current_streak + 1;
      weekCompleted = true;
    } else {
      newStreak = 0;
    }
  } else {
    newStreak = 0;
    weekCompleted = false;
  }

  const newTier = Math.min(3, newStreak);
  const newBest = Math.max(state.best_streak, newStreak);

  return {
    state: {
      current_streak: newStreak,
      streak_tier: newTier,
      best_streak: newBest,
      week_start: currentMonday,
      workouts_this_week: 0,
      goal_at_week_start: weeklyGoalCorrente,
    },
    changed: true,
    weekCompleted,
  };
}
