import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { catalog } from './catalog.js';

/** Open and migrate the database. Tests use their own temporary files. */
export function openDatabase(filename = 'server/data/vela.sqlite') {
  if (filename !== ':memory:') mkdirSync(dirname(resolve(filename)), { recursive: true });
  const database = new DatabaseSync(filename);
  database.exec(`
    PRAGMA foreign_keys = ON;
    PRAGMA journal_mode = WAL;
    PRAGMA busy_timeout = 5000;

    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      price INTEGER NOT NULL CHECK (price > 0),
      stock INTEGER NOT NULL CHECK (stock >= 0),
      metadata TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      order_number TEXT NOT NULL UNIQUE,
      request_key TEXT NOT NULL UNIQUE,
      request_hash TEXT NOT NULL,
      customer_name TEXT NOT NULL,
      email TEXT NOT NULL,
      address TEXT NOT NULL,
      city TEXT NOT NULL,
      postal_code TEXT NOT NULL,
      country TEXT NOT NULL,
      subtotal INTEGER NOT NULL,
      shipping INTEGER NOT NULL,
      total INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'confirmed',
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
    );
    CREATE TABLE IF NOT EXISTS order_items (
      order_id TEXT NOT NULL REFERENCES orders(id),
      product_id TEXT NOT NULL REFERENCES products(id),
      name TEXT NOT NULL,
      quantity INTEGER NOT NULL CHECK (quantity BETWEEN 1 AND 5),
      unit_price INTEGER NOT NULL,
      PRIMARY KEY (order_id, product_id)
    );
    CREATE TABLE IF NOT EXISTS subscribers (
      email TEXT PRIMARY KEY,
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
    );
    PRAGMA user_version = 1;
  `);

  // Never reset inventory when the application restarts.
  const insert = database.prepare(
    'INSERT OR IGNORE INTO products (id, name, price, stock, metadata) VALUES (?, ?, ?, ?, ?)',
  );
  for (const product of catalog) {
    const { id, name, price, stock, ...metadata } = product;
    insert.run(id, name, price, stock, JSON.stringify(metadata));
  }
  return database;
}

export function serializeProduct(row) {
  return {
    ...JSON.parse(row.metadata),
    id: row.id,
    name: row.name,
    price: row.price,
    stock: row.stock,
  };
}
