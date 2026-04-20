import { Router, Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { pool } from '../db/pool';
import { config } from '../config';

const router = Router();
const SALT_ROUNDS = 12;
const MUSCLE_GROUPS = ['petto', 'schiena', 'gambe', 'spalle', 'braccia', 'core', 'cardio'];

// ============================================================
// POST /api/auth/register
// ============================================================
router.post('/register', async (req: Request, res: Response): Promise<void> => {
  try {
    const { username, email, password } = req.body as {
      username?: string;
      email?: string;
      password?: string;
    };

    // Validazione input
    if (!username || !email || !password) {
      res.status(400).json({ error: 'username, email e password sono obbligatori' });
      return;
    }
    if (password.length < 8) {
      res.status(400).json({ error: 'La password deve essere di almeno 8 caratteri' });
      return;
    }

    // Hash password con bcrypt (12 salt rounds — argomento del corso)
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    // INSERT utente con prepared statement — no SQL injection possibile
    const result = await pool.query<{
      id: string; username: string; email: string;
      body_weight_kg: number; weekly_goal: number; created_at: string;
    }>(
      `INSERT INTO users (username, email, password_hash)
       VALUES ($1, $2, $3)
       RETURNING id, username, email, body_weight_kg, weekly_goal, created_at`,
      [username.trim(), email.trim().toLowerCase(), passwordHash],
    );

    const user = result.rows[0];

    // Inizializza progressione per i 7 gruppi muscolari
    // (una riga per gruppo, così le query successive non trovano mai "riga mancante")
    for (const group of MUSCLE_GROUPS) {
      await pool.query(
        `INSERT INTO muscle_group_progress (user_id, muscle_group) VALUES ($1, $2)`,
        [user.id, group],
      );
    }

    // Inizializza streak state
    await pool.query(
      `INSERT INTO streak_state (user_id) VALUES ($1)`,
      [user.id],
    );

    // Genera JWT — secret da variabile d'ambiente, mai hardcodato
    const token = jwt.sign(
      { userId: user.id, username: user.username },
      config.jwtSecret,
      { expiresIn: '24h' },
    );

    res.status(201).json({ token, user });
  } catch (err: unknown) {
    // Codice PostgreSQL 23505 = unique_violation (email o username già in uso)
    if (
      err instanceof Error &&
      'code' in err &&
      (err as NodeJS.ErrnoException & { code: string }).code === '23505'
    ) {
      res.status(409).json({ error: 'Username o email già in uso' });
      return;
    }
    throw err; // rilancio per errorHandler centralizzato
  }
});

// ============================================================
// POST /api/auth/login
// ============================================================
router.post('/login', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body as { email?: string; password?: string };

    if (!email || !password) {
      res.status(400).json({ error: 'email e password sono obbligatori' });
      return;
    }

    // Cerca utente per email
    const result = await pool.query<{
      id: string; username: string; email: string;
      password_hash: string; body_weight_kg: number; weekly_goal: number;
    }>(
      `SELECT id, username, email, password_hash, body_weight_kg, weekly_goal
       FROM users WHERE email = $1`,
      [email.trim().toLowerCase()],
    );

    // Stesso messaggio se utente non esiste O password sbagliata — anti-enumeration
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

    // Rimuovi password_hash dalla risposta
    const { password_hash: _omit, ...userWithoutHash } = user;

    res.json({ token, user: userWithoutHash });
  } catch (err) {
    throw err;
  }
});

export default router;
