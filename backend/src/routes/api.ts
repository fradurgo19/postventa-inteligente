import { Router } from 'express';

/**
 * Rutas REST placeholder — sin lógica de negocio.
 * Sustituir implementaciones mock del frontend al conectar Supabase y SAP.
 */
export const apiRouter = Router();

apiRouter.get('/machines', (_req, res) => {
  res.json({ data: [], message: 'Endpoint placeholder — conectar Supabase' });
});

apiRouter.get('/parts', (_req, res) => {
  res.json({ data: [], message: 'Endpoint placeholder — conectar SAP / Supabase' });
});

apiRouter.get('/maintenance', (_req, res) => {
  res.json({ data: [], message: 'Endpoint placeholder — conectar Supabase' });
});
