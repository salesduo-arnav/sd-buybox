import PgBoss from 'pg-boss';
import { env } from '../config/env';
import Logger from '../utils/logger';

// pg-boss job queue wrapper.
// Lazily built; callers must go through `getBoss()` so we never hand back
// an uninitialized instance.

let boss: PgBoss | null = null;

function buildConnectionString(): string {
    const { user, password, host, port, database } = env.db;
    const encodedUser = encodeURIComponent(user);
    const encodedPassword = encodeURIComponent(password);
    return `postgres://${encodedUser}:${encodedPassword}@${host}:${port}/${database}`;
}

export async function initJobQueue(): Promise<PgBoss> {
    boss = new PgBoss({
        connectionString: buildConnectionString(),
        retryLimit: env.jobQueue.retryLimit,
        retryDelay: env.jobQueue.retryDelaySeconds,
        retryBackoff: true,
        expireInMinutes: env.jobQueue.expireMinutes,
        archiveCompletedAfterSeconds: env.jobQueue.archiveCompletedAfterSeconds,
        deleteAfterDays: env.jobQueue.deleteAfterDays,
    });

    boss.on('error', (error) => Logger.error('pg-boss error:', error));

    await boss.start();
    Logger.info('pg-boss job queue started');
    return boss;
}

export function getBoss(): PgBoss {
    if (!boss) {
        throw new Error('Job queue not initialized. Call initJobQueue() first.');
    }
    return boss;
}

export async function stopJobQueue(): Promise<void> {
    if (boss) {
        await boss.stop({ graceful: true, timeout: env.jobQueue.shutdownTimeoutMs });
        Logger.info('pg-boss job queue stopped');
    }
}
