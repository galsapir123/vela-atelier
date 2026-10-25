import { spawn } from 'node:child_process';
import { resolve } from 'node:path';

// One cross-platform command runs the API and Vite. Extra CLI arguments belong
// to Vite, which also lets preview tools select their own port.
const processes = [
  spawn(process.execPath, ['--watch', 'server/index.js'], { stdio: 'inherit' }),
  spawn(
    process.execPath,
    [
      resolve('node_modules/vite/bin/vite.js'),
      '--host',
      '0.0.0.0',
      ...process.argv.slice(2),
    ],
    { stdio: 'inherit' },
  ),
];
let shuttingDown = false;
function stop(exitCode = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  process.exitCode = exitCode;
  for (const child of processes) if (child.exitCode === null) child.kill();
}
for (const child of processes) {
  child.on('error', (error) => {
    console.error(error.message);
    stop(1);
  });
  child.on('exit', (code) => {
    if (!shuttingDown) stop(code || 0);
  });
}
process.on('SIGINT', () => stop());
process.on('SIGTERM', () => stop());
