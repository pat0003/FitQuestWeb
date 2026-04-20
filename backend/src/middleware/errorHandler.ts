import { Request, Response, NextFunction } from 'express';

// Error handler centralizzato — firma a 4 parametri obbligatoria per Express
export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  console.error('[ERROR]', err.stack);
  res.status(500).json({ error: 'Errore interno del server' });
}
