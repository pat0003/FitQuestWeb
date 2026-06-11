// Express 4 non cattura errori da async route handlers.
// Questo wrapper li intercetta e li passa a next(err) → errorHandler.
export const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

// Error handler centralizzato — firma a 4 parametri obbligatoria per Express
export function errorHandler(err, _req, res, _next) {
  console.error('[ERROR]', err.stack);
  res.status(500).json({ error: 'Errore interno del server' });
}
