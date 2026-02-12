import { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg';

let pool: Pool | null = null;

export function getPool(): Pool {
    if (!pool) {
        const databaseUrl = process.env.DATABASE_URL;

        if (!databaseUrl) {
            throw new Error('DATABASE_URL not configured');
        }

        pool = new Pool({
            connectionString: databaseUrl,
            max: 5, // Lower max for serverless/Next.js to avoid exhaustion
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 10000,
            ssl: {
                rejectUnauthorized: false
            }
        });
    }
    return pool;
}

export async function query<T extends QueryResultRow = QueryResultRow>(
    text: string,
    params?: unknown[]
): Promise<QueryResult<T>> {
    const pool = getPool();
    try {
        return await pool.query<T>(text, params);
    } catch (error: any) {
        console.error(`Database Error: ${error.message} (Query: ${text})`);
        throw error;
    }
}
