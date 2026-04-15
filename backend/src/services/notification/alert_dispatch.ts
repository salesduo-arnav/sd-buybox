import { Alert, Product, TrackerConfig } from '../../models';
import { ALERT_TYPES, SEVERITIES } from '../../config/constants';
import Logger from '../../utils/logger';
import { corePlatform } from '../corePlatform.client';
import { entitlements, EntitlementError, FEATURE, LIMIT } from '../entitlements';

export interface AlertDispatchPayload {
    alertId: string;
    organizationId: string;
}

export async function runAlertDispatch(payload: AlertDispatchPayload): Promise<void> {
    const { alertId, organizationId } = payload;

    const alert = await Alert.findOne({
        where: { id: alertId, organization_id: organizationId },
        include: [{ model: Product, as: 'product' }],
    });
    if (!alert) {
        Logger.warn('Alert dispatch: alert not found', { alertId });
        return;
    }

    if (alert.is_notified) {
        Logger.debug('Alert dispatch: already notified, skipping', { alertId });
        return;
    }

    const product = (alert as Alert & { product?: Product }).product;

    const config = await TrackerConfig.findOne({
        where: { integration_account_id: alert.integration_account_id },
    });

    // Over-quota is a soft condition — log and skip, don't fail the job.
    try {
        await entitlements.consume(organizationId, LIMIT.ALERTS_PER_MONTH);
    } catch (err) {
        if (err instanceof EntitlementError && err.code === 'LIMIT_EXCEEDED') {
            Logger.info('Alert dispatch: alerts-per-month limit reached, skipping send', {
                alertId,
                organizationId,
            });
            return;
        }
        throw err;
    }

    const snapshot = await entitlements.snapshot(organizationId);

    const emailEnabled = config?.email_alerts_enabled ?? true;
    // Recovery alerts skip Slack to avoid chat noise.
    const slackEnabled =
        (config?.slack_alerts_enabled ?? false) &&
        entitlements.has(snapshot, FEATURE.SLACK_ALERTS) &&
        alert.alert_type !== ALERT_TYPES.BUYBOX_RECOVERED;

    const emailRecipients = resolveEmailRecipients(snapshot, config);

    const subject = alert.title ?? `Buy Box alert for ${product?.asin ?? 'your account'}`;
    const emailHtml = buildEmailHtml({ alert, product });

    if (emailEnabled && emailRecipients.length > 0) {
        try {
            await corePlatform.email.send(emailRecipients, subject, emailHtml);
        } catch (err) {
            Logger.warn('Alert dispatch: email send failed', {
                alertId,
                error: err instanceof Error ? err.message : String(err),
            });
        }
    } else if (emailEnabled) {
        Logger.info('Alert dispatch: no email recipients resolved, skipping email', { alertId });
    }

    if (slackEnabled && config?.slack_channel_id) {
        try {
            await corePlatform.slack.sendToChannel(
                organizationId,
                config.slack_channel_id,
                alert.title ?? subject,
                buildSlackBlocks({ alert, product })
            );
        } catch (err) {
            Logger.warn('Alert dispatch: slack send failed', {
                alertId,
                error: err instanceof Error ? err.message : String(err),
            });
        }
    }

    await alert.update({ is_notified: true });
}

function resolveEmailRecipients(
    snapshot: Parameters<typeof entitlements.has>[0],
    config: TrackerConfig | null
): string[] {
    if (!config?.notification_emails || config.notification_emails.length === 0) {
        return [];
    }
    // Without CUSTOM_RECIPIENTS, only honor the first address (owner)
    // so a free plan can't blast a custom list.
    if (!entitlements.has(snapshot, FEATURE.CUSTOM_RECIPIENTS)) {
        return [config.notification_emails[0]];
    }
    return config.notification_emails;
}

function buildEmailHtml(params: { alert: Alert; product?: Product }): string {
    const { alert, product } = params;
    const title = alert.title ?? 'Buy Box alert';
    const body = alert.message ?? '';
    const sev =
        alert.severity === SEVERITIES.CRITICAL ? 'Critical' :
        alert.severity === SEVERITIES.WARNING ? 'Warning' : 'Info';
    const productLine = product
        ? `<p style="margin:0 0 12px;color:#555;">Product: <strong>${escapeHtml(product.title ?? product.asin)}</strong> (${escapeHtml(product.asin)})</p>`
        : '';

    return [
        `<div style="font-family:system-ui,Segoe UI,Roboto,Helvetica,Arial;max-width:560px;padding:20px;color:#111;">`,
        `<h2 style="margin:0 0 8px;">${escapeHtml(title)}</h2>`,
        `<p style="margin:0 0 12px;color:#888;">Severity: ${sev}</p>`,
        productLine,
        `<p style="margin:0 0 12px;line-height:1.5;">${escapeHtml(body)}</p>`,
        `<p style="margin-top:24px;font-size:12px;color:#999;">SalesDuo Buy Box monitoring</p>`,
        `</div>`,
    ].join('');
}

function buildSlackBlocks(params: { alert: Alert; product?: Product }): unknown[] {
    const { alert, product } = params;
    const header = alert.title ?? 'Buy Box alert';
    const body = alert.message ?? '';
    const sevEmoji =
        alert.severity === SEVERITIES.CRITICAL ? ':rotating_light:' :
        alert.severity === SEVERITIES.WARNING ? ':warning:' : ':information_source:';
    const context = product ? `ASIN: \`${product.asin}\`${product.sku ? `  •  SKU: \`${product.sku}\`` : ''}` : '';

    return [
        {
            type: 'header',
            text: { type: 'plain_text', text: `${sevEmoji} ${header}` },
        },
        {
            type: 'section',
            text: { type: 'mrkdwn', text: body },
        },
        ...(context
            ? [{ type: 'context', elements: [{ type: 'mrkdwn', text: context }] }]
            : []),
    ];
}

function escapeHtml(input: string): string {
    return input
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}
