import { Router, Request, Response, NextFunction } from 'express';
import { authMiddleware } from '../middleware/auth';
import { pool } from '../db/pool';
import {
  AuthRequest,
  Workout,
  WorkoutExercise,
  ExerciseSet,
  Exercise,
  ExerciseCategory,
  Difficulty,
  MuscleGroup,
} from '../types';
import { calcSetXp, validateSetInput } from '../services/xpCalculator';

const router = Router();

router.use((req: Request, res: Response, next: NextFunction) =>
  authMiddleware(req as AuthRequest, res, next),
);

// ============================================================
// POST /api/workouts
// Inizia un nuovo workout
// ============================================================
router.post('/', async (req: Request, res: Response): Promise<void> => {
  const { userId } = req as AuthRequest;
  const { notes } = req.body as { notes?: string };

  const result = await pool.query<Workout>(
    `INSERT INTO workouts (user_id, notes)
     VALUES ($1, $2)
     RETURNING id, user_id, started_at, completed_at, total_xp, notes`,
    [userId, notes ?? null],
  );

  res.status(201).json({ workout: result.rows[0] });
});

// ============================================================
// GET /api/workouts?limit=10&offset=0
// Storico workout dell'utente
// ============================================================
router.get('/', async (req: Request, res: Response): Promise<void> => {
  const { userId } = req as AuthRequest;
  const limit = Math.min(Math.max(parseInt(String(req.query.limit ?? '10'), 10) || 10, 1), 50);
  const offset = Math.max(parseInt(String(req.query.offset ?? '0'), 10) || 0, 0);

  const result = await pool.query<Workout>(
    `SELECT id, user_id, started_at, completed_at, total_xp, notes
     FROM workouts
     WHERE user_id = $1
     ORDER BY started_at DESC
     LIMIT $2 OFFSET $3`,
    [userId, limit, offset],
  );

  res.json(result.rows);
});

// ============================================================
// GET /api/workouts/:id
// Dettaglio workout + esercizi + set
// ============================================================
router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  const { userId } = req as AuthRequest;
  const { id } = req.params;

  const wRes = await pool.query<Workout>(
    `SELECT id, user_id, started_at, completed_at, total_xp, notes
     FROM workouts WHERE id = $1 AND user_id = $2`,
    [id, userId],
  );
  if (wRes.rows.length === 0) {
    res.status(404).json({ error: 'Workout non trovato' });
    return;
  }
  const workout = wRes.rows[0];

  const weRes = await pool.query<WorkoutExercise & Exercise>(
    `SELECT we.id, we.workout_id, we.exercise_id, we.order_index, we.xp_earned,
            e.id AS e_id, e.name, e.muscle_group, e.category, e.difficulty
     FROM workout_exercises we
     JOIN exercises e ON e.id = we.exercise_id
     WHERE we.workout_id = $1
     ORDER BY we.order_index ASC`,
    [id],
  );

  const weIds = weRes.rows.map((r) => r.id);
  const setsRes = weIds.length
    ? await pool.query<ExerciseSet>(
        `SELECT id, workout_exercise_id, set_number, reps, weight_kg, seconds, ballast_kg, xp_earned
         FROM exercise_sets
         WHERE workout_exercise_id = ANY($1::uuid[])
         ORDER BY set_number ASC`,
        [weIds],
      )
    : { rows: [] as ExerciseSet[] };

  const setsByWe = new Map<string, ExerciseSet[]>();
  for (const s of setsRes.rows) {
    const arr = setsByWe.get(s.workout_exercise_id) ?? [];
    arr.push(s);
    setsByWe.set(s.workout_exercise_id, arr);
  }

  const exercises: WorkoutExercise[] = weRes.rows.map((r) => ({
    id: r.id,
    workout_id: r.workout_id,
    exercise_id: r.exercise_id,
    order_index: r.order_index,
    xp_earned: r.xp_earned,
    exercise: {
      id: r.exercise_id,
      name: r.name,
      muscle_group: r.muscle_group,
      category: r.category,
      difficulty: r.difficulty,
    },
    sets: setsByWe.get(r.id) ?? [],
  }));

  res.json({ workout, exercises });
});

// ============================================================
// POST /api/workouts/:id/exercises
// Aggiungi un esercizio al workout
// ============================================================
router.post('/:id/exercises', async (req: Request, res: Response): Promise<void> => {
  const { userId } = req as AuthRequest;
  const { id } = req.params;
  const { exerciseId } = req.body as { exerciseId?: string };

  if (!exerciseId) {
    res.status(400).json({ error: 'exerciseId richiesto' });
    return;
  }

  const wRes = await pool.query<{ completed_at: string | null }>(
    `SELECT completed_at FROM workouts WHERE id = $1 AND user_id = $2`,
    [id, userId],
  );
  if (wRes.rows.length === 0) {
    res.status(404).json({ error: 'Workout non trovato' });
    return;
  }
  if (wRes.rows[0].completed_at !== null) {
    res.status(400).json({ error: 'Workout già completato' });
    return;
  }

  // Verifica esistenza esercizio
  const eRes = await pool.query(`SELECT 1 FROM exercises WHERE id = $1`, [exerciseId]);
  if (eRes.rows.length === 0) {
    res.status(404).json({ error: 'Esercizio non trovato' });
    return;
  }

  const orderRes = await pool.query<{ next: number }>(
    `SELECT COALESCE(MAX(order_index), -1) + 1 AS next
     FROM workout_exercises WHERE workout_id = $1`,
    [id],
  );
  const orderIndex = orderRes.rows[0].next;

  const insRes = await pool.query<WorkoutExercise>(
    `INSERT INTO workout_exercises (workout_id, exercise_id, order_index)
     VALUES ($1, $2, $3)
     RETURNING id, workout_id, exercise_id, order_index, xp_earned`,
    [id, exerciseId, orderIndex],
  );

  res.status(201).json({ workoutExercise: insRes.rows[0] });
});

