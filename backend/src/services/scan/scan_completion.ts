import { Scan } from '../../models';
import { SCAN_STATUSES } from '../../config/constants';
import Logger from '../../utils/logger';
import type { ScanCompletionPayload } from './scan_types';

// Safety-net: closes a scan even when some product-checks fail terminally.
// Never marks FAILED — partial snapshots are still useful. The UI
// distinguishes partial completion via (scanned_products < total_products).
export async function runScanCompletion(payload: ScanCompletionPayload): Promise<void> {
    const { scanId } = payload;
    const scan = await Scan.findByPk(scanId);
    if (!scan) return;

    if (scan.status !== SCAN_STATUSES.IN_PROGRESS) return;

    const now = new Date();
    await scan.update({
        status: SCAN_STATUSES.COMPLETED,
        completed_at: now,
        error_message:
            scan.scanned_products < scan.total_products
                ? `Completed via fallback: ${scan.scanned_products}/${scan.total_products} products scanned`
                : scan.error_message,
    });

    Logger.info('Scan completed (fallback)', {
        scanId,
        scannedProducts: scan.scanned_products,
        totalProducts: scan.total_products,
        issuesFound: scan.issues_found,
    });
}
