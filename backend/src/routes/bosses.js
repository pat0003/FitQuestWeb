import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { pool } from '../db/pool.js';
import { MAX_BAND, MAX_SUB } from '../services/progressionService.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const router = Router();

router.use((req, res, next) => authMiddleware(req, res, next));

router.get('/', asyncHandler(async (req, res) => {
  const { userId } = req;
  const result = await pool.query(
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
}));

export default router;
