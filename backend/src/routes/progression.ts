import { Router, Request, Response, NextFunction } from 'express';
import { authMiddleware } from '../middleware/auth';
import { pool } from '../db/pool';
import { AuthRequest, MuscleGroup } from '../types';
import { getRankInfo, xpToNextFor, MAX_BAND, MAX_SUB } from '../services/progressionService';

const router = Router();

router.use((req: Request, res: Response, next: NextFunction) =>
  authMiddleware(req as AuthRequest, res, next),
);

// Riga raw dal join progress + boss
interface ProgressRow {
  muscle_group: MuscleGroup;
  total_xp: string; // BIGINT torna come string in node-postgres
  current_xp: number;
  rank_band: number;
  rank_sub: number;
  boss_tier: number | null;
  boss_name: string | null;
  max_hp: number | null;
  current_hp: number | null;
  defeated: boolean | null;
}

function enrich(row: ProgressRow) {
  const xpToNext = xpToNextFor(row.rank_band, row.rank_sub);
  const isAtRankUp = row.rank_sub === MAX_SUB && row.rank_band < MAX_BAND;
  return {
    muscle_group: row.muscle_group,
    total_xp: Number(row.total_xp),
    current_xp: row.current_xp,
    rank_band: row.rank_band,
    rank_sub: row.rank_sub,
    rankInfo: getRankInfo(row.rank_band, row.rank_sub),
    xpToNext,
    isAtRankUp,
    isMaxRank: row.rank_band >= MAX_BAND && row.rank_sub >= MAX_SUB,
    boss:
      row.boss_tier !== null && row.boss_name !== null
        ? {
            tier: row.boss_tier,
            boss_name: row.boss_name,
            max_hp: row.max_hp ?? 0,
            current_hp: row.current_hp ?? 0,
            defeated: row.defeated ?? false,
          }
        : null,
  };
}

// ============================================================
// GET /api/progress — tutti i 7 gruppi
// ============================================================
router.get('/', async (req: Request, res: Response): Promise<void> => {
  const { userId } = req as AuthRequest;
  const result = await pool.query<ProgressRow>(
    `SELECT mgp.muscle_group, mgp.total_xp, mgp.current_xp, mgp.rank_band, mgp.rank_sub,
            b.tier AS boss_tier, b.boss_name, b.max_hp, b.current_hp, b.defeated
     FROM muscle_group_progress mgp
     LEFT JOIN bosses b ON b.user_id = mgp.user_id AND b.muscle_group = mgp.muscle_group
     WHERE mgp.user_id = $1
     ORDER BY mgp.muscle_group`,
    [userId],
  );
  res.json(result.rows.map(enrich));
});

// ============================================================
// GET /api/progress/:group — singolo gruppo
// ============================================================
router.get('/:group', async (req: Request, res: Response): Promise<void> => {
  const { userId } = req as AuthRequest;
  const { group } = req.params;
  const result = await pool.query<ProgressRow>(
    `SELECT mgp.muscle_group, mgp.total_xp, mgp.current_xp, mgp.rank_band, mgp.rank_sub,
            b.tier AS boss_tier, b.boss_name, b.max_hp, b.current_hp, b.defeated
     FROM muscle_group_progress mgp
     LEFT JOIN bosses b ON b.user_id = mgp.user_id AND b.muscle_group = mgp.muscle_group
     WHERE mgp.user_id = $1 AND mgp.muscle_group = $2`,
    [userId, group],
  );
  if (result.rows.length === 0) {
    res.status(404).json({ error: 'Gruppo muscolare non trovato' });
    return;
  }
  res.json(enrich(result.rows[0]));
});

export default router;
