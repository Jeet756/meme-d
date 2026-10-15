// Runs before each integration test file, before any application module is imported.
// Points the app at the throwaway test database and supplies safe test-only secrets.
import 'dotenv/config';

const testUrl = process.env.TEST_DATABASE_URL;
if (testUrl) {
  process.env.DATABASE_URL = testUrl;
  process.env.DIRECT_URL = process.env.TEST_DIRECT_URL ?? testUrl;
}
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'integration-test-secret-integration-test-secret';
process.env.FRONTEND_URL = 'http://localhost:3000';
process.env.COOKIE_SAME_SITE = 'lax';
