import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { config } from './config.js';
import authRouter from './routes/auth.js';
import userRouter from './routes/user.js';
import exercisesRouter from './routes/exercises.js';
import workoutsRouter from './routes/workouts.js';
import progressionRouter from './routes/progression.js';
import bossesRouter from './routes/bosses.js';
import streakRouter from './routes/streak.js';
import { errorHandler } from './middleware/errorHandler.js';

const app = express();

app.use(cors({ origin: config.corsOrigin }));
app.use(express.json());

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Troppi tentativi, riprova tra qualche minuto' },
});

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/auth', authLimiter, authRouter);
app.use('/api/user', userRouter);
app.use('/api/exercises', exercisesRouter);
app.use('/api/workouts', workoutsRouter);
app.use('/api/progress', progressionRouter);
app.use('/api/bosses', bossesRouter);
app.use('/api/streak', streakRouter);

app.use(errorHandler);

app.listen(config.port, () => {
  console.log(`Backend in ascolto su porta ${config.port}`);
});
