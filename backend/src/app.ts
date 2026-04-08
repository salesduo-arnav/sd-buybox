import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { errorHandler } from './middlewares/error.middleware';
import morganMiddleware from './middlewares/morgan.middleware';
import routes from './routes';
import { assertCorePlatformEnv } from './services/corePlatform.client';
import './models'; // Initialize associations

// Fail fast at boot if buybox can't reach core-platform.
assertCorePlatformEnv();

const app = express();

const allowedOrigins = (process.env.CORS_ORIGINS ?? '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

if (process.env.NODE_ENV === 'production' && allowedOrigins.length === 0) {
    throw new Error('CORS_ORIGINS must be set in production — buybox will not serve browsers without it.');
}

app.use(helmet());
app.use(
    cors({
        origin: allowedOrigins,
        credentials: true,
    })
);
app.use(express.json());
app.use(cookieParser());
app.use(morganMiddleware);

// Health checks (public)
app.get('/health', (_req, res) => res.status(200).send('OK'));
app.get('/api/health', (_req, res) => res.status(200).send('OK'));

// API routes — auth is mounted inside `routes/index.ts` per group.
app.use('/api', routes);

app.use(errorHandler);

export default app;
