import { afterEach, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID, webcrypto } from 'node:crypto';
import { createRequestId } from '../../client/src/api.js';
import { openDatabase } from '../database.js';
import { createApp } from '../app.js';

let database, server, baseUrl, directory, filename;
const customer = {
  name: 'Demo Customer',
  email: 'demo@example.com',
  address: '12 Sample Avenue',
  city: 'New York',
  postalCode: '10001',
  country: 'US',
};
const payload = (items = [{ productId: 'solstice-rose', quantity: 1 }]) => ({
  customer: { ...customer },
  items,
});

beforeEach(async () => {
  directory = mkdtempSync(join(tmpdir(), 'vela-test-'));
  filename = join(directory, 'store.sqlite');
  database = openDatabase(filename);
  server = createApp(database, {
    staticDirectory: '/nonexistent',
    rateLimits: false,
  }).listen(0, '127.0.0.1');
  await once(server, 'listening');
  baseUrl = `http://127.0.0.1:${server.address().port}/api`;
});
afterEach(async () => {
  server.close();
  server.closeAllConnections();
  await once(server, 'close');
  database.close();
  rmSync(directory, { recursive: true, force: true });
});
async function request(path, body, key = randomUUID()) {
  const response = await fetch(
    `${baseUrl}${path}`,
    body === undefined
      ? {}
      : {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Idempotency-Key': key },
          body: JSON.stringify(body),
        },
  );
  return { status: response.status, body: await response.json() };
}
const stock = (id = 'solstice-rose') =>
  database.prepare('SELECT stock FROM products WHERE id = ?').get(id).stock;
const orderCount = () =>
  database.prepare('SELECT count(*) AS count FROM orders').get().count;

test('catalog is served from SQLite, with prices in integer cents', async () => {
  const result = await request('/products');
  assert.equal(result.status, 200);
  assert.equal(result.body.products.length, 3);
  assert.equal(result.body.products[0].price, 248000);
  assert.equal(result.body.shipping.freeAbove, 250000);
  assert.equal((await request('/health')).body.database, 'sqlite');
  assert.equal((await request('/products/missing')).status, 404);
});

test('checkout saves order items and calculates authoritative totals', async () => {
  const result = await request('/orders', payload());
  assert.equal(result.status, 201);
  assert.equal(result.body.order.subtotal, 248000);
  assert.equal(result.body.order.shipping, 2500);
  assert.equal(result.body.order.total, 250500);
  assert.equal(result.body.order.items[0].unitPrice, 248000);
  assert.equal(stock(), 7);
  assert.equal(orderCount(), 1);
  assert.equal(result.body.order.email, undefined);
  assert.equal(result.body.order.address, undefined);
});

test('shipping becomes complimentary at the threshold', async () => {
  const result = await request(
    '/orders',
    payload([{ productId: 'meridian-gold', quantity: 1 }]),
  );
  assert.equal(result.body.order.shipping, 0);
  assert.equal(result.body.order.total, 295000);
});

test('retrying a request returns the same order without taking more stock', async () => {
  const key = randomUUID();
  const first = await request('/orders', payload(), key);
  const repeated = await request('/orders', payload(), key);
  assert.equal(repeated.status, 200);
  assert.deepEqual(repeated.body, first.body);
  assert.equal(stock(), 7);
  assert.equal(orderCount(), 1);
});

test('an idempotency key cannot be reused for different details', async () => {
  const key = randomUUID();
  await request('/orders', payload(), key);
  const changed = await request(
    '/orders',
    payload([{ productId: 'solstice-rose', quantity: 2 }]),
    key,
  );
  assert.equal(changed.status, 409);
  assert.equal(stock(), 7);
  assert.equal(orderCount(), 1);
});

