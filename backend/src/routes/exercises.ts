import { Router, Request, Response, NextFunction } from 'express';
import { authMiddleware } from '../middleware/auth';
import { pool } from '../db/pool';
import { AuthRequest, Exercise } from '../types';

const router = Router();

// JWT richiesto per tutte le route
router.use((req: Request, res: Response, next: NextFunction) =>
  authMiddleware(req as AuthRequest, res, next),
);

// ============================================================
// GET /api/exercises?muscleGroup=petto&category=pesi
// Libreria condivisa — ritorna tutti gli esercizi (opzionalmente filtrati).
// ============================================================
router.get('/', async (req: Request, res: Response): Promise<void> => {
  const { muscleGroup, category } = req.query;

  const filters: string[] = [];
  const params: unknown[] = [];

  if (typeof muscleGroup === 'string' && muscleGroup.length > 0) {
    params.push(muscleGroup);
    filters.push(`muscle_group = $${params.length}`);
  }
  if (typeof category === 'string' && category.length > 0) {
    params.push(category);
    filters.push(`category = $${params.length}`);
  }

  const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
  const sql = `
    SELECT id, name, muscle_group, category, difficulty
    FROM exercises
    ${where}
    ORDER BY muscle_group, name
  `;

  const result = await pool.query<Exercise>(sql, params);
  res.json(result.rows);
});

export default router;
