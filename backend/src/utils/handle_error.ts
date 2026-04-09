import { Response } from 'express';
import Logger from './logger';
import { CorePlatformError } from '../types/corePlatform';

// Shared API response envelope helpers.
//
//   success: { status: 'success', data: T, meta?: object }
//   error:   { status: 'error',   error: { code, message } }
//
// Every response from buybox uses one of these two shapes so the frontend
// has exactly one place to parse.
//
// `meta` is optional and used by controllers that silently clamp/strip
// restricted fields (e.g. settings.updateSettings) so the frontend can toast.

export interface ApiSuccessOptions {
    statusCode?: number;
    meta?: Record<string, unknown>;
}

export function apiSuccess<T>(
    res: Response,
    data: T,
    opts: ApiSuccessOptions = {}
): Response {
    const { statusCode = 200, meta } = opts;
    const body: Record<string, unknown> = { status: 'success', data };
    if (meta) body.meta = meta;
    return res.status(statusCode).json(body);
}

export function apiError(res: Response, statusCode: number, code: string, message: string): Response {
    return res.status(statusCode).json({ status: 'error', error: { code, message } });
}

// Final catch-all for controller try/catch blocks.
// Classifies CorePlatformError into a sensible HTTP status so the frontend
// can react intelligently (session expired -> login redirect, upstream down
// -> retry later).
export function handleError(res: Response, error: unknown, context: string): Response {
    if (error instanceof CorePlatformError) {
        if (error.isUnauthorized) {
            Logger.warn(`${context}: core-platform rejected session`, { code: error.code });
            return apiError(res, 401, 'UNAUTHENTICATED', 'Session expired');
        }
        if (error.isUpstreamUnavailable) {
            Logger.error(`${context}: core-platform upstream unavailable`, {
                code: error.code,
                status: error.status,
                message: error.message,
            });
            return apiError(res, 503, 'UPSTREAM_UNAVAILABLE', 'Upstream service temporarily unavailable');
        }
        Logger.error(`${context}: core-platform error`, {
            code: error.code,
            status: error.status,
            message: error.message,
        });
        return apiError(res, error.status ?? 500, error.code, error.message);
    }

    const message = error instanceof Error ? error.message : 'Unknown error';
    Logger.error(`${context}: ${message}`, { stack: error instanceof Error ? error.stack : undefined });
    return apiError(res, 500, 'INTERNAL_ERROR', 'Internal server error');
}
