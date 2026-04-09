import { SystemConfig } from '../models';
import Logger from '../utils/logger';

// Config Service
//
// Read/write the system_configs table for admin-managed settings.

class ConfigService {
    // Get a config value by key. Throws if the key is missing and no
    // default was provided.
    async get<T = unknown>(key: string, defaultValue?: T): Promise<T> {
        const config = await SystemConfig.findOne({ where: { config_key: key } });
        if (!config) {
            if (defaultValue !== undefined) return defaultValue;
            throw new Error(`System config not found: ${key}`);
        }
        return config.config_value as T;
    }

    // List all configs, sorted by key for stable ordering.
    async getAll(): Promise<SystemConfig[]> {
        return SystemConfig.findAll({ order: [['config_key', 'ASC']] });
    }

    // Upsert a config value.
    async set(key: string, value: unknown): Promise<SystemConfig> {
        const [config] = await SystemConfig.upsert({
            config_key: key,
            config_value: value,
        });
        Logger.info(`System config updated: ${key}`);
        return config;
    }
}

export default new ConfigService();
