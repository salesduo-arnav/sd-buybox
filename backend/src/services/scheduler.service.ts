import { JOB_NAMES } from '../config/constants';
import Logger from '../utils/logger';
import { getBoss } from './job_queue.service';
import { runSchedulerTick } from './scheduler/scheduler_tick';
import { handleCatalogSync, type CatalogSyncPayload } from './catalog/catalog_sync';
import { runSnapshotCleanup } from './cleanup/snapshot_cleanup';
import type { AccountScanPayload } from './scan/scan_types';

// Binds recurring/infra jobs to pg-boss:
//   SCHEDULE_TICK     — every minute, enqueue due account scans.
//   CATALOG_SYNC      — weekly fan-out + per-account handler.
//   SNAPSHOT_CLEANUP  — nightly DELETE of stale snapshots.
class SchedulerService {
    async registerJobHandlers(): Promise<void> {
        const boss = getBoss();

        await boss.createQueue(JOB_NAMES.SCHEDULE_TICK);
        await boss.createQueue(JOB_NAMES.CATALOG_SYNC);
        await boss.createQueue(JOB_NAMES.SNAPSHOT_CLEANUP);

        await boss.work(JOB_NAMES.SCHEDULE_TICK, async () => {
            await runSchedulerTick({
                enqueueAccountScan: async (payload: AccountScanPayload) => {
                    await boss.send(JOB_NAMES.ACCOUNT_SCAN, payload);
                },
            });
        });

        await boss.work<CatalogSyncPayload>(JOB_NAMES.CATALOG_SYNC, async (jobs) => {
            for (const job of asArray(jobs)) {
                await handleCatalogSync({
                    payload: job.data ?? {},
                    enqueue: async (payload) => {
                        await boss.send(JOB_NAMES.CATALOG_SYNC, payload);
                    },
                });
            }
        });

        await boss.work(JOB_NAMES.SNAPSHOT_CLEANUP, async () => {
            await runSnapshotCleanup();
        });

        // pg-boss.schedule dedupes by name, so re-registering on boot
        // is idempotent and picks up cron changes.
        await boss.schedule(JOB_NAMES.SCHEDULE_TICK, '* * * * *');
        await boss.schedule(JOB_NAMES.CATALOG_SYNC, '0 3 * * 0'); // Sunday 3am UTC
        await boss.schedule(JOB_NAMES.SNAPSHOT_CLEANUP, '0 2 * * *'); // Daily 2am UTC

        Logger.info('Scheduler job handlers registered');
    }
}

function asArray<T>(input: T | T[]): T[] {
    return Array.isArray(input) ? input : [input];
}

export default new SchedulerService();
