import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { pool } from '../db/pool.js';
import { processWeekRolloverIfNeeded, bonusPctFor } from '../services/streakService.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const router = Router();

router.use((req, res, next) => authMiddleware(req, res, next));

router.get('/', asyncHandler(async (req, res) => {
  const { userId } = req;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const stRes = await client.query(
      `SELECT current_streak, streak_tier, week_start, workouts_this_week, best_streak, goal_at_week_start
       FROM streak_state WHERE user_id = $1 FOR UPDATE`,
      [userId],
    );
    if (stRes.rows.length === 0) {
      await client.query('ROLLBACK');
      res.status(404).json({ error: 'Streak state non trovato' });
      return;
    }

    const goalRes = await client.query(
      `SELECT weekly_goal FROM users WHERE id = $1`,
      [userId],
    );
    const weeklyGoal = goalRes.rows[0].weekly_goal;

    const state = {
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

    await client.query('COMMIT');

    const finalState = result.state;
    const summary = {
      current_streak: finalState.current_streak,
      streak_tier: finalState.streak_tier,
      weekly_goal: weeklyGoal,
      workouts_this_week: finalState.workouts_this_week,
      best_streak: finalState.best_streak,
      bonus_pct: bonusPctFor(finalState.streak_tier),
      week_start: finalState.week_start.toISOString().slice(0, 10),
    };
    res.json(summary);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}));

export default router;
