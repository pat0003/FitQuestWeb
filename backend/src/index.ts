import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { config } from './config';
import authRouter from './routes/auth';
import userRouter from './routes/user';
import exercisesRouter from './routes/exercises';
import workoutsRouter from './routes/workouts';
import { errorHandler } from './middleware/errorHandler';

const app = express();

// ── CORS ─────────────────────────────────────────────────────
// Origini esplicitamente consentite — mai '*' in produzione
app.use(cors({ origin: config.corsOrigin }));

// ── Body parser ───────────────────────────────────────────────
app.use(express.json());

// ── Rate limiting sulle route di autenticazione ───────────────
// Max 20 tentativi ogni 15 minuti per IP — difesa brute-force
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Troppi tentativi, riprova tra qualche minuto' },
});

// ── Routes ────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/auth', authLimiter, authRouter);
app.use('/api/user', userRouter);
app.use('/api/exercises', exercisesRouter);
app.use('/api/workouts', workoutsRouter);

// ── Error handler centralizzato (deve essere l'ultimo middleware) ──
app.use(errorHandler);

// ── Start ────────────────────────────────────────────────────
app.listen(config.port, () => {
  console.log(`Backend in ascolto su porta ${config.port}`);
});
