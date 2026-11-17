import { Request, Response, NextFunction } from 'express';
import { DataUnavailableError } from '../services/dataService';

export const errorHandler = (
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  console.error('[Erreur Serveur]', err);

  if (err instanceof DataUnavailableError) {
    res.status(err.statusCode || 503).json({
      message: err.message,
      error: 'DATA_SERVICE_UNAVAILABLE',
    });
    return;
  }

  const statusCode = err.statusCode || err.status || 500;
  const message = err.message || 'Une erreur interne est survenue sur le serveur.';

  res.status(statusCode).json({
    message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
  });
};
