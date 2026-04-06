import { Client } from 'pg';

export default async function globalSetup() {
    const client = new Client({
        host: process.env.PGHOST || 'localhost',
        port: Number(process.env.PGPORT) || 5434,
        user: process.env.PGUSER || 'postgres',
        password: process.env.PGPASSWORD || 'postgres',
        database: 'postgres',
    });

    try {
        await client.connect();
        const dbName = process.env.PGDATABASE || 'buybox_test';

        // Create test database if it doesn't exist
        const result = await client.query(
            `SELECT 1 FROM pg_database WHERE datname = $1`,
            [dbName]
        );
        if (result.rowCount === 0) {
            await client.query(`CREATE DATABASE "${dbName}"`);
            console.log(`Test database "${dbName}" created`);
        }
    } finally {
        await client.end();
    }
}
