import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/error';
import Logger from '../utils/logger';

export const errorHandler = (err: Error, req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof AppError) {
        return res.status(err.statusCode).json({
            status: 'error',
            message: err.message,
        });
    }

    Logger.error(`Unhandled error: ${err.message}`, { stack: err.stack });

    return res.status(500).json({
        status: 'error',
        message: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
    });
};
