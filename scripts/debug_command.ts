
import { config } from '../src/shared/services/config.service';
import { Pool } from 'pg';

const pool = new Pool({
    connectionString: config.get('DATABASE_URL'),
    ssl: { rejectUnauthorized: false }
});

async function run() {
    try {
        const res = await pool.query("SELECT * FROM custom_commands WHERE name = 'gerenciar-usuario'");
        console.log(JSON.stringify(res.rows, null, 2));
    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
    }
}

run();
