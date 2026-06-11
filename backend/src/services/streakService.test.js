import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  getEffectiveCoefficients,
  bonusPctFor,
  startOfISOWeek,
  weeksBetween,
  processWeekRolloverIfNeeded,
} from './streakService.js';

const almostEqual = (a, b, eps = 1e-9) => Math.abs(a - b) < eps;

describe('getEffectiveCoefficients', () => {
  it('tier 0 returns base coefficients', () => {
    const { cw, cb } = getEffectiveCoefficients(0);
    assert.ok(almostEqual(cw, 0.08));
    assert.ok(almostEqual(cb, 0.1));
  });

  it('tier 1 applies 10% bonus', () => {
    const { cw, cb } = getEffectiveCoefficients(1);
    assert.ok(almostEqual(cw, 0.088));
    assert.ok(almostEqual(cb, 0.11));
  });

  it('tier 2 applies 20% bonus', () => {
    const { cw, cb } = getEffectiveCoefficients(2);
    assert.ok(almostEqual(cw, 0.096));
    assert.ok(almostEqual(cb, 0.12));
  });

  it('tier 3 applies 30% bonus (max)', () => {
    const { cw, cb } = getEffectiveCoefficients(3);
    assert.ok(almostEqual(cw, 0.104));
    assert.ok(almostEqual(cb, 0.13));
  });
});

describe('bonusPctFor', () => {
  it('tier 0 returns 0%', () => {
    assert.strictEqual(bonusPctFor(0), 0);
  });

  it('tier 3 returns 30%', () => {
    assert.strictEqual(bonusPctFor(3), 30);
  });
});

describe('startOfISOWeek', () => {
  it('monday returns itself', () => {
    const mon = new Date(Date.UTC(2026, 5, 8)); // 2026-06-08 is Monday
    const result = startOfISOWeek(mon);
    assert.strictEqual(result.toISOString(), '2026-06-08T00:00:00.000Z');
  });

  it('wednesday returns preceding monday', () => {
    const wed = new Date(Date.UTC(2026, 5, 10)); // 2026-06-10 is Wednesday
    const result = startOfISOWeek(wed);
    assert.strictEqual(result.toISOString(), '2026-06-08T00:00:00.000Z');
  });

  it('sunday returns preceding monday', () => {
    const sun = new Date(Date.UTC(2026, 5, 14)); // 2026-06-14 is Sunday
    const result = startOfISOWeek(sun);
    assert.strictEqual(result.toISOString(), '2026-06-08T00:00:00.000Z');
  });
});

describe('weeksBetween', () => {
  it('same week returns 0', () => {
    const mon = new Date(Date.UTC(2026, 5, 8));
    const fri = new Date(Date.UTC(2026, 5, 12));
    assert.strictEqual(weeksBetween(mon, fri), 0);
  });

  it('consecutive weeks returns 1', () => {
    const week1 = new Date(Date.UTC(2026, 5, 8));
    const week2 = new Date(Date.UTC(2026, 5, 15));
    assert.strictEqual(weeksBetween(week1, week2), 1);
  });

  it('3-week gap returns 3', () => {
    const a = new Date(Date.UTC(2026, 5, 1));
    const b = new Date(Date.UTC(2026, 5, 22));
    assert.strictEqual(weeksBetween(a, b), 3);
  });
});

describe('processWeekRolloverIfNeeded', () => {
  const baseState = {
    week_start: new Date(Date.UTC(2026, 5, 1)), // Monday 2026-06-01
    workouts_this_week: 3,
    goal_at_week_start: 3,
    current_streak: 2,
    best_streak: 5,
  };

  it('same week — no change', () => {
    const today = new Date(Date.UTC(2026, 5, 5)); // Friday same week
    const result = processWeekRolloverIfNeeded(baseState, 3, today);
    assert.strictEqual(result.changed, false);
    assert.strictEqual(result.weekCompleted, null);
  });

  it('next week, goal met — streak increments', () => {
    const today = new Date(Date.UTC(2026, 5, 8)); // Monday next week
    const result = processWeekRolloverIfNeeded(baseState, 3, today);
    assert.strictEqual(result.changed, true);
    assert.strictEqual(result.weekCompleted, true);
    assert.strictEqual(result.state.current_streak, 3);
    assert.strictEqual(result.state.streak_tier, 3);
    assert.strictEqual(result.state.workouts_this_week, 0);
  });

  it('next week, goal not met — streak resets', () => {
    const state = { ...baseState, workouts_this_week: 1 };
    const today = new Date(Date.UTC(2026, 5, 8));
    const result = processWeekRolloverIfNeeded(state, 3, today);
    assert.strictEqual(result.changed, true);
    assert.strictEqual(result.weekCompleted, false);
    assert.strictEqual(result.state.current_streak, 0);
    assert.strictEqual(result.state.streak_tier, 0);
  });

  it('2+ week gap — streak resets regardless', () => {
    const today = new Date(Date.UTC(2026, 5, 22)); // 3 weeks later
    const result = processWeekRolloverIfNeeded(baseState, 3, today);
    assert.strictEqual(result.changed, true);
    assert.strictEqual(result.weekCompleted, false);
    assert.strictEqual(result.state.current_streak, 0);
  });

  it('streak tier caps at 3', () => {
    const state = { ...baseState, current_streak: 10 };
    const today = new Date(Date.UTC(2026, 5, 8));
    const result = processWeekRolloverIfNeeded(state, 3, today);
    assert.strictEqual(result.state.current_streak, 11);
    assert.strictEqual(result.state.streak_tier, 3);
  });

  it('best_streak updates when new streak exceeds it', () => {
    const state = { ...baseState, current_streak: 5, best_streak: 5 };
    const today = new Date(Date.UTC(2026, 5, 8));
    const result = processWeekRolloverIfNeeded(state, 3, today);
    assert.strictEqual(result.state.best_streak, 6);
  });
});
