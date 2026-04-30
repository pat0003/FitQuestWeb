import { Router, Request, Response, NextFunction } from 'express';
import { authMiddleware } from '../middleware/auth';
import { pool } from '../db/pool';
import { AuthRequest } from '../types';

const router = Router();

// Middleware JWT — cast necessario perché AuthRequest estende Request
router.use((req: Request, res: Response, next: NextFunction) =>
  authMiddleware(req as AuthRequest, res, next),
);

// ============================================================
// GET /api/user/profile
// ============================================================
router.get('/profile', async (req: Request, res: Response): Promise<void> => {
  const { userId } = req as AuthRequest;
  const result = await pool.query<{
    id: string; username: string; email: string;
    body_weight_kg: number; weekly_goal: number; created_at: string;
  }>(
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

// ============================================================
// PATCH /api/user/profile
// ============================================================
router.patch('/profile', async (req: Request, res: Response): Promise<void> => {
  const { userId } = req as AuthRequest;
  const { bodyWeightKg, weeklyGoal } = req.body as {
    bodyWeightKg?: number;
    weeklyGoal?: number;
  };

  // COALESCE: aggiorna solo i campi presenti nella richiesta
  const result = await pool.query<{
    id: string; username: string; email: string;
    body_weight_kg: number; weekly_goal: number; updated_at: string;
  }>(
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
