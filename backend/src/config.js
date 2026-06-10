import dotenv from 'dotenv';
dotenv.config();

const NODE_ENV = process.env.NODE_ENV ?? 'development';
const isProd = NODE_ENV === 'production';

const rawJwtSecret = process.env.JWT_SECRET;
if (isProd && (!rawJwtSecret || rawJwtSecret === 'dev-secret-change-in-production')) {
  throw new Error(
    'JWT_SECRET non impostato (o uguale al default) in produzione. ' +
      'Imposta una stringa casuale lunga >= 32 caratteri.',
  );
}

const rawCorsOrigin = process.env.CORS_ORIGIN ?? 'http://localhost';
const corsOriginList = rawCorsOrigin
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

export const config = {
  nodeEnv: NODE_ENV,
  isProd,
  port: parseInt(process.env.PORT ?? '3000', 10),
  databaseUrl:
    process.env.DATABASE_URL ?? 'postgresql://fitquest:fitquest@localhost:5432/fitquest',
  jwtSecret: rawJwtSecret ?? 'dev-secret-change-in-production',
  corsOrigin: corsOriginList.length === 1 ? corsOriginList[0] : corsOriginList,
};
