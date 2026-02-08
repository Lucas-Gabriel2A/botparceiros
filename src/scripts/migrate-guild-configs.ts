import { database } from "../shared/services/database";
import { logger } from "../shared/services/logger.service";

async function migrate() {
    logger.info("🚀 Starting database migration for CoreBot AI columns...");

    try {
        await database.testConnection();

        // 1. Check if columns exist (or just try to add them with IF NOT EXISTS if PG supports it, 
        // but explicit checks are safer for logs)

        const queries = [
            `ALTER TABLE guild_configs ADD COLUMN IF NOT EXISTS ia_enabled BOOLEAN DEFAULT true;`,
            `ALTER TABLE guild_configs ADD COLUMN IF NOT EXISTS ia_channel_id VARCHAR(20);`,
            `ALTER TABLE guild_configs ADD COLUMN IF NOT EXISTS ia_system_prompt TEXT DEFAULT 'Você é a IA da Nexstar. Personalidade Única.';`,
            `ALTER TABLE guild_configs ADD COLUMN IF NOT EXISTS ia_admin_roles TEXT[] DEFAULT '{}';`,
            `ALTER TABLE guild_configs ADD COLUMN IF NOT EXISTS ia_voice_enabled BOOLEAN DEFAULT true;`
        ];

        for (const query of queries) {
            logger.info(`Executing: ${query}`);
            await database.query(query);
        }

        logger.info("✅ Migration completed successfully!");
    } catch (error) {
        logger.error("❌ Migration failed:", error);
    } finally {
        await database.closePool();
    }
}

migrate();
