import { query } from './src/shared/services/database';

async function main() {
    try {
        console.log("Upgrading guild...");
        const result = await query("UPDATE guild_configs SET plan = 'ultimate' WHERE guild_id = '1493670485840367709' RETURNING *");
        console.log("Success:", result.rows);
    } catch(e) {
        console.error("Error:", e);
    } finally {
        process.exit(0);
    }
}
main();
