import { Router, Request, Response, NextFunction } from 'express';
import { authMiddleware } from '../middleware/auth';
import { pool } from '../db/pool';
import { AuthRequest, MuscleGroup } from '../types';
import { MAX_BAND, MAX_SUB } from '../services/progressionService';

const router = Router();

router.use((req: Request, res: Response, next: NextFunction) =>
  authMiddleware(req as AuthRequest, res, next),
);

// ============================================================
// GET /api/bosses — tutti i boss dell'utente, con rank corrente
// Ritorna anche i boss "dormienti" (utente non ancora a sub 3) e quelli sconfitti.
// Il frontend filtra in base a isActive (rank_sub === 3 && !defeated).
// ============================================================
router.get('/', async (req: Request, res: Response): Promise<void> => {
  const { userId } = req as AuthRequest;
  const result = await pool.query<{
    muscle_group: MuscleGroup;
    boss_name: string;
    tier: number;
    max_hp: number;
    current_hp: number;
    defeated: boolean;
    defeated_at: string | null;
    rank_band: number;
    rank_sub: number;
  }>(
    `SELECT b.muscle_group, b.boss_name, b.tier, b.max_hp, b.current_hp, b.defeated, b.defeated_at,
            mgp.rank_band, mgp.rank_sub
     FROM bosses b
     JOIN muscle_group_progress mgp
       ON mgp.user_id = b.user_id AND mgp.muscle_group = b.muscle_group
     WHERE b.user_id = $1
     ORDER BY b.muscle_group`,
    [userId],
  );

  const enriched = result.rows.map((r) => ({
    ...r,
    isActive: r.rank_sub === MAX_SUB && r.rank_band < MAX_BAND && !r.defeated,
  }));
  res.json(enriched);
});

export default router;
