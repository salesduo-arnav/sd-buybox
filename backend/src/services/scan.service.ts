import { JOB_NAMES } from '../config/constants';
import Logger from '../utils/logger';
import { getBoss } from './job_queue.service';
import { env } from '../config/env';
import {
    runAccountScan,
    runProductCheck,
    runScanCompletion,
    type AccountScanPayload,
    type ProductCheckPayload,
    type ScanCompletionPayload,
} from './scan';

// Adapter between pg-boss and the pure handlers in ./scan/*. Handlers
// stay testable without a running queue.
class ScanService {
    async registerJobHandlers(): Promise<void> {
        const boss = getBoss();

        await boss.createQueue(JOB_NAMES.ACCOUNT_SCAN);
        await boss.createQueue(JOB_NAMES.PRODUCT_CHECK);
        await boss.createQueue(JOB_NAMES.SCAN_COMPLETION);
        await boss.createQueue(JOB_NAMES.ALERT_DISPATCH);

        await boss.work<AccountScanPayload>(
            JOB_NAMES.ACCOUNT_SCAN,
            async (jobs) => {
                for (const job of asArray(jobs)) {
                    await runAccountScan(job.data, {
                        enqueueProductCheck: async (payload) => {
                            await boss.send(JOB_NAMES.PRODUCT_CHECK, payload);
                        },
                        enqueueCompletionFallback: async (payload, opts) => {
                            await boss.send(JOB_NAMES.SCAN_COMPLETION, payload, {
                                startAfter: opts.startAfterSeconds,
                            });
                        },
                        completionFallbackSeconds: env.scan.completionFallbackMinutes * 60,
                    });
                }
            }
        );

        await boss.work<ProductCheckPayload>(
            JOB_NAMES.PRODUCT_CHECK,
            async (jobs) => {
                for (const job of asArray(jobs)) {
                    await runProductCheck(job.data, {
                        enqueueAlertDispatch: async (alertId, organizationId) => {
                            await boss.send(JOB_NAMES.ALERT_DISPATCH, { alertId, organizationId });
                        },
                    });
                }
            }
        );

        await boss.work<ScanCompletionPayload>(
            JOB_NAMES.SCAN_COMPLETION,
            async (jobs) => {
                for (const job of asArray(jobs)) {
                    await runScanCompletion(job.data);
                }
            }
        );

        Logger.info('Scan job handlers registered');
    }
}

// pg-boss delivers jobs as arrays when batchSize > 1, singles otherwise.
function asArray<T>(input: T | T[]): T[] {
    return Array.isArray(input) ? input : [input];
}

export default new ScanService();
