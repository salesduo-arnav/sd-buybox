import axios from 'axios';
import Logger from '../utils/logger';
import { IntegrationCredentials } from '../types';

const CORE_PLATFORM_URL = () => process.env.CORE_PLATFORM_INTERNAL_URL || process.env.CORE_PLATFORM_URL || '';
const INTERNAL_API_KEY = () => process.env.INTERNAL_API_KEY || '';
const SERVICE_NAME = process.env.INTERNAL_SERVICE_NAME || 'buybox';

function getInternalHeaders() {
    return {
        'X-Service-Key': INTERNAL_API_KEY(),
        'X-Service-Name': SERVICE_NAME,
        'Content-Type': 'application/json',
    };
}

class CorePlatformService {
    /**
     * Fetch decrypted SP-API credentials for an integration account
     */
    async getIntegrationCredentials(accountId: string): Promise<IntegrationCredentials> {
        const url = `${CORE_PLATFORM_URL()}/internal/integrations/accounts/${accountId}/credentials`;
        const response = await axios.get(url, { headers: getInternalHeaders(), timeout: 15000 });
        return response.data.data || response.data;
    }

    /**
     * Send a transactional email via core-platform
     */
    async sendEmail(to: string[], subject: string, html: string): Promise<void> {
        const url = `${CORE_PLATFORM_URL()}/internal/email/send`;
        await axios.post(url, { to, subject, html }, { headers: getInternalHeaders(), timeout: 15000 });
        Logger.debug(`Email sent to ${to.join(', ')}`);
    }

    /**
     * Send a Slack message via core-platform
     */
    async sendSlackMessage(organizationId: string, channelId: string, text: string, blocks?: unknown[]): Promise<void> {
        const url = `${CORE_PLATFORM_URL()}/internal/slack/send-to-channel`;
        await axios.post(url, {
            organization_id: organizationId,
            channel: channelId,
            text,
            blocks,
        }, { headers: getInternalHeaders(), timeout: 15000 });
        Logger.debug(`Slack message sent to channel ${channelId}`);
    }

    /**
     * Log an audit event via core-platform
     */
    async createAuditLog(data: {
        actor_id: string;
        organization_id: string;
        action: string;
        entity_type?: string;
        entity_id?: string;
        details?: Record<string, unknown>;
    }): Promise<void> {
        try {
            const url = `${CORE_PLATFORM_URL()}/internal/audit-logs`;
            await axios.post(url, data, { headers: getInternalHeaders(), timeout: 10000 });
        } catch (error) {
            Logger.warn('Failed to create audit log (non-critical)', { error });
        }
    }

    /**
     * Proxy /auth/me for session validation
     */
    async validateSession(sessionId: string, userAgent?: string, ip?: string) {
        const url = `${CORE_PLATFORM_URL()}/auth/me`;
        const response = await axios.get(url, {
            headers: {
                Cookie: `session_id=${sessionId}`,
                'User-Agent': userAgent || '',
                'X-Forwarded-For': ip || '',
            },
            timeout: 30000,
        });
        return response.data?.user || response.data;
    }

    /**
     * Logout — clear session on core platform
     */
    async logout(sessionId: string): Promise<void> {
        const url = `${CORE_PLATFORM_URL()}/auth/logout`;
        await axios.post(url, {}, {
            headers: { Cookie: `session_id=${sessionId}` },
            timeout: 10000,
        });
    }
}

export default new CorePlatformService();
