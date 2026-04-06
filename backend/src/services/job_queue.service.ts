import PgBoss from 'pg-boss';
import Logger from '../utils/logger';

let boss: PgBoss | null = null;

export async function initJobQueue(): Promise<PgBoss> {
    const connectionString = `postgres://${process.env.PGUSER}:${process.env.PGPASSWORD}@${process.env.PGHOST}:${Number(process.env.PGPORT) || 5434}/${process.env.PGDATABASE}`;

    boss = new PgBoss({
        connectionString,
        retryLimit: 3,
        retryDelay: 30,
        retryBackoff: true,
        expireInMinutes: 60,
        archiveCompletedAfterSeconds: 86400,
        deleteAfterDays: 7,
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
        await boss.stop({ graceful: true, timeout: 10000 });
        Logger.info('pg-boss job queue stopped');
    }
}
