import Logger from '../utils/logger';
import { JOB_NAMES } from '../config/constants';

/**
 * Scan Service
 *
 * Orchestrates Buy Box scans:
 * - Registers pg-boss job handlers for ACCOUNT_SCAN and PRODUCT_CHECK
 * - Handles manual scan triggers
 * - Tracks scan progress
 */
class ScanService {
    async registerJobHandlers(): Promise<void> {
        Logger.info('Scan job handlers registered (stubs)');
        // TODO: Register handler for JOB_NAMES.ACCOUNT_SCAN
        // TODO: Register handler for JOB_NAMES.PRODUCT_CHECK
    }
}

export default new ScanService();
