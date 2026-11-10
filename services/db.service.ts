import { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg';
import { config } from '../config/index';
import { loggerService } from './logger.service';

let pool: Pool | null = null;

function getPool(): Pool {
    if (!pool) {
        const url = config.postgresURL;
        if (!url) {
            loggerService.error('FATAL: POSTGRES_URL is missing in environment/config.');
            throw new Error('Database connection URL is not configured.');
        }

        const isLocal = url.includes('localhost') || url.includes('127.0.0.1') || url.includes('sslmode=disable');

        pool = new Pool({
            connectionString: url,
            ssl: isLocal ? false : { rejectUnauthorized: false },
            max: 20,
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 10000
        });

        pool.on('error', (err) => {
            loggerService.error('Unexpected error on idle PostgreSQL client', err);
        });
    }
    return pool;
}

async function query<T extends QueryResultRow = any>(text: string, params?: any[]): Promise<QueryResult<T>> {
    const currentPool = getPool();
    const start = Date.now();
    try {
        const res = await currentPool.query<T>(text, params);
        return res;
    } catch (err) {
        loggerService.error('PostgreSQL query error', { text, error: err instanceof Error ? err.message : err });
        throw err;
    }
}

async function getClient(): Promise<PoolClient> {
    const currentPool = getPool();
    return await currentPool.connect();
}

async function close(): Promise<void> {
    if (pool) {
        await pool.end();
        pool = null;
        loggerService.info('PostgreSQL connection pool closed.');
    }
}

export const dbService = {
    query,
    getClient,
    close
};
