import { Client } from 'pg';

const maxRetries = 30;
const retryDelay = 1000;

async function waitForDb() {
    const client = new Client({
        host: process.env.PGHOST || 'localhost',
        port: Number(process.env.PGPORT) || 5434,
        user: process.env.PGUSER || 'postgres',
        password: process.env.PGPASSWORD || 'postgres',
        database: process.env.PGDATABASE || 'buybox_dev',
    });

    for (let i = 0; i < maxRetries; i++) {
        try {
            await client.connect();
            console.log('Database is ready');
            await client.end();
            process.exit(0);
        } catch {
            console.log(`Waiting for database... (${i + 1}/${maxRetries})`);
            await new Promise(resolve => setTimeout(resolve, retryDelay));
        }
    }

    console.error('Database not ready after max retries');
    process.exit(1);
}

waitForDb();