test('invalid quantities, repeated products, and price injection are rejected', async () => {
  for (const quantity of [0, -1, 1.5, 6]) {
    assert.equal(
      (await request('/orders', payload([{ productId: 'solstice-rose', quantity }])))
        .status,
      400,
    );
  }
  assert.equal(
    (
      await request(
        '/orders',
        payload([
          { productId: 'solstice-rose', quantity: 1 },
          { productId: 'solstice-rose', quantity: 1 },
        ]),
      )
    ).status,
    400,
  );
  assert.equal((await request('/orders', { ...payload(), total: 1 })).status, 400);
  assert.equal(
    (
      await request(
        '/orders',
        payload([{ productId: 'solstice-rose', quantity: 1, price: 1 }]),
      )
    ).status,
    400,
  );
  assert.equal(orderCount(), 0);
  assert.equal(stock(), 8);
});

test('invalid customer data and missing idempotency key cannot create orders', async () => {
  const bad = payload();
  bad.customer.email = 'not-an-email';
  const invalid = await request('/orders', bad);
  assert.equal(invalid.status, 400);
  assert.ok(invalid.body.fields.some((field) => field.path === 'customer.email'));
  const response = await fetch(`${baseUrl}/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload()),
  });
  assert.equal(response.status, 400);
  assert.equal(orderCount(), 0);
});

test('insufficient inventory rolls back the entire checkout', async () => {
  database.prepare('UPDATE products SET stock = 0 WHERE id = ?').run('nocturne-steel');
  const result = await request(
    '/orders',
    payload([
      { productId: 'solstice-rose', quantity: 1 },
      { productId: 'nocturne-steel', quantity: 1 },
    ]),
  );
  assert.equal(result.status, 409);
  assert.equal(stock(), 8);
  assert.equal(orderCount(), 0);
  assert.equal(
    database.prepare('SELECT count(*) AS count FROM order_items').get().count,
    0,
  );
});

test('unknown products are rejected without changing inventory', async () => {
  assert.equal(
    (await request('/orders', payload([{ productId: 'unknown', quantity: 1 }]))).status,
    404,
  );
  assert.equal(stock(), 8);
});

test('competing checkouts cannot oversell the final watch', async () => {
  database.prepare('UPDATE products SET stock = 1 WHERE id = ?').run('solstice-rose');
  const results = await Promise.all([
    request('/orders', payload()),
    request('/orders', payload()),
  ]);
  assert.deepEqual(results.map((result) => result.status).sort(), [201, 409]);
  assert.equal(stock(), 0);
  assert.equal(orderCount(), 1);
});

test('order lookup requires both the random reference and matching email', async () => {
  const created = await request('/orders', payload());
  const orderNumber = created.body.order.orderNumber;
  const found = await request('/orders/lookup', {
    orderNumber: orderNumber.toLowerCase(),
    email: ' DEMO@example.com ',
  });
  assert.equal(found.status, 200);
  assert.equal(found.body.order.id, created.body.order.id);
  assert.equal(
    (await request('/orders/lookup', { orderNumber, email: 'other@example.com' })).status,
    404,
  );
  assert.equal((await request('/orders')).status, 404);
});

test('subscriptions are normalized and deduplicated', async () => {
  assert.equal(
    (await request('/newsletter', { email: ' DEMO@example.com ' })).status,
    201,
  );
  await request('/newsletter', { email: 'demo@example.com' });
  assert.equal(
    database.prepare('SELECT count(*) AS count FROM subscribers').get().count,
    1,
  );
  assert.equal((await request('/newsletter', { email: 'invalid' })).status, 400);
});

test('database reopening preserves orders and does not reseed inventory', async () => {
  await request('/orders', payload());
  const reopened = openDatabase(filename);
  try {
    assert.equal(
      reopened.prepare('SELECT stock FROM products WHERE id = ?').get('solstice-rose')
        .stock,
      7,
    );
    assert.equal(reopened.prepare('SELECT count(*) AS count FROM orders').get().count, 1);
  } finally {
    reopened.close();
  }
});

test('checkout request keys work when randomUUID is unavailable on HTTP', () => {
  const provider = { getRandomValues: (bytes) => webcrypto.getRandomValues(bytes) };
  const first = createRequestId(provider);
  assert.match(
    first,
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
  );
  assert.notEqual(first, createRequestId(provider));
});
