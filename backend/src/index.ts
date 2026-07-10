import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { loadConfig } from './config/env';
import { apiRouter } from './routes/api';
import { healthRouter } from './routes/health';
import { sapRouter } from './routes/sap';

const config = loadConfig();
const app = express();

app.use(helmet());
app.use(cors({ origin: config.corsOrigin }));
app.use(express.json());

app.use('/health', healthRouter);
app.use('/api', apiRouter);
app.use('/api/sap', sapRouter);

app.use((_req, res) => {
  res.status(404).json({ error: 'Recurso no encontrado' });
});

app.listen(config.port, () => {
  console.log(`[partequipos-backend] Escuchando en http://localhost:${config.port}`);
});
