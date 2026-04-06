import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { errorHandler } from './middlewares/error.middleware';
import morganMiddleware from './middlewares/morgan.middleware';
import routes from './routes';
import './models'; // Initialize associations

const app = express();

app.use(helmet());
const allowedOrigins = process.env.CORS_ORIGINS?.split(',') || [];

app.use(cors({
    origin: allowedOrigins,
    credentials: true,
}));

app.use(express.json());
app.use(cookieParser());
app.use(morganMiddleware);

// Routes
app.use('/api', routes);

// Health Check
app.get('/health', (_req, res) => res.status(200).send('OK'));
app.get('/api/health', (_req, res) => res.status(200).send('OK'));

app.use(errorHandler);

export default app;
