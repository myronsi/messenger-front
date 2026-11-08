// Populate the backend's deployment template without requiring a Go installation on frontend machines.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { randomBytes } from 'node:crypto';

const [source, output, port] = process.argv.slice(2);
if (existsSync(output)) process.exit(0);
const secretSizes = {
  JWT_SECRET: 32, RECOVERY_PEPPER: 32, ENCRYPTION_KEY: 32,
  POSTGRES_PASSWORD: 16, REDIS_PASSWORD: 16, ELASTIC_PASSWORD: 16, S3_ACCESS_KEY: 8, S3_SECRET_KEY: 20,
};
const lines = readFileSync(source, 'utf8').replaceAll('\r\n', '\n').split('\n');
const values = {};
for (let i = 0; i < lines.length; i++) {
  const match = lines[i].match(/^([A-Z0-9_]+)=(.*)$/);
  if (!match) continue;
  const [, key, original] = match;
  values[key] = original || (secretSizes[key] ? randomBytes(secretSizes[key]).toString(key === 'ENCRYPTION_KEY' ? 'base64' : 'hex') : '');
  lines[i] = `${key}=${values[key]}`;
}
const expanded = lines.map((line) => line.startsWith('#') ? line : line.replace(/\$\{([A-Z0-9_]+)\}/g, (match, key) => values[key] ?? match));
expanded.push('APP_ENV=development', 'COOKIE_SECURE=false', `API_PORT=${port}`, 'WORKER_PORT=18081',
  'CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173', 'RP_ID=localhost', 'RP_ORIGINS=http://localhost:5173',
  'RECOVERY_WEB_URL=http://localhost:5173', 'HTTP_DRAIN_DELAY=0s', 'RECOVERY_APPROVAL_MIN_SESSION_AGE=0s');
writeFileSync(output, `${expanded.join('\n')}\n`, { flag: 'wx', mode: 0o600 });
