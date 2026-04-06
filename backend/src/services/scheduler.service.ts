import Logger from '../utils/logger';
import { JOB_NAMES } from '../config/constants';

/**
 * Scheduler Service
 *
 * Manages the pg-boss schedule tick:
 * - Registers recurring SCHEDULE_TICK job
 * - Queries tracker_configs for due accounts
 * - Enqueues ACCOUNT_SCAN jobs
 * - Calculates next_scheduled_run_at
 */
class SchedulerService {
    async registerJobHandlers(): Promise<void> {
        Logger.info('Scheduler job handlers registered (stubs)');
        // TODO: Register handler for JOB_NAMES.SCHEDULE_TICK
        // TODO: Register recurring schedule via boss.schedule()
    }
}

export default new SchedulerService();
