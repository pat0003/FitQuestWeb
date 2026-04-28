import { Router, Request, Response, NextFunction } from 'express';
import { PoolClient } from 'pg';
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
  RankUpEvent,
  BossUpdate,
} from '../types';
import { calcSetXp, validateSetInput } from '../services/xpCalculator';
import {
  applyXpToGroup,
  rankUpCost,
  ProgressState,
  BossState,
  MAX_BAND,
} from '../services/progressionService';
import { bossNameFor } from '../services/bossService';
import {
  StreakTier,
  StreakStateInput,
  processWeekRolloverIfNeeded,
} from '../services/streakService';

/**
 * Helper: legge streak_state + users.weekly_goal, applica rollover se necessario,
 * persiste eventuali modifiche. Ritorna il tier corrente da usare per il calcolo XP.
 *
 * Va chiamato DENTRO una transazione (riceve il client). Usa SELECT FOR UPDATE
 * per evitare race condition con altri sets/complete concorrenti.
 */
async function syncStreakAndGetTier(
  client: PoolClient,
  userId: string,
): Promise<{ tier: StreakTier; state: StreakStateInput; weeklyGoal: number }> {
  const stRes = await client.query<{
    current_streak: number;
    streak_tier: StreakTier;
    week_start: Date;
    workouts_this_week: number;
    best_streak: number;
    goal_at_week_start: number;
  }>(
    `SELECT current_streak, streak_tier, week_start, workouts_this_week, best_streak, goal_at_week_start
     FROM streak_state WHERE user_id = $1 FOR UPDATE`,
    [userId],
  );
  if (stRes.rows.length === 0) {
    throw new Error('streak_state row mancante per user ' + userId);
  }
  const goalRes = await client.query<{ weekly_goal: number }>(
    `SELECT weekly_goal FROM users WHERE id = $1`,
    [userId],
  );
  const weeklyGoal = goalRes.rows[0].weekly_goal;

  const state: StreakStateInput = {
    current_streak: stRes.rows[0].current_streak,
    streak_tier: stRes.rows[0].streak_tier,
    week_start: stRes.rows[0].week_start,
    workouts_this_week: stRes.rows[0].workouts_this_week,
    best_streak: stRes.rows[0].best_streak,
    goal_at_week_start: stRes.rows[0].goal_at_week_start,
  };

  const result = processWeekRolloverIfNeeded(state, weeklyGoal, new Date());

  if (result.changed) {
    await client.query(
      `UPDATE streak_state
       SET current_streak = $1, streak_tier = $2, week_start = $3,
           workouts_this_week = $4, best_streak = $5, goal_at_week_start = $6
       WHERE user_id = $7`,
      [
        result.state.current_streak,
        result.state.streak_tier,
        result.state.week_start.toISOString().slice(0, 10),
        result.state.workouts_this_week,
        result.state.best_streak,
        result.state.goal_at_week_start,
        userId,
      ],
    );
  }

  return { tier: result.state.streak_tier, state: result.state, weeklyGoal };
}

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

    // Transazione: rollover streak + INSERT set + UPDATE totali
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Rollover lazy: se siamo in una nuova settimana ISO, processa la transizione
      // e leggi il tier corrente da applicare al moltiplicatore XP.
      const { tier } = await syncStreakAndGetTier(client, userId);

      const xp = calcSetXp({
        category: ctx.category,
        difficulty: ctx.difficulty,
        bodyWeightKg: ctx.body_weight_kg,
        reps: body.reps,
        weightKg: body.weightKg,
        seconds: body.seconds,
        ballastKg: body.ballastKg,
        streakTier: tier,
      });

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
// Chiude il workout, processa progressione e boss in transazione atomica.
// Risposta: { workout, xpSummary, rankUps[], bossUpdates[] }
// ============================================================
router.post('/:id/complete', async (req: Request, res: Response): Promise<void> => {
  const { userId } = req as AuthRequest;
  const { id } = req.params;

  // Pre-check fuori dalla transazione
  const wCheck = await pool.query<{ completed_at: string | null }>(
    `SELECT completed_at FROM workouts WHERE id = $1 AND user_id = $2`,
    [id, userId],
  );
  if (wCheck.rows.length === 0) {
    res.status(404).json({ error: 'Workout non trovato' });
    return;
  }
  if (wCheck.rows[0].completed_at !== null) {
    res.status(400).json({ error: 'Workout già completato' });
    return;
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 0. Rollover streak (se siamo in nuova settimana ISO) + incremento workouts_this_week.
    // Va PRIMA di tutto perché un eventuale rollover deve avvenire sullo stato "vecchio"
    // e il workout corrente conta nella nuova settimana che inizia dopo il rollover.
    await syncStreakAndGetTier(client, userId);
    await client.query(
      `UPDATE streak_state SET workouts_this_week = workouts_this_week + 1
       WHERE user_id = $1`,
      [userId],
    );

    // 1. Marca completato
    const updated = await client.query<Workout>(
      `UPDATE workouts SET completed_at = NOW() WHERE id = $1
       RETURNING id, user_id, started_at, completed_at, total_xp, notes`,
      [id],
    );

    // 2. XP aggregato per gruppo muscolare in questo workout
    const aggRes = await client.query<{ muscle_group: MuscleGroup; xp: number }>(
      `SELECT e.muscle_group, COALESCE(SUM(we.xp_earned), 0)::int AS xp
       FROM workout_exercises we
       JOIN exercises e ON e.id = we.exercise_id
       WHERE we.workout_id = $1
       GROUP BY e.muscle_group`,
      [id],
    );

    const perMuscleGroup: Partial<Record<MuscleGroup, number>> = {};
    for (const r of aggRes.rows) perMuscleGroup[r.muscle_group] = r.xp;

    const rankUps: RankUpEvent[] = [];
    const bossUpdates: BossUpdate[] = [];

    // 3. Per ogni gruppo con XP > 0, applica progressione + boss
    for (const [group, xp] of Object.entries(perMuscleGroup)) {
      if (!xp || xp <= 0) continue;
      const muscleGroup = group as MuscleGroup;

      // Carica stato attuale
      const progRes = await client.query<ProgressState>(
        `SELECT rank_band, rank_sub, current_xp, total_xp::int
         FROM muscle_group_progress
         WHERE user_id = $1 AND muscle_group = $2
         FOR UPDATE`,
        [userId, muscleGroup],
      );
      if (progRes.rows.length === 0) continue;
      const progress = progRes.rows[0];

      const bossRes = await client.query<BossState>(
        `SELECT tier, max_hp, current_hp, defeated FROM bosses
         WHERE user_id = $1 AND muscle_group = $2 FOR UPDATE`,
        [userId, muscleGroup],
      );
      const initialBoss = bossRes.rows.length > 0 ? bossRes.rows[0] : null;
      const bossExists = bossRes.rows.length > 0;

      // Factory che produce un nuovo boss quando avviene un rank-up
      // (richiamata dentro applyXpToGroup quando boss.current_hp <= 0)
      const nextBossFactory = (newBand: number): BossState | null => {
        // newBand è la nuova fascia raggiunta. Il boss della NUOVA fascia
        // ha tier = newBand (rappresenta il rank-up newBand → newBand+1).
        // Se newBand >= 6 (Diamante) non c'è più rank-up: nessun boss.
        if (newBand >= MAX_BAND) return null;
        const hp = rankUpCost(newBand);
        return { tier: newBand, max_hp: hp, current_hp: hp, defeated: false };
      };

      // 3a. Calcolo nuova progressione (in memoria, pure function)
      const result = applyXpToGroup(progress, initialBoss, xp, nextBossFactory);

      // 3b. Persisti progressione
      await client.query(
        `UPDATE muscle_group_progress
         SET total_xp = $1, current_xp = $2, rank_band = $3, rank_sub = $4
         WHERE user_id = $5 AND muscle_group = $6`,
        [
          result.progress.total_xp,
          result.progress.current_xp,
          result.progress.rank_band,
          result.progress.rank_sub,
          userId,
          muscleGroup,
        ],
      );

      // 3c. Persisti boss
      if (bossExists) {
        if (result.boss) {
          // Aggiorna riga esistente — può essere lo stesso boss (HP scalato)
          // o un nuovo boss della fascia successiva (tier diverso, defeated=false)
          const newName =
            result.boss.tier !== (initialBoss?.tier ?? -1)
              ? bossNameFor(result.boss.tier, muscleGroup)
              : null; // nome invariato → non lo tocchiamo
          if (newName) {
            await client.query(
              `UPDATE bosses
               SET tier = $1, boss_name = $2, max_hp = $3, current_hp = $4,
                   defeated = false, defeated_at = NULL
               WHERE user_id = $5 AND muscle_group = $6`,
              [
                result.boss.tier,
                newName,
                result.boss.max_hp,
                result.boss.current_hp,
                userId,
                muscleGroup,
              ],
            );
          } else {
            await client.query(
              `UPDATE bosses
               SET current_hp = $1, defeated = $2,
                   defeated_at = CASE WHEN $2 THEN NOW() ELSE defeated_at END
               WHERE user_id = $3 AND muscle_group = $4`,
              [result.boss.current_hp, result.boss.defeated, userId, muscleGroup],
            );
          }
        } else if (result.bossDefeated) {
          // boss == null e bossDefeated == true → Diamante raggiunto.
          // Marca l'ultimo boss come defeated.
          await client.query(
            `UPDATE bosses SET defeated = true, defeated_at = NOW(), current_hp = 0
             WHERE user_id = $1 AND muscle_group = $2`,
            [userId, muscleGroup],
          );
        }
      }

      // 3d. Accumula eventi per la risposta
      for (const ev of result.rankUps) {
        rankUps.push({
          muscle_group: muscleGroup,
          fromBand: ev.fromBand,
          fromSub: ev.fromSub,
          toBand: ev.toBand,
          toSub: ev.toSub,
        });
      }
      // Boss update SOLO se il gruppo era a sub 3 (cioè il boss è stato toccato)
      if (initialBoss && progress.rank_sub === 3 && !initialBoss.defeated) {
        const damage = initialBoss.current_hp - (result.boss?.current_hp ?? 0);
        bossUpdates.push({
          muscle_group: muscleGroup,
          boss_name: bossNameFor(initialBoss.tier, muscleGroup),
          tier: initialBoss.tier,
          current_hp: result.boss?.current_hp ?? 0,
          max_hp: initialBoss.max_hp,
          defeated: result.bossDefeated,
          damage_dealt: Math.max(0, damage),
        });
      }
    }

    await client.query('COMMIT');

    res.json({
      workout: updated.rows[0],
      xpSummary: {
        totalXp: updated.rows[0].total_xp,
        perMuscleGroup,
      },
      rankUps,
      bossUpdates,
    });
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
});

export default router;
