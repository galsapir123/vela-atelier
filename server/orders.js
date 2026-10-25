import { createHash, randomBytes, randomUUID } from 'node:crypto';

export const SHIPPING = { freeAbove: 250000, standard: 2500, currency: 'USD' };

export class StoreError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

export function orderReceipt(database, id) {
  const order = database
    .prepare(
      `
    SELECT id, order_number AS orderNumber, subtotal, shipping, total, status,
           created_at AS createdAt FROM orders WHERE id = ?
  `,
    )
    .get(id);
  if (!order) throw new StoreError('Order not found.', 404);
  const items = database
    .prepare(
      `
    SELECT product_id AS productId, name, quantity, unit_price AS unitPrice
    FROM order_items WHERE order_id = ? ORDER BY product_id
  `,
    )
    .all(id);
  return { ...order, items, currency: 'USD', demo: true };
}

/** Prices, inventory, shipping and totals are decided here, never by the client. */
export function placeOrder(database, payload, requestKey) {
  const requestHash = createHash('sha256').update(JSON.stringify(payload)).digest('hex');
  database.exec('BEGIN IMMEDIATE');
  try {
    const previous = database
      .prepare('SELECT id, request_hash FROM orders WHERE request_key = ?')
      .get(requestKey);
    if (previous) {
      if (previous.request_hash !== requestHash) {
        throw new StoreError(
          'This checkout request was already used. Please start a new checkout.',
          409,
        );
      }
      const receipt = orderReceipt(database, previous.id);
      database.exec('COMMIT');
      return { receipt, repeated: true };
    }

    const productQuery = database.prepare(
      'SELECT id, name, price, stock FROM products WHERE id = ?',
    );
    const lines = payload.items.map((item) => {
      const product = productQuery.get(item.productId);
      if (!product)
        throw new StoreError('One of your selected watches is no longer available.', 404);
      if (product.stock < item.quantity)
        throw new StoreError(
          `Only ${product.stock} ${product.name} watches remain. Please update your bag.`,
          409,
        );
      return { ...product, quantity: item.quantity };
    });
    const subtotal = lines.reduce((total, item) => total + item.price * item.quantity, 0);
    const shipping = subtotal >= SHIPPING.freeAbove ? 0 : SHIPPING.standard;
    const id = randomUUID();
    const orderNumber = `VLA-${randomBytes(8).toString('hex').toUpperCase()}`;
    const customer = payload.customer;

    database
      .prepare(
        `
      INSERT INTO orders (id, order_number, request_key, request_hash, customer_name,
        email, address, city, postal_code, country, subtotal, shipping, total)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
      )
      .run(
        id,
        orderNumber,
        requestKey,
        requestHash,
        customer.name,
        customer.email,
        customer.address,
        customer.city,
        customer.postalCode,
        customer.country,
        subtotal,
        shipping,
        subtotal + shipping,
      );

    const insertItem = database.prepare(
      'INSERT INTO order_items (order_id, product_id, name, quantity, unit_price) VALUES (?, ?, ?, ?, ?)',
    );
    const decrementStock = database.prepare(
      'UPDATE products SET stock = stock - ? WHERE id = ? AND stock >= ?',
    );
    for (const item of lines) {
      const result = decrementStock.run(item.quantity, item.id, item.quantity);
      if (result.changes !== 1)
        throw new StoreError('Inventory changed. Please refresh your bag.', 409);
      insertItem.run(id, item.id, item.name, item.quantity, item.price);
    }
    const receipt = orderReceipt(database, id);
    database.exec('COMMIT');
    return { receipt, repeated: false };
  } catch (error) {
    database.exec('ROLLBACK');
    throw error;
  }
}
