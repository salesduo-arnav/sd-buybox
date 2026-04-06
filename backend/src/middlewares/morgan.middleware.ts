import morgan, { StreamOptions } from 'morgan';
import Logger from '../utils/logger';

const stream: StreamOptions = {
    write: (message) => Logger.http(message.trim()),
};

const morganMiddleware = morgan(
    ':method :url :status :res[content-length] - :response-time ms',
    { stream, skip: () => false }
);

export default morganMiddleware;
