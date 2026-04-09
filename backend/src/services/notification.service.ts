import Logger from '../utils/logger';

// Notification Service
//
// Dispatches alerts via email and Slack through core-platform.
//
// When implemented, the alert-dispatch handler should:
//   - call entitlements.snapshot(orgId) at the top of each job
//   - call entitlements.consume(orgId, LIMIT.ALERTS_PER_MONTH) before send
//   - only send the Slack leg if entitlements.has(snapshot, FEATURE.SLACK_ALERTS)
//   - fall back to the org's billing email when custom_recipients is off

class NotificationService {
    async registerJobHandlers(): Promise<void> {
        Logger.info('Notification job handlers registered (stubs)');
        // TODO: Register handler for JOB_NAMES.ALERT_DISPATCH
    }
}

export default new NotificationService();
