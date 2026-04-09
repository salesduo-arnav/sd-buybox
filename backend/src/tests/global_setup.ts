import { Client } from 'pg';
import { env } from '../config/env';

// Jest global setup: ensure a test database exists before any tests run.
// Connects to the default `postgres` database (which always exists), then
// creates the buybox test database if it's missing.

const TEST_DB_FALLBACK = 'buybox_test';
const ADMIN_DATABASE = 'postgres';

export default async function globalSetup(): Promise<void> {
    const client = new Client({
        host: env.db.host,
        port: env.db.port,
        user: env.db.user || 'postgres',
        password: env.db.password || 'postgres',
        database: ADMIN_DATABASE,
    });

    try {
        await client.connect();
        const targetDatabase = env.db.database || TEST_DB_FALLBACK;

        const existing = await client.query(`SELECT 1 FROM pg_database WHERE datname = $1`, [targetDatabase]);
        if (existing.rowCount === 0) {
            await client.query(`CREATE DATABASE "${targetDatabase}"`);
            console.log(`Test database "${targetDatabase}" created`);
        }
    } finally {
        await client.end();
    }
}
