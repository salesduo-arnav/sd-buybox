import app from './app';
import dotenv from 'dotenv';
import path from 'path';
import http from 'http';
import { connectDB, closeDB } from './config/database';
import Logger from './utils/logger';
import { initJobQueue, stopJobQueue } from './services/job_queue.service';
import scanService from './services/scan.service';
import schedulerService from './services/scheduler.service';
import notificationService from './services/notification.service';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const PORT = Number(process.env.PORT) || 5003;

let server: http.Server;

const shutdown = async (signal: string) => {
    Logger.info(`[${signal}] Graceful shutdown started...`);

    const forceExit = setTimeout(() => {
        Logger.error('Force shutdown after 10s');
        process.exit(1);
    }, 10000);

    try {
        if (server) {
            Logger.info('Closing HTTP server...');
            await new Promise<void>((resolve, reject) => {
                server.close(err => (err ? reject(err) : resolve()));
            });
            Logger.info('HTTP server closed.');
        }

        Logger.info('Stopping job queue...');
        await stopJobQueue();
        Logger.info('Job queue stopped.');

        Logger.info('Closing database...');
        await closeDB();
        Logger.info('Database closed.');

        clearTimeout(forceExit);
        Logger.info('Graceful shutdown complete.');
        process.exit(0);
    } catch (err) {
        Logger.error(`Shutdown failed: ${err}`);
        process.exit(1);
    }
};

const startServer = async () => {
    try {
        Logger.info('Initializing services...');

        await connectDB();
        await initJobQueue();
        await scanService.registerJobHandlers();
        await schedulerService.registerJobHandlers();
        await notificationService.registerJobHandlers();

        server = http.createServer(app);

        server.listen(PORT, () => {
            Logger.info(`Server running on port ${PORT}`);
        });
    } catch (err) {
        Logger.error(`Failed to start server: ${err}`);
        process.exit(1);
    }
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

process.once('SIGUSR2', async () => {
    await shutdown('SIGUSR2');
    process.kill(process.pid, 'SIGUSR2');
});

startServer();
