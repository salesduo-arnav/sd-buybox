import Logger from '../utils/logger';

// Scheduler Service
//
// Registers the schedule-tick pg-boss handler, queries tracker_configs
// for due accounts, and enqueues ACCOUNT_SCAN jobs.
//
// When implemented, the tick handler should:
//   - call entitlements.snapshot(orgId) per due row
//   - skip rows where snapshot.hasAny is false (no active subscription)
//   - clamp tracker_config.update_frequency with entitlements.clampFrequency
//   - use entitlements.retentionDays(snapshot) in the cleanup job

class SchedulerService {
    async registerJobHandlers(): Promise<void> {
        Logger.info('Scheduler job handlers registered (stubs)');
        // TODO: Register handler for JOB_NAMES.SCHEDULE_TICK
        // TODO: Register recurring schedule via boss.schedule()
    }
}

export default new SchedulerService();
