import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { pool } from '../db/pool.js';

const router = Router();

router.use((req, res, next) => authMiddleware(req, res, next));

router.get('/', async (req, res) => {
  const { muscleGroup, category } = req.query;

  const filters = [];
  const params = [];

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

  const result = await pool.query(sql, params);
  res.json(result.rows);
});

export default router;
