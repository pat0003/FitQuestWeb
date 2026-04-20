import type { RankBand, RankSubLevel, RankInfo, BossTier, StreakTier } from '../database/types';

export const CW_BASE = 0.08;
export const CB_BASE = 0.10;
export const XP_STEP_BASE = 800;
export const RANK_UP_MULTIPLIER = 2.0;
export const BAND_SCALING = 0.15;

export const RANK_BANDS: RankBand[] = ['bronzo', 'argento', 'oro', 'giada', 'platino', 'diamante'];

export const RANK_BAND_NAMES: Record<RankBand, string> = {
  bronzo: 'Bronzo', argento: 'Argento', oro: 'Oro',
  giada: 'Giada', platino: 'Platino', diamante: 'Diamante',
};

export const RANK_BAND_COLORS: Record<RankBand, string> = {
  bronzo: '#CD7F32', argento: '#A0A0A0', oro: '#B8960C',
  giada: '#00A86B', platino: '#7B7B7B', diamante: '#3FACC6',
};

export const STREAK_BONUS: Record<StreakTier, { cwMultiplier: number; cbMultiplier: number }> = {
  0: { cwMultiplier: 1.0, cbMultiplier: 1.0 },
  1: { cwMultiplier: 1.1, cbMultiplier: 1.1 },
  2: { cwMultiplier: 1.2, cbMultiplier: 1.2 },
  3: { cwMultiplier: 1.3, cbMultiplier: 1.3 },
};

export const BOSS_HP: Record<BossTier, number> = {
  1: 1840, 2: 2116, 3: 2434, 4: 2799, 5: 3219,
};

export const BOSS_TIER_NAMES: Record<BossTier, string> = {
  1: 'Guardiano', 2: 'Campione', 3: 'Titano', 4: 'Leviatano', 5: 'Dio Antico',
};

export const ZEN_POINTS = {
  pre_workout: 1, post_workout: 1, rest_day: 2,
} as const;

export function getRankInfo(level: number): RankInfo {
  const clampedLevel = Math.max(1, Math.min(18, level));
  const bandIndex = Math.floor((clampedLevel - 1) / 3);
  const subLevel = ((clampedLevel - 1) % 3) + 1 as RankSubLevel;
  const band = RANK_BANDS[bandIndex];
  return {
    band, subLevel, level: clampedLevel,
    displayName: `${RANK_BAND_NAMES[band]} ${subLevel}`,
    color: RANK_BAND_COLORS[band],
  };
}

export function getXpCostForLevel(level: number): number {
  if (level < 1 || level > 18) return 0;
  const bandIndex = Math.floor((level - 1) / 3);
  const posInBand = (level - 1) % 3;
  const bandScale = 1 + bandIndex * BAND_SCALING;
  const stepCost = Math.round(XP_STEP_BASE * bandScale);
  if (posInBand === 0 && bandIndex > 0) {
    return Math.round(stepCost * RANK_UP_MULTIPLIER);
  }
  return stepCost;
}

export function getRankCostTable(): Array<{ level: number; rankInfo: RankInfo; cost: number; cumulative: number }> {
  const table: Array<{ level: number; rankInfo: RankInfo; cost: number; cumulative: number }> = [];
  let cumulative = 0;
  for (let level = 1; level <= 18; level++) {
    const cost = getXpCostForLevel(level);
    cumulative += cost;
    table.push({ level, rankInfo: getRankInfo(level), cost, cumulative });
  }
  return table;
}

export function getEffectiveCoefficients(tier: StreakTier): { cw: number; cb: number } {
  const bonus = STREAK_BONUS[tier];
  return { cw: CW_BASE * bonus.cwMultiplier, cb: CB_BASE * bonus.cbMultiplier };
}

export const LEVEL_MIN = 7;
export const LEVEL_MAX = 126;
