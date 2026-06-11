import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { calcSetXp, validateSetInput } from './xpCalculator.js';

describe('calcSetXp', () => {
  it('pesi — base formula', () => {
    const xp = calcSetXp({
      category: 'pesi', difficulty: 3, reps: 10, weightKg: 50,
      bodyWeightKg: 70, streakTier: 0,
    });
    assert.strictEqual(xp, Math.round(3 * 10 * 50 * 0.08));
  });

  it('corpo_libero — uses bodyWeight + ballast', () => {
    const xp = calcSetXp({
      category: 'corpo_libero', difficulty: 2, reps: 15,
      bodyWeightKg: 70, ballastKg: 5, streakTier: 0,
    });
    assert.strictEqual(xp, Math.round(2 * 15 * 75 * 0.1));
  });

  it('isometrico — seconds divided by 5', () => {
    const xp = calcSetXp({
      category: 'isometrico', difficulty: 2, seconds: 30,
      bodyWeightKg: 70, streakTier: 0,
    });
    assert.strictEqual(xp, Math.round(2 * 6 * 70 * 0.1));
  });

  it('cardio — seconds divided by 60', () => {
    const xp = calcSetXp({
      category: 'cardio', difficulty: 1, seconds: 1800,
      bodyWeightKg: 70, streakTier: 0,
    });
    assert.strictEqual(xp, Math.round(1 * 30 * 70 * 0.1));
  });

  it('streak tier 3 increases XP by ~30%', () => {
    const base = calcSetXp({
      category: 'pesi', difficulty: 3, reps: 10, weightKg: 50,
      bodyWeightKg: 70, streakTier: 0,
    });
    const boosted = calcSetXp({
      category: 'pesi', difficulty: 3, reps: 10, weightKg: 50,
      bodyWeightKg: 70, streakTier: 3,
    });
    assert.ok(boosted > base);
    assert.strictEqual(boosted, Math.round(3 * 10 * 50 * 0.104));
  });

  it('missing optional params default to 0', () => {
    const xp = calcSetXp({
      category: 'pesi', difficulty: 1, bodyWeightKg: 70,
    });
    assert.strictEqual(xp, 0);
  });

  it('unknown category returns undefined', () => {
    const xp = calcSetXp({
      category: 'nuoto', difficulty: 1, bodyWeightKg: 70,
    });
    assert.strictEqual(xp, undefined);
  });
});

describe('validateSetInput', () => {
  it('pesi — valid input returns null', () => {
    assert.strictEqual(validateSetInput('pesi', { reps: 5, weightKg: 10 }), null);
  });

  it('pesi — missing reps returns error', () => {
    const err = validateSetInput('pesi', { weightKg: 10 });
    assert.ok(typeof err === 'string' && err.includes('reps'));
  });

  it('pesi — missing weightKg returns error', () => {
    const err = validateSetInput('pesi', { reps: 5 });
    assert.ok(typeof err === 'string' && err.includes('weightKg'));
  });

  it('corpo_libero — valid input returns null', () => {
    assert.strictEqual(validateSetInput('corpo_libero', { reps: 10 }), null);
  });

  it('corpo_libero — missing reps returns error', () => {
    assert.ok(typeof validateSetInput('corpo_libero', {}) === 'string');
  });

  it('isometrico — valid input returns null', () => {
    assert.strictEqual(validateSetInput('isometrico', { seconds: 30 }), null);
  });

  it('isometrico — missing seconds returns error', () => {
    assert.ok(typeof validateSetInput('isometrico', {}) === 'string');
  });

  it('cardio — valid input returns null', () => {
    assert.strictEqual(validateSetInput('cardio', { seconds: 60 }), null);
  });

  it('cardio — missing seconds returns error', () => {
    assert.ok(typeof validateSetInput('cardio', {}) === 'string');
  });

  it('unknown category returns undefined', () => {
    assert.strictEqual(validateSetInput('nuoto', { reps: 5 }), undefined);
  });
});
