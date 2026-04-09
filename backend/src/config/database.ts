import { Sequelize } from 'sequelize';
import { env } from './env';
import Logger from '../utils/logger';

// Single shared Sequelize instance. Models import from here so they all
// bind to the same connection pool.
const sequelize = new Sequelize({
    dialect: 'postgres',
    host: env.db.host,
    port: env.db.port,
    username: env.db.user,
    password: env.db.password,
    database: env.db.database,
    logging: false,
    ...(env.isProduction && {
        dialectOptions: {
            ssl: {
                require: true,
                rejectUnauthorized: false,
            },
        },
    }),
});

export const connectDB = async (): Promise<void> => {
    try {
        await sequelize.authenticate();
        Logger.info('Database connected successfully');
    } catch (error) {
        Logger.error('Unable to connect to the database:', error);
        process.exit(1);
    }
};

export const closeDB = async (): Promise<void> => {
    await sequelize.close();
};

export default sequelize;
