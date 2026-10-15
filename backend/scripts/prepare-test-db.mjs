// Applies migrations to the throwaway test database before integration tests run.
// Cross-platform on purpose (no inline `VAR=value command` syntax, which breaks on Windows).
import 'dotenv/config';
import { spawnSync } from 'node:child_process';

const testUrl = process.env.TEST_DATABASE_URL;
if (!testUrl) {
  console.error(
    'TEST_DATABASE_URL is not set.\n' +
      'Create an empty throwaway database (its name must contain "test") and set TEST_DATABASE_URL,\n' +
      'for example in backend/.env. See README.md > Running the tests.',
  );
  process.exit(1);
}

const result = spawnSync('npx', ['prisma', 'migrate', 'deploy'], {
  stdio: 'inherit',
  shell: true,
  env: { ...process.env, DATABASE_URL: testUrl, DIRECT_URL: process.env.TEST_DIRECT_URL ?? testUrl },
});
process.exit(result.status ?? 1);
