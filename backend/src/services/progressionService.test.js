import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  stepCost,
  rankUpCost,
  getRankInfo,
  xpToNextFor,
  applyXpToGroup,
} from './progressionService.js';

describe('stepCost', () => {
  it('band 1 costs 800 XP', () => {
    assert.strictEqual(stepCost(1), 800);
  });

  it('band 3 costs 1040 XP', () => {
    assert.strictEqual(stepCost(3), Math.round(800 * (1 + 0.15 * 2)));
  });

  it('band 6 costs 1400 XP', () => {
    assert.strictEqual(stepCost(6), Math.round(800 * (1 + 0.15 * 5)));
  });
});

describe('rankUpCost', () => {
  it('band 1 costs 1600 XP', () => {
    assert.strictEqual(rankUpCost(1), 1600);
  });

  it('band 6 costs 2800 XP', () => {
    assert.strictEqual(rankUpCost(6), 2800);
  });
});

describe('getRankInfo', () => {
  it('band 1 sub 1 returns Bronzo 1', () => {
    const info = getRankInfo(1, 1);
    assert.strictEqual(info.displayName, 'Bronzo 1');
    assert.strictEqual(info.color, '#CD7F32');
  });

  it('band 6 sub 3 returns Diamante 3', () => {
    const info = getRankInfo(6, 3);
    assert.strictEqual(info.displayName, 'Diamante 3');
    assert.strictEqual(info.color, '#3FACC6');
  });

  it('band below 1 clamps to Bronzo', () => {
    const info = getRankInfo(0, 1);
    assert.strictEqual(info.displayName, 'Bronzo 1');
  });

  it('band above 6 clamps to Diamante', () => {
    const info = getRankInfo(7, 1);
    assert.strictEqual(info.displayName, 'Diamante 1');
  });
});

describe('xpToNextFor', () => {
  it('sub < MAX_SUB returns stepCost', () => {
    assert.strictEqual(xpToNextFor(1, 1), stepCost(1));
  });

  it('sub = MAX_SUB returns rankUpCost', () => {
    assert.strictEqual(xpToNextFor(1, 3), rankUpCost(1));
  });

  it('max rank (6, 3) returns 0', () => {
    assert.strictEqual(xpToNextFor(6, 3), 0);
  });
});

describe('applyXpToGroup', () => {
  const stubBossFactory = (band) => ({
    current_hp: 2000,
    defeated: false,
  });

  it('partial fill — stays at same sub-rank', () => {
    const progress = { total_xp: 0, rank_band: 1, rank_sub: 1, current_xp: 0 };
    const result = applyXpToGroup(progress, null, 500, stubBossFactory);
    assert.strictEqual(result.progress.rank_sub, 1);
    assert.strictEqual(result.progress.current_xp, 500);
    assert.strictEqual(result.rankUps.length, 0);
  });

  it('exact stepCost advances sub-rank', () => {
    const progress = { total_xp: 0, rank_band: 1, rank_sub: 1, current_xp: 0 };
    const result = applyXpToGroup(progress, null, 800, stubBossFactory);
    assert.strictEqual(result.progress.rank_sub, 2);
    assert.strictEqual(result.progress.current_xp, 0);
    assert.strictEqual(result.rankUps.length, 1);
    assert.deepStrictEqual(result.rankUps[0], {
      fromBand: 1, fromSub: 1, toBand: 1, toSub: 2,
    });
  });

  it('boss takes damage without defeat', () => {
    const progress = { total_xp: 0, rank_band: 1, rank_sub: 3, current_xp: 0 };
    const boss = { current_hp: 2000, defeated: false };
    const result = applyXpToGroup(progress, boss, 500, stubBossFactory);
    assert.strictEqual(result.boss.current_hp, 1500);
    assert.strictEqual(result.bossDefeated, false);
    assert.strictEqual(result.progress.rank_band, 1);
  });

  it('boss defeat triggers band advancement', () => {
    const progress = { total_xp: 0, rank_band: 1, rank_sub: 3, current_xp: 0 };
    const boss = { current_hp: 100, defeated: false };
    const result = applyXpToGroup(progress, boss, 200, stubBossFactory);
    assert.strictEqual(result.bossDefeated, true);
    assert.strictEqual(result.progress.rank_band, 2);
    assert.strictEqual(result.progress.rank_sub, 1);
    assert.strictEqual(result.progress.current_xp, 100);
  });

  it('max rank — XP accumulates in current_xp', () => {
    const progress = { total_xp: 0, rank_band: 6, rank_sub: 3, current_xp: 0 };
    const result = applyXpToGroup(progress, null, 1000, stubBossFactory);
    assert.strictEqual(result.progress.rank_band, 6);
    assert.strictEqual(result.progress.rank_sub, 3);
    assert.strictEqual(result.progress.current_xp, 1000);
    assert.strictEqual(result.rankUps.length, 0);
  });

  it('enough XP for multiple sub-rank advances', () => {
    const progress = { total_xp: 0, rank_band: 1, rank_sub: 1, current_xp: 0 };
    const result = applyXpToGroup(progress, null, 1700, stubBossFactory);
    assert.strictEqual(result.progress.rank_sub, 3);
    assert.strictEqual(result.progress.current_xp, 100);
    assert.strictEqual(result.rankUps.length, 2);
  });

  it('does not mutate original objects', () => {
    const progress = { total_xp: 0, rank_band: 1, rank_sub: 1, current_xp: 0 };
    const boss = { current_hp: 100, defeated: false };
    const progressCopy = { ...progress };
    const bossCopy = { ...boss };
    applyXpToGroup(progress, boss, 5000, stubBossFactory);
    assert.deepStrictEqual(progress, progressCopy);
    assert.deepStrictEqual(boss, bossCopy);
  });
});
