import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  jwtSecret: process.env.JWT_SECRET || 'taskflow_default_secret_key_change_me',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '24h',
  gatewayUrl: process.env.GATEWAY_URL?.replace(/\/$/, '') || '',
  gatewaySecret: process.env.GATEWAY_SECRET || 'taskflow_shared_secret_2026',
  databaseUrl: process.env.DATABASE_URL || '',
  frontendUrl: process.env.FRONTEND_URL || '*',
  nodeEnv: process.env.NODE_ENV || 'development',
};
