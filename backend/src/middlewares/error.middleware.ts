import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/error';
import Logger from '../utils/logger';
import { env } from '../config/env';
import { apiError } from '../utils/handle_error';

// Last-resort express error handler. Anything that escapes a controller's
// try/catch lands here. Uses the shared
// `{ status: 'error', error: { code, message } }` envelope so the frontend
// has exactly one error shape to parse.
export const errorHandler = (error: Error, _req: Request, res: Response, _next: NextFunction) => {
    if (error instanceof AppError) {
        return apiError(res, error.statusCode, 'APP_ERROR', error.message);
    }

    Logger.error(`Unhandled error: ${error.message}`, { stack: error.stack });

    const safeMessage = env.isProduction ? 'Internal server error' : error.message;
    return apiError(res, 500, 'INTERNAL_ERROR', safeMessage);
};
