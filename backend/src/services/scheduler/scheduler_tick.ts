import { Op } from 'sequelize';
import { Scan, TrackerConfig } from '../../models';
import {
    SCAN_STATUSES,
    SCAN_TRIGGERS,
    UPDATE_FREQUENCIES,
} from '../../config/constants';
import Logger from '../../utils/logger';
import { entitlements, Frequency } from '../entitlements';
import type { AccountScanPayload } from '../scan/scan_types';

export interface SchedulerTickDeps {
    enqueueAccountScan: (payload: AccountScanPayload) => Promise<void>;
}

export async function runSchedulerTick(deps: SchedulerTickDeps): Promise<void> {
    const now = new Date();

    const dueConfigs = await TrackerConfig.findAll({
        where: {
            schedule_enabled: true,
            [Op.or]: [
                { next_scheduled_run_at: null },
                { next_scheduled_run_at: { [Op.lte]: now } },
            ],
        },
    });

    if (dueConfigs.length === 0) return;

    Logger.debug(`Scheduler tick: ${dueConfigs.length} tracker configs due`);

    for (const config of dueConfigs) {
        try {
            await processDueConfig(config, deps, now);
        } catch (err) {
            Logger.error('Scheduler tick: failed to process config', {
                configId: config.id,
                accountId: config.integration_account_id,
                error: err instanceof Error ? err.message : String(err),
            });
        }
    }
}

async function processDueConfig(
    config: TrackerConfig,
    deps: SchedulerTickDeps,
    now: Date
): Promise<void> {
    const accountId = config.integration_account_id;
    const organizationId = config.organization_id;

    // Skip if a scan is already running — prevents stacking when a
    // scan runs longer than its tick interval.
    const activeScan = await Scan.findOne({
        where: {
            integration_account_id: accountId,
            organization_id: organizationId,
            status: { [Op.in]: [SCAN_STATUSES.QUEUED, SCAN_STATUSES.IN_PROGRESS] },
        },
    });
    if (activeScan) {
        Logger.debug('Scheduler tick: scan already in progress, skipping', {
            accountId,
            activeScanId: activeScan.id,
        });
        // Advance anyway so we don't re-check every minute.
        await config.update({ next_scheduled_run_at: computeNextRun(config, now) });
        return;
    }

    const snapshot = await entitlements.snapshot(organizationId);
    const requested = (config.update_frequency as Frequency) ?? UPDATE_FREQUENCIES.DAILY;
    const effective = entitlements.clampFrequency(requested, snapshot);

    // No active subscription → skip without mutating config, so scans
    // resume automatically when they re-subscribe.
    if (!snapshot.hasAny) {
        Logger.debug('Scheduler tick: org has no entitlements, skipping', { organizationId, accountId });
        await config.update({ next_scheduled_run_at: computeNextRun(config, now) });
        return;
    }

    const scan = await Scan.create({
        integration_account_id: accountId,
        organization_id: organizationId,
        triggered_by: SCAN_TRIGGERS.SCHEDULED,
        marketplace: 'US', // TODO: surface from tracker_config or integration account
    });

    await deps.enqueueAccountScan({
        scanId: scan.id,
        accountId,
        organizationId,
        marketplace: scan.marketplace,
        triggeredBy: SCAN_TRIGGERS.SCHEDULED,
    });

    await config.update({
        last_scheduled_run_at: now,
        next_scheduled_run_at: computeNextRun({ ...config.toJSON(), update_frequency: effective } as TrackerConfig, now),
    });

    Logger.info('Scheduler tick: scan enqueued', {
        accountId,
        scanId: scan.id,
        frequency: effective,
    });
}

export function computeNextRun(config: TrackerConfig, from: Date): Date {
    switch (config.update_frequency) {
        case UPDATE_FREQUENCIES.REAL_TIME:
            // Cap real-time at 15min — SP-API pricing quota makes faster brittle.
            return new Date(from.getTime() + 15 * 60 * 1000);

        case UPDATE_FREQUENCIES.HOURLY:
            return new Date(from.getTime() + 60 * 60 * 1000);

        case UPDATE_FREQUENCIES.DAILY:
        default:
            return nextDailyRun(config.schedule_time ?? null, from);
    }
}

// schedule_time is HH:MM UTC; unset → next run 24h from now.
function nextDailyRun(scheduleTime: string | null, from: Date): Date {
    if (!scheduleTime || !/^\d{2}:\d{2}$/.test(scheduleTime)) {
        return new Date(from.getTime() + 24 * 60 * 60 * 1000);
    }
    const [hh, mm] = scheduleTime.split(':').map(Number);
    const candidate = new Date(from);
    candidate.setUTCHours(hh, mm, 0, 0);
    if (candidate <= from) {
        candidate.setUTCDate(candidate.getUTCDate() + 1);
    }
    return candidate;
}
