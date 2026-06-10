export const XP_BASE = 800;
export const BAND_SCALING = 0.15;
export const RANK_UP_MULTIPLIER = 2.0;

export const RANK_BAND_NAMES = [
  'Bronzo',
  'Argento',
  'Oro',
  'Giada',
  'Platino',
  'Diamante',
];

export const RANK_BAND_COLORS = [
  '#CD7F32',
  '#A0A0A0',
  '#B8960C',
  '#00A86B',
  '#7B7B7B',
  '#3FACC6',
];

export const MAX_BAND = 6;
export const MAX_SUB = 3;

export function stepCost(band) {
  return Math.round(XP_BASE * (1 + BAND_SCALING * (band - 1)));
}

export function rankUpCost(band) {
  return Math.round(stepCost(band) * RANK_UP_MULTIPLIER);
}

export function getRankInfo(band, sub) {
  const idx = Math.max(1, Math.min(MAX_BAND, band)) - 1;
  return {
    band,
    sub,
    displayName: `${RANK_BAND_NAMES[idx]} ${sub}`,
    color: RANK_BAND_COLORS[idx],
  };
}

export function xpToNextFor(band, sub) {
  if (band >= MAX_BAND && sub >= MAX_SUB) return 0;
  if (sub < MAX_SUB) return stepCost(band);
  return rankUpCost(band);
}

export function applyXpToGroup(progress, boss, xpDelta, nextBossFactory) {
  const p = { ...progress, total_xp: progress.total_xp + xpDelta };
  let b = boss ? { ...boss } : null;
  const rankUps = [];
  let bossDefeated = false;
  let remaining = xpDelta;

  let iter = 0;
  const MAX_ITER = 100;

  while (remaining > 0 && iter++ < MAX_ITER) {
    if (p.rank_band >= MAX_BAND && p.rank_sub >= MAX_SUB) {
      p.current_xp += remaining;
      remaining = 0;
      break;
    }

    if (p.rank_sub < MAX_SUB) {
      const cost = stepCost(p.rank_band);
      const space = cost - p.current_xp;
      if (remaining >= space) {
        const fromBand = p.rank_band;
        const fromSub = p.rank_sub;
        remaining -= space;
        p.current_xp = 0;
        p.rank_sub += 1;
        rankUps.push({ fromBand, fromSub, toBand: p.rank_band, toSub: p.rank_sub });
      } else {
        p.current_xp += remaining;
        remaining = 0;
      }
    } else {
      if (!b || b.defeated) {
        p.current_xp += remaining;
        remaining = 0;
        break;
      }
      const damage = Math.min(remaining, b.current_hp);
      b.current_hp -= damage;
      remaining -= damage;
      if (b.current_hp <= 0) {
        b.defeated = true;
        bossDefeated = true;
        const fromBand = p.rank_band;
        const fromSub = p.rank_sub;
        p.rank_band += 1;
        p.rank_sub = 1;
        p.current_xp = 0;
        rankUps.push({ fromBand, fromSub, toBand: p.rank_band, toSub: p.rank_sub });

        if (p.rank_band <= MAX_BAND - 1) {
          b = nextBossFactory(p.rank_band);
        } else {
          b = nextBossFactory(p.rank_band);
        }
      }
    }
  }

  return { progress: p, boss: b, rankUps, bossDefeated };
}
