import { Response } from 'express';
import Logger from './logger';

export function handleError(res: Response, error: unknown, context: string): void {
    const message = error instanceof Error ? error.message : 'Unknown error';
    Logger.error(`${context}: ${message}`, { stack: error instanceof Error ? error.stack : undefined });
    res.status(500).json({ status: 'error', message: 'Internal server error' });
}
