import { Router } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { pool } from '../db/pool.js';
import { config } from '../config.js';
import { rankUpCost } from '../services/progressionService.js';
import { bossNameFor } from '../services/bossService.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const router = Router();
const SALT_ROUNDS = 12;
const MUSCLE_GROUPS = ['petto', 'schiena', 'gambe', 'spalle', 'braccia', 'core', 'cardio'];

router.post('/register', asyncHandler(async (req, res) => {
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    res.status(400).json({ error: 'username, email e password sono obbligatori' });
    return;
  }
  if (password.length < 8) {
    res.status(400).json({ error: 'La password deve essere di almeno 8 caratteri' });
    return;
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const result = await client.query(
      `INSERT INTO users (username, email, password_hash)
       VALUES ($1, $2, $3)
       RETURNING id, username, email, body_weight_kg, weekly_goal, created_at`,
      [username.trim(), email.trim().toLowerCase(), passwordHash],
    );

    const user = result.rows[0];

    for (const group of MUSCLE_GROUPS) {
      await client.query(
        `INSERT INTO muscle_group_progress (user_id, muscle_group) VALUES ($1, $2)`,
        [user.id, group],
      );
    }

    const tier1Hp = rankUpCost(1);
    for (const group of MUSCLE_GROUPS) {
      await client.query(
        `INSERT INTO bosses (user_id, muscle_group, boss_name, tier, max_hp, current_hp)
         VALUES ($1, $2, $3, 1, $4, $4)`,
        [user.id, group, bossNameFor(1, group), tier1Hp],
      );
    }

    await client.query(
      `INSERT INTO streak_state (user_id, goal_at_week_start) VALUES ($1, $2)`,
      [user.id, user.weekly_goal],
    );

    await client.query('COMMIT');

    const token = jwt.sign(
      { userId: user.id, username: user.username },
      config.jwtSecret,
      { expiresIn: '24h' },
    );

    res.status(201).json({ token, user });
  } catch (err) {
    await client.query('ROLLBACK');
    if (err.code === '23505') {
      res.status(409).json({ error: 'Username o email già in uso' });
      return;
    }
    throw err;
  } finally {
    client.release();
  }
}));

router.post('/login', asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400).json({ error: 'email e password sono obbligatori' });
    return;
  }

  const result = await pool.query(
    `SELECT id, username, email, password_hash, body_weight_kg, weekly_goal
     FROM users WHERE email = $1`,
    [email.trim().toLowerCase()],
  );

  const INVALID_MSG = 'Credenziali non valide';

  if (result.rows.length === 0) {
    res.status(401).json({ error: INVALID_MSG });
    return;
  }

  const user = result.rows[0];
  const passwordValid = await bcrypt.compare(password, user.password_hash);

  if (!passwordValid) {
    res.status(401).json({ error: INVALID_MSG });
    return;
  }

  const token = jwt.sign(
    { userId: user.id, username: user.username },
    config.jwtSecret,
    { expiresIn: '24h' },
  );

  const { password_hash: _omit, ...userWithoutHash } = user;

  res.json({ token, user: userWithoutHash });
}));

export default router;
