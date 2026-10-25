import express from 'express';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { ZodError } from 'zod';
import { serializeProduct } from './database.js';
import { orderReceipt, placeOrder, SHIPPING, StoreError } from './orders.js';
import {
  lookupSchema,
  newsletterSchema,
  orderSchema,
  requestKeySchema,
} from './validation.js';

export function createApp(
  database,
  { staticDirectory = resolve('dist'), rateLimits = true } = {},
) {
  const app = express();
  app.disable('x-powered-by');
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
          fontSrc: ["'self'", 'https://fonts.gstatic.com'],
          imgSrc: ["'self'", 'data:'],
          connectSrc: ["'self'"],
          upgradeInsecureRequests: null,
        },
      },
      strictTransportSecurity: process.env.NODE_ENV === 'production' ? undefined : false,
    }),
  );
  app.use('/api', express.json({ limit: '16kb' }));
  app.use('/api', (_request, response, next) => {
    response.setHeader('Cache-Control', 'no-store');
    next();
  });

  const checkoutLimit = rateLimits
    ? rateLimit({
        windowMs: 15 * 60 * 1000,
        limit: 30,
        standardHeaders: 'draft-8',
        legacyHeaders: false,
        message: { error: 'Too many attempts. Please try again in 15 minutes.' },
      })
    : (_request, _response, next) => next();

  app.get('/api/health', (_request, response) => {
    database.prepare('SELECT 1').get();
    response.json({ status: 'ok', database: 'sqlite', demo: true });
  });

  app.get('/api/products', (_request, response) => {
    const products = database
      .prepare('SELECT * FROM products ORDER BY rowid')
      .all()
      .map(serializeProduct);
    response.json({ products, shipping: SHIPPING });
  });

  app.get('/api/products/:id', (request, response) => {
    const row = database
      .prepare('SELECT * FROM products WHERE id = ?')
      .get(request.params.id);
    if (!row) throw new StoreError('Watch not found.', 404);
    response.json({ product: serializeProduct(row) });
  });

  app.post('/api/orders', checkoutLimit, (request, response) => {
    const key = requestKeySchema.parse(request.get('Idempotency-Key'));
    const payload = orderSchema.parse(request.body);
    const { receipt, repeated } = placeOrder(database, payload, key);
    response.status(repeated ? 200 : 201).json({ order: receipt });
  });

  // No public order list. Lookup requires the random reference and matching email.
  app.post('/api/orders/lookup', checkoutLimit, (request, response) => {
    const payload = lookupSchema.parse(request.body);
    const order = database
      .prepare('SELECT id FROM orders WHERE order_number = ? AND email = ?')
      .get(payload.orderNumber, payload.email);
    if (!order) throw new StoreError('No order matches those details.', 404);
    response.json({ order: orderReceipt(database, order.id) });
  });

  app.post('/api/newsletter', checkoutLimit, (request, response) => {
    const { email } = newsletterSchema.parse(request.body);
    database.prepare('INSERT OR IGNORE INTO subscribers (email) VALUES (?)').run(email);
    response.status(201).json({
      message: 'You’re on the list. Your demo subscription is saved.',
      demo: true,
    });
  });

  app.use('/api', (_request, response) =>
    response.status(404).json({ error: 'API route not found.' }),
  );

  if (existsSync(staticDirectory)) {
    app.use(express.static(staticDirectory));
    app.get('/{*path}', (request, response) => {
      if (request.path.includes('.')) return response.status(404).send('File not found.');
      response.sendFile(resolve(staticDirectory, 'index.html'));
    });
  }

  app.use((error, _request, response, _next) => {
    if (error instanceof ZodError) {
      return response.status(400).json({
        error: 'Please check the highlighted details and try again.',
        fields: error.issues.map((issue) => ({
          path: issue.path.join('.'),
          message: issue.message,
        })),
      });
    }
    if (error instanceof StoreError)
      return response.status(error.status).json({ error: error.message });
    if (error.type === 'entity.parse.failed')
      return response.status(400).json({ error: 'Invalid JSON body.' });
    if (error.type === 'entity.too.large')
      return response.status(413).json({ error: 'Request is too large.' });
    console.error('Request failed:', error.message);
    response.status(500).json({ error: 'Something went wrong. Please try again.' });
  });
  return app;
}
