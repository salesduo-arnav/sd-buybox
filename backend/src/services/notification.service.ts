import Logger from '../utils/logger';
import { JOB_NAMES } from '../config/constants';

/**
 * Notification Service
 *
 * Dispatches alerts via email and Slack through core-platform:
 * - Registers pg-boss handler for ALERT_DISPATCH
 * - Checks tracker_config notification preferences
 * - Calls core_platform.service for actual delivery
 */
class NotificationService {
    async registerJobHandlers(): Promise<void> {
        Logger.info('Notification job handlers registered (stubs)');
        // TODO: Register handler for JOB_NAMES.ALERT_DISPATCH
    }
}

export default new NotificationService();
