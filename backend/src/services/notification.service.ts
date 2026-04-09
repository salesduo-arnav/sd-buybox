import Logger from '../utils/logger';

// Notification Service
//
// Dispatches alerts via email and Slack through core-platform:
//   - Registers pg-boss handler for ALERT_DISPATCH
//   - Checks tracker_config notification preferences
//   - Calls corePlatform.client for actual delivery

class NotificationService {
    async registerJobHandlers(): Promise<void> {
        Logger.info('Notification job handlers registered (stubs)');
        // TODO: Register handler for JOB_NAMES.ALERT_DISPATCH
    }
}

export default new NotificationService();
