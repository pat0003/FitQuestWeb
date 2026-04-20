import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  databaseUrl: process.env.DATABASE_URL || 'postgresql://fitquest:fitquest@localhost:5432/fitquest',
  jwtSecret: process.env.JWT_SECRET || 'dev-secret-change-in-production',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost',
};
