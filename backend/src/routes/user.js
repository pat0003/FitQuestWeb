import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { pool } from '../db/pool.js';

const router = Router();

router.use((req, res, next) => authMiddleware(req, res, next));

router.get('/profile', async (req, res) => {
  const { userId } = req;
  const result = await pool.query(
    `SELECT id, username, email, body_weight_kg, weekly_goal, created_at
     FROM users WHERE id = $1`,
    [userId],
  );

  if (result.rows.length === 0) {
    res.status(404).json({ error: 'Utente non trovato' });
    return;
  }

  res.json({ user: result.rows[0] });
});

router.patch('/profile', async (req, res) => {
  const { userId } = req;
  const { bodyWeightKg, weeklyGoal } = req.body;

  const result = await pool.query(
    `UPDATE users
     SET body_weight_kg = COALESCE($1, body_weight_kg),
         weekly_goal    = COALESCE($2, weekly_goal),
         updated_at     = NOW()
     WHERE id = $3
     RETURNING id, username, email, body_weight_kg, weekly_goal, updated_at`,
    [bodyWeightKg ?? null, weeklyGoal ?? null, userId],
  );

  res.json({ user: result.rows[0] });
});

export default router;
