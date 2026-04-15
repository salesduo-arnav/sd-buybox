import { Op } from 'sequelize';
import { BuyBoxSnapshot } from '../../models';
import { DEFAULT_SNAPSHOT_RETENTION_DAYS } from '../../config/constants';
import Logger from '../../utils/logger';
import configService from '../config.service';

// Nightly DELETE with a single global retention. Per-tier retention
// (via entitlements.retentionDays) can layer on later.
export async function runSnapshotCleanup(): Promise<void> {
    const retentionDays = await configService.get<number>(
        'snapshot_retention_days',
        DEFAULT_SNAPSHOT_RETENTION_DAYS
    );

    const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);

    const deleted = await BuyBoxSnapshot.destroy({
        where: { snapshot_at: { [Op.lt]: cutoff } },
    });

    Logger.info('Snapshot cleanup complete', {
        retentionDays,
        cutoff: cutoff.toISOString(),
        deleted,
    });
}
