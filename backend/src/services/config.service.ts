import { SystemConfig } from '../models';
import Logger from '../utils/logger';

// Config Service
//
// Read/write the system_configs table for admin-managed settings.
// Maintains an in-memory cache (60s TTL) so hot-path reads never hit the DB.
// Call `initialize()` at boot to pre-warm the cache.

const CACHE_TTL_MS = 60_000;

class ConfigService {
    private cache = new Map<string, unknown>();
    private lastRefreshAt = 0;

    // Pre-warm the cache at server boot. Must be called after DB is connected.
    async initialize(): Promise<void> {
        await this.refresh();
        Logger.info(`ConfigService initialized — ${this.cache.size} configs cached`);
    }

    // Reload all configs from the DB into the in-memory cache.
    async refresh(): Promise<void> {
        const rows = await SystemConfig.findAll();
        this.cache.clear();
        for (const row of rows) {
            this.cache.set(row.config_key, row.config_value);
        }
        this.lastRefreshAt = Date.now();
    }

    // Synchronous read from cache only. Returns `defaultValue` on cache miss.
    // Safe to call in synchronous code paths — the cache is guaranteed warm
    // after `initialize()` runs at boot.
    getSync<T = unknown>(key: string, defaultValue: T): T {
        if (!this.cache.has(key)) return defaultValue;
        return this.cache.get(key) as T;
    }

    // Async read — checks cache first, falls back to DB if cache is stale
    // or missing the key.
    async get<T = unknown>(key: string, defaultValue?: T): Promise<T> {
        // If cache is fresh and has the key, return it.
        if (this.isCacheFresh() && this.cache.has(key)) {
            return this.cache.get(key) as T;
        }

        // Refresh if stale.
        if (!this.isCacheFresh()) {
            await this.refresh();
            if (this.cache.has(key)) return this.cache.get(key) as T;
        }

        // Key not in cache — try DB directly.
        const config = await SystemConfig.findOne({ where: { config_key: key } });
        if (!config) {
            if (defaultValue !== undefined) return defaultValue;
            throw new Error(`System config not found: ${key}`);
        }
        this.cache.set(key, config.config_value);
        return config.config_value as T;
    }

    // List all configs, sorted by key for stable ordering.
    // Always hits DB (used by admin endpoint which needs live data).
    async getAll(): Promise<SystemConfig[]> {
        return SystemConfig.findAll({ order: [['config_key', 'ASC']] });
    }

    // Upsert a config value and refresh the cache.
    async set(key: string, value: unknown): Promise<SystemConfig> {
        const [config] = await SystemConfig.upsert({
            config_key: key,
            config_value: value,
        });
        Logger.info(`System config updated: ${key}`);
        // Refresh the full cache so all consumers see the new value immediately.
        await this.refresh();
        return config;
    }

    private isCacheFresh(): boolean {
        return this.cache.size > 0 && Date.now() - this.lastRefreshAt < CACHE_TTL_MS;
    }
}

export default new ConfigService();
