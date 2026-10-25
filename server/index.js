import { existsSync } from 'node:fs';
import { loadEnvFile } from 'node:process';
import { openDatabase } from './database.js';
import { createApp } from './app.js';

if (existsSync('.env')) loadEnvFile('.env');
const port = Number(process.env.PORT || 3001);
const database = openDatabase(process.env.DATABASE_PATH || 'server/data/vela.sqlite');
const app = createApp(database);
const server = app.listen(port, '0.0.0.0', () => {
  console.log(`VELA API listening on http://localhost:${port}`);
});

function shutdown() {
  server.close(() => {
    database.close();
    process.exit(0);
  });
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
