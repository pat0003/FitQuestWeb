import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { AuthRequest } from '../types';

interface JwtPayload {
  userId: string;
  username: string;
}

export function authMiddleware(req: AuthRequest, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;

  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Token mancante' });
    return;
  }

  try {
    const token = header.split(' ')[1];
    const payload = jwt.verify(token, config.jwtSecret) as JwtPayload;
    req.userId = payload.userId;
    req.username = payload.username;
    next();
  } catch {
    res.status(401).json({ error: 'Token non valido' });
  }
}
