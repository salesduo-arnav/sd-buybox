import { JOB_NAMES } from '../config/constants';
import Logger from '../utils/logger';
import { getBoss } from './job_queue.service';
import { runAlertDispatch, type AlertDispatchPayload } from './notification/alert_dispatch';

class NotificationService {
    async registerJobHandlers(): Promise<void> {
        const boss = getBoss();

        await boss.createQueue(JOB_NAMES.ALERT_DISPATCH);

        await boss.work<AlertDispatchPayload>(JOB_NAMES.ALERT_DISPATCH, async (jobs) => {
            for (const job of asArray(jobs)) {
                await runAlertDispatch(job.data);
            }
        });

        Logger.info('Notification job handlers registered');
    }
}

function asArray<T>(input: T | T[]): T[] {
    return Array.isArray(input) ? input : [input];
}

export default new NotificationService();
