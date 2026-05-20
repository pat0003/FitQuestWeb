// Error handler centralizzato — firma a 4 parametri obbligatoria per Express
export function errorHandler(err, _req, res, _next) {
  console.error('[ERROR]', err.stack);
  res.status(500).json({ error: 'Errore interno del server' });
}
