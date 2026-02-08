import { database } from "../shared/services/database";
import { logger } from "../shared/services/logger.service";

async function migrate() {
    logger.info("🚀 Starting database migration for Welcome & AutoMod columns...");

    try {
        await database.testConnection();

        const queries = [
            // Welcome / Leave
            `ALTER TABLE guild_configs ADD COLUMN IF NOT EXISTS welcome_message TEXT DEFAULT 'Bem-vindo ao servidor {user}!';`,
            `ALTER TABLE guild_configs ADD COLUMN IF NOT EXISTS leave_message TEXT DEFAULT '{user} saiu do servidor.';`,
            `ALTER TABLE guild_configs ADD COLUMN IF NOT EXISTS autorole_id VARCHAR(20);`,

            // AutoMod
            `ALTER TABLE guild_configs ADD COLUMN IF NOT EXISTS automod_links_enabled BOOLEAN DEFAULT false;`,
            `ALTER TABLE guild_configs ADD COLUMN IF NOT EXISTS automod_caps_enabled BOOLEAN DEFAULT false;`,
            `ALTER TABLE guild_configs ADD COLUMN IF NOT EXISTS automod_spam_enabled BOOLEAN DEFAULT false;`
        ];

        for (const query of queries) {
            logger.info(`Executing: ${query}`);
            await database.query(query);
        }

        logger.info("✅ Migration completed successfully!");
    } catch (error: any) {
        logger.error("❌ Migration failed:", { error: error.message || error });
    } finally {
        await database.closePool();
    }
}

migrate();