// ============================================================
// POST /api/workouts/:id/exercises/:weId/sets
// Logga un set — ricalcola XP lato server e aggiorna i totali
// ============================================================
router.post(
  '/:id/exercises/:weId/sets',
  async (req: Request, res: Response): Promise<void> => {
    const { userId } = req as AuthRequest;
    const { id, weId } = req.params;
    const body = req.body as {
      reps?: number;
      weightKg?: number;
      seconds?: number;
      ballastKg?: number;
    };

    // Carica tutto ciò che serve in una query
    const ctxRes = await pool.query<{
      user_id: string;
      completed_at: string | null;
      category: ExerciseCategory;
      difficulty: Difficulty;
      body_weight_kg: number;
    }>(
      `SELECT w.user_id, w.completed_at, e.category, e.difficulty, u.body_weight_kg
       FROM workout_exercises we
       JOIN workouts w ON w.id = we.workout_id
       JOIN exercises e ON e.id = we.exercise_id
       JOIN users u    ON u.id = w.user_id
       WHERE we.id = $1 AND w.id = $2`,
      [weId, id],
    );

    if (ctxRes.rows.length === 0) {
      res.status(404).json({ error: 'Workout o esercizio non trovato' });
      return;
    }
    const ctx = ctxRes.rows[0];
    if (ctx.user_id !== userId) {
      res.status(404).json({ error: 'Workout non trovato' });
      return;
    }
    if (ctx.completed_at !== null) {
      res.status(400).json({ error: 'Workout già completato' });
      return;
    }

    const validationError = validateSetInput(ctx.category, body);
    if (validationError) {
      res.status(400).json({ error: validationError });
      return;
    }

    const xp = calcSetXp({
      category: ctx.category,
      difficulty: ctx.difficulty,
      bodyWeightKg: ctx.body_weight_kg,
      reps: body.reps,
      weightKg: body.weightKg,
      seconds: body.seconds,
      ballastKg: body.ballastKg,
    });

    // Transazione: INSERT set + UPDATE we.xp_earned + UPDATE workout.total_xp
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const setNumRes = await client.query<{ next: number }>(
        `SELECT COALESCE(MAX(set_number), 0) + 1 AS next
         FROM exercise_sets WHERE workout_exercise_id = $1`,
        [weId],
      );
      const setNumber = setNumRes.rows[0].next;

      const insRes = await client.query<ExerciseSet>(
        `INSERT INTO exercise_sets
           (workout_exercise_id, set_number, reps, weight_kg, seconds, ballast_kg, xp_earned)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id, workout_exercise_id, set_number, reps, weight_kg, seconds, ballast_kg, xp_earned`,
        [
          weId,
          setNumber,
          body.reps ?? null,
          body.weightKg ?? null,
          body.seconds ?? null,
          body.ballastKg ?? 0,
          xp,
        ],
      );

      await client.query(
        `UPDATE workout_exercises SET xp_earned = xp_earned + $1 WHERE id = $2`,
        [xp, weId],
      );
      await client.query(`UPDATE workouts SET total_xp = total_xp + $1 WHERE id = $2`, [
        xp,
        id,
      ]);

      await client.query('COMMIT');
      res.status(201).json({ set: insRes.rows[0], xpEarned: xp });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },
);

// ============================================================
// POST /api/workouts/:id/complete
// Chiude il workout — in Fase 2 solo completed_at + xpSummary
// (rankUps e bossUpdates verranno implementati in Fase 3)
// ============================================================
router.post('/:id/complete', async (req: Request, res: Response): Promise<void> => {
  const { userId } = req as AuthRequest;
  const { id } = req.params;

  const wRes = await pool.query<{ completed_at: string | null }>(
    `SELECT completed_at FROM workouts WHERE id = $1 AND user_id = $2`,
    [id, userId],
  );
  if (wRes.rows.length === 0) {
    res.status(404).json({ error: 'Workout non trovato' });
    return;
  }
  if (wRes.rows[0].completed_at !== null) {
    res.status(400).json({ error: 'Workout già completato' });
    return;
  }

  const updated = await pool.query<Workout>(
    `UPDATE workouts SET completed_at = NOW() WHERE id = $1
     RETURNING id, user_id, started_at, completed_at, total_xp, notes`,
    [id],
  );

  // XP per gruppo muscolare
  const aggRes = await pool.query<{ muscle_group: MuscleGroup; xp: number }>(
    `SELECT e.muscle_group, COALESCE(SUM(we.xp_earned), 0)::int AS xp
     FROM workout_exercises we
     JOIN exercises e ON e.id = we.exercise_id
     WHERE we.workout_id = $1
     GROUP BY e.muscle_group`,
    [id],
  );

  const perMuscleGroup: Partial<Record<MuscleGroup, number>> = {};
  for (const r of aggRes.rows) perMuscleGroup[r.muscle_group] = r.xp;

  res.json({
    workout: updated.rows[0],
    xpSummary: {
      totalXp: updated.rows[0].total_xp,
      perMuscleGroup,
    },
    rankUps: [],
    bossUpdates: [],
  });
});

export default router;
