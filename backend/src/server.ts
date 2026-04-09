import http from 'http';
import app from './app';
import { env } from './config/env';
import { connectDB, closeDB } from './config/database';
import Logger from './utils/logger';
import { initJobQueue, stopJobQueue } from './services/job_queue.service';
import scanService from './services/scan.service';
import schedulerService from './services/scheduler.service';
import notificationService from './services/notification.service';

let httpServer: http.Server | undefined;

// Graceful shutdown — close the HTTP server, stop the job queue, and
// disconnect the database. If anything hangs we force-exit after a timeout
// so the process never becomes a zombie in production.
const shutdown = async (signal: string): Promise<void> => {
    Logger.info(`[${signal}] Graceful shutdown started...`);

    const forceExitTimer = setTimeout(() => {
        Logger.error(`Force shutdown after ${env.shutdown.forceExitMs}ms`);
        process.exit(1);
    }, env.shutdown.forceExitMs);

    try {
        if (httpServer) {
            Logger.info('Closing HTTP server...');
            await new Promise<void>((resolve, reject) => {
                httpServer!.close((error) => (error ? reject(error) : resolve()));
            });
            Logger.info('HTTP server closed.');
        }

        Logger.info('Stopping job queue...');
        await stopJobQueue();
        Logger.info('Job queue stopped.');

        Logger.info('Closing database...');
        await closeDB();
        Logger.info('Database closed.');

        clearTimeout(forceExitTimer);
        Logger.info('Graceful shutdown complete.');
        process.exit(0);
    } catch (error) {
        Logger.error(`Shutdown failed: ${error}`);
        process.exit(1);
    }
};

const startServer = async (): Promise<void> => {
    try {
        Logger.info('Initializing services...');

        await connectDB();
        await initJobQueue();
        await scanService.registerJobHandlers();
        await schedulerService.registerJobHandlers();
        await notificationService.registerJobHandlers();

        httpServer = http.createServer(app);
        httpServer.listen(env.port, () => {
            Logger.info(`Server running on port ${env.port}`);
        });
    } catch (error) {
        Logger.error(`Failed to start server: ${error}`);
        process.exit(1);
    }
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

// nodemon sends SIGUSR2 on restart.
process.once('SIGUSR2', async () => {
    await shutdown('SIGUSR2');
    process.kill(process.pid, 'SIGUSR2');
});

startServer();
