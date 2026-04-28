// Progressione ranghi — adattata da docs/reference/game.ts
// Formule IDENTICHE al progetto FitQuest mobile (sezione 8.2 della spec).

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
] as const;

export const RANK_BAND_COLORS = [
  '#CD7F32',
  '#A0A0A0',
  '#B8960C',
  '#00A86B',
  '#7B7B7B',
  '#3FACC6',
] as const;

export const MAX_BAND = 6; // Diamante
export const MAX_SUB = 3;

export function stepCost(band: number): number {
  return Math.round(XP_BASE * (1 + BAND_SCALING * (band - 1)));
}

export function rankUpCost(band: number): number {
  return Math.round(stepCost(band) * RANK_UP_MULTIPLIER);
}

export function getRankInfo(band: number, sub: number) {
  const idx = Math.max(1, Math.min(MAX_BAND, band)) - 1;
  return {
    band,
    sub,
    displayName: `${RANK_BAND_NAMES[idx]} ${sub}`,
    color: RANK_BAND_COLORS[idx],
  };
}

// XP che serve per il PROSSIMO step (avanzamento) dalla posizione corrente.
// - Se sub < 3: stepCost(band) per arrivare al sub successivo
// - Se sub == 3 e band < 6: rankUpCost(band) per fare rank-up (HP del boss)
// - Se sub == 3 e band == 6: 0 (max raggiunto)
export function xpToNextFor(band: number, sub: number): number {
  if (band >= MAX_BAND && sub >= MAX_SUB) return 0;
  if (sub < MAX_SUB) return stepCost(band);
  return rankUpCost(band);
}

export interface ProgressState {
  rank_band: number;
  rank_sub: number;
  current_xp: number;
  total_xp: number;
}

export interface BossState {
  tier: number;
  max_hp: number;
  current_hp: number;
  defeated: boolean;
}

export interface RankUpEvent {
  fromBand: number;
  fromSub: number;
  toBand: number;
  toSub: number;
}

export interface ApplyResult {
  progress: ProgressState;
  boss: BossState | null; // null se band 6 raggiunto e boss tier 5 sconfitto
  rankUps: RankUpEvent[];
  bossDefeated: boolean;
}

/**
 * Propaga `xpDelta` sulla progressione di un singolo gruppo muscolare.
 * Logica (sezione 8.2 + 8.4 spec):
 *  - sub < 3: gli XP riempiono current_xp; se >= stepCost si avanza al sub successivo,
 *    eventuale eccesso continua nel ciclo
 *  - sub == 3 (band < 6): gli XP danneggiano il boss; se HP <= 0, rank-up:
 *    band++, sub=1, current_xp=0, e si crea il boss della fascia successiva
 *  - band 6, sub 3: rango massimo, gli XP si accumulano in current_xp ma non avanzano
 */
export function applyXpToGroup(
  progress: ProgressState,
  boss: BossState | null,
  xpDelta: number,
  // Callback per generare il prossimo boss (nome dipende dal gruppo, gestito in route)
  nextBossFactory: (newBand: number) => BossState | null,
): ApplyResult {
  // Cloniamo per non mutare gli input
  const p: ProgressState = { ...progress, total_xp: progress.total_xp + xpDelta };
  let b: BossState | null = boss ? { ...boss } : null;
  const rankUps: RankUpEvent[] = [];
  let bossDefeated = false;
  let remaining = xpDelta;

  // Safety: limita le iterazioni del while a numero ragionevole
  let iter = 0;
  const MAX_ITER = 100;

  while (remaining > 0 && iter++ < MAX_ITER) {
    // Caso rango massimo: non si avanza più
    if (p.rank_band >= MAX_BAND && p.rank_sub >= MAX_SUB) {
      p.current_xp += remaining;
      remaining = 0;
      break;
    }

    if (p.rank_sub < MAX_SUB) {
      // Step intra-fascia
      const cost = stepCost(p.rank_band);
      const space = cost - p.current_xp;
      if (remaining >= space) {
        // Avanzamento di sub
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
      // sub == 3 → boss damage
      if (!b || b.defeated) {
        // Stato inconsistente o band 6: stop
        p.current_xp += remaining;
        remaining = 0;
        break;
      }
      const damage = Math.min(remaining, b.current_hp);
      b.current_hp -= damage;
      remaining -= damage;
      if (b.current_hp <= 0) {
        // Boss sconfitto → rank-up
        b.defeated = true;
        bossDefeated = true;
        const fromBand = p.rank_band;
        const fromSub = p.rank_sub;
        p.rank_band += 1;
        p.rank_sub = 1;
        p.current_xp = 0;
        rankUps.push({ fromBand, fromSub, toBand: p.rank_band, toSub: p.rank_sub });

        // Genera il boss della nuova fascia (se band <= 5 c'è ancora un rank-up futuro)
        if (p.rank_band <= MAX_BAND - 1) {
          b = nextBossFactory(p.rank_band);
        } else {
          // Diamante raggiunto: nessun nuovo boss
          // b resta come riga "defeated" (chi consuma la callback decide se nullarlo)
          b = nextBossFactory(p.rank_band); // tipicamente null
        }
      }
    }
  }

  return { progress: p, boss: b, rankUps, bossDefeated };
}
