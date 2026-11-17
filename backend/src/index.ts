import express, { Request, Response } from 'express';
import cors from 'cors';
import { config } from './config';
import authRoutes from './routes/auth.routes';
import taskRoutes from './routes/task.routes';
import { errorHandler } from './middleware/errorHandler';
import { dataService } from './services/dataService';

const app = express();

// Configuration CORS : Autorise les requêtes depuis Vercel ou en local
app.use(
  cors({
    origin: config.frontendUrl === '*' ? true : [config.frontendUrl, 'http://localhost:3000'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-gateway-secret'],
  })
);

app.use(express.json());

// Log minimal des requêtes en développement/production
app.use((req, _res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Route racine
app.get('/', (_req: Request, res: Response) => {
  res.json({
    message: 'API TaskFlow opérationnelle',
    version: '1.0.0',
    mode: config.gatewayUrl ? 'hybrid_via_gateway' : (config.databaseUrl ? 'direct_database' : 'not_connected'),
  });
});

// Route de santé (Health check)
app.get('/api/health', async (_req: Request, res: Response) => {
  const health = await dataService.checkHealth();
  res.status(health.status === 'healthy' ? 200 : 503).json({
    api: 'online',
    timestamp: new Date().toISOString(),
    dataService: health,
  });
});

// Routes de l'API
app.use('/api/auth', authRoutes);
app.use('/api/tasks', taskRoutes);

// Gestion des routes inexistantes (404)
app.use((_req: Request, res: Response) => {
  res.status(404).json({ message: 'Route introuvable sur le serveur API.' });
});

// Middleware global de gestion des erreurs
app.use(errorHandler);

const PORT = config.port;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`===============================================`);
  console.log(` Serveur TaskFlow API démarré sur le port ${PORT}`);
  console.log(` Mode : ${config.gatewayUrl ? 'Architecture Hybride (Passerelle Locale)' : 'Direct PostgreSQL'}`);
  console.log(` Environnement : ${config.nodeEnv}`);
  console.log(`===============================================`);
});

export default app;
