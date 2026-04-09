import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { env, assertRequiredEnv } from './config/env';
import { errorHandler } from './middlewares/error.middleware';
import morganMiddleware from './middlewares/morgan.middleware';
import routes from './routes';
import './models'; // initialize model associations

// Fail fast at boot if any required env var is missing.
assertRequiredEnv();

const app = express();

app.use(helmet());
app.use(
    cors({
        origin: env.corsOrigins,
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
