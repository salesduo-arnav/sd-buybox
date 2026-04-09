// Central place for reading environment variables with safe defaults.
// Every other file imports from here instead of touching process.env directly,
// so a missing or malformed value is caught once, at boot.

import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../../.env') });

// Read a positive integer from env. Rejects NaN, zero, and negatives so a typo
// in .env can never silently degrade to a disabled timeout or zero-byte cache.
function positiveInt(name: string, fallback: number): number {
    const raw = process.env[name];
    if (!raw) return fallback;
    const parsed = Number(raw);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function optionalString(name: string, fallback = ''): string {
    return process.env[name] ?? fallback;
}

function csvList(name: string): string[] {
    return (process.env[name] ?? '')
        .split(',')
        .map((entry) => entry.trim())
        .filter(Boolean);
}

const nodeEnv = optionalString('NODE_ENV', 'development');

export const env = {
    nodeEnv,
    isProduction: nodeEnv === 'production',
    isTest: nodeEnv === 'test',

    port: positiveInt('PORT', 5003),
    corsOrigins: csvList('CORS_ORIGINS'),

    db: {
        host: optionalString('PGHOST', 'localhost'),
        port: positiveInt('PGPORT', 5434),
        user: optionalString('PGUSER'),
        password: optionalString('PGPASSWORD'),
        database: optionalString('PGDATABASE'),
    },

    session: {
        cookieName: optionalString('SESSION_COOKIE_NAME', 'session_id'),
        cacheTtlMs: positiveInt('SESSION_CACHE_TTL_MS', 60_000),
        cacheMaxEntries: positiveInt('SESSION_CACHE_MAX_ENTRIES', 10_000),
    },

    corePlatform: {
        baseUrl: optionalString('CORE_PLATFORM_INTERNAL_URL') || optionalString('CORE_PLATFORM_URL'),
        internalApiKey: optionalString('INTERNAL_API_KEY'),
        serviceName: optionalString('INTERNAL_SERVICE_NAME', 'buybox'),
        timeoutMs: positiveInt('CORE_PLATFORM_TIMEOUT_MS', 15_000),
        authTimeoutMs: positiveInt('CORE_PLATFORM_AUTH_TIMEOUT_MS', 5_000),
        auditTimeoutMs: positiveInt('CORE_PLATFORM_AUDIT_TIMEOUT_MS', 10_000),
    },

    jobQueue: {
        retryLimit: positiveInt('JOB_QUEUE_RETRY_LIMIT', 3),
        retryDelaySeconds: positiveInt('JOB_QUEUE_RETRY_DELAY_SECONDS', 30),
        expireMinutes: positiveInt('JOB_QUEUE_EXPIRE_MINUTES', 60),
        archiveCompletedAfterSeconds: positiveInt('JOB_QUEUE_ARCHIVE_AFTER_SECONDS', 86_400),
        deleteAfterDays: positiveInt('JOB_QUEUE_DELETE_AFTER_DAYS', 7),
        shutdownTimeoutMs: positiveInt('JOB_QUEUE_SHUTDOWN_TIMEOUT_MS', 10_000),
    },

    shutdown: {
        forceExitMs: positiveInt('SHUTDOWN_FORCE_EXIT_MS', 10_000),
    },

    logger: {
        level: optionalString('LOG_LEVEL'),
        fileMaxSizeBytes: positiveInt('LOG_FILE_MAX_SIZE_BYTES', 5 * 1024 * 1024),
        fileMaxFiles: positiveInt('LOG_FILE_MAX_FILES', 3),
    },
};

// Fail-fast validation called once at boot from app.ts.
// Anything unset that buybox truly needs to run throws here.
export function assertRequiredEnv(): void {
    if (!env.corePlatform.baseUrl) {
        throw new Error(
            'CORE_PLATFORM_INTERNAL_URL (or CORE_PLATFORM_URL) must be set — buybox cannot authenticate users without it.'
        );
    }
    if (!env.corePlatform.internalApiKey) {
        throw new Error('INTERNAL_API_KEY must be set — required for service-to-service calls to sd-core-platform.');
    }
    if (env.isProduction && env.corsOrigins.length === 0) {
        throw new Error('CORS_ORIGINS must be set in production — buybox will not serve browsers without it.');
    }
}
