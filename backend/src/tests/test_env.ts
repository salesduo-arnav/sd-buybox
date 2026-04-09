// Runs before every test file (via jest.config `setupFiles`).
// Populates the minimum set of env vars that src/config/env.ts needs
// to boot without throwing, so unit tests don't have to touch .env.

process.env.NODE_ENV = 'test';
process.env.CORE_PLATFORM_INTERNAL_URL = 'http://core-platform.test';
process.env.INTERNAL_API_KEY = 'test-internal-api-key';
process.env.INTERNAL_SERVICE_NAME = 'buybox-test';
process.env.CORS_ORIGINS = 'http://localhost:5004';
process.env.SESSION_COOKIE_NAME = 'session_id';
process.env.SESSION_CACHE_TTL_MS = '60000';
process.env.SESSION_CACHE_MAX_ENTRIES = '5';
