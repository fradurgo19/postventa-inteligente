import { Router } from 'express';

interface SapItemResponse {
  refSap: string;
  price: number;
  stock: number;
  warehouse: string;
  currency: string;
  available: boolean;
}

/**
 * Placeholder SAP Business One Service Layer.
 * Sustituir por integración real cuando estén disponibles credenciales.
 */
export const sapRouter = Router();

sapRouter.get('/items/:refSap', (req, res) => {
  const refSap = req.params.refSap;

  const response: SapItemResponse = {
    refSap,
    price: 0,
    stock: 0,
    warehouse: 'Pendiente SAP',
    currency: 'COP',
    available: false,
  };

  res.json(response);
});

sapRouter.post('/quotes', (_req, res) => {
  res.status(501).json({
    error: 'Cotización SAP no implementada — conectar Service Layer',
  });
});
