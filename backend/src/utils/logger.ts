import path from 'path';
import winston from 'winston';
import { env } from '../config/env';

// Winston logger. Logs to stdout in all environments and rotates a file
// transport under logs/app.log. Levels beyond the standard set ('http',
// 'debug') let us separate request logs from debug spam.

const LOG_LEVELS = {
    error: 0,
    warn: 1,
    info: 2,
    http: 3,
    debug: 4,
};

const LEVEL_COLORS = {
    error: 'red',
    warn: 'yellow',
    info: 'green',
    http: 'magenta',
    debug: 'white',
};

winston.addColors(LEVEL_COLORS);

function resolveLogLevel(): string {
    if (env.logger.level) return env.logger.level;
    return env.isProduction ? 'http' : 'debug';
}

const logFormat = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
    winston.format.printf((info) => {
        const { timestamp, level, message, ...meta } = info;
        const metaString = Object.keys(meta).length ? JSON.stringify(meta) : '';
        return `${timestamp} [${level}]: ${message} ${metaString}`;
    })
);

const transports: winston.transport[] = [
    new winston.transports.Console(),
    new winston.transports.File({
        filename: path.join(__dirname, '../../logs/app.log'),
        maxsize: env.logger.fileMaxSizeBytes,
        maxFiles: env.logger.fileMaxFiles,
    }),
];

const Logger = winston.createLogger({
    level: resolveLogLevel(),
    levels: LOG_LEVELS,
    format: logFormat,
    transports,
});

export default Logger;
