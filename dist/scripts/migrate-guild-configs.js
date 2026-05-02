"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const database_1 = require("../shared/services/database");
const logger_service_1 = require("../shared/services/logger.service");
async function migrate() {
    logger_service_1.logger.info("🚀 Starting database migration for CoreBot AI columns...");
    try {
        await database_1.database.testConnection();
        // 1. Check if columns exist (or just try to add them with IF NOT EXISTS if PG supports it, 
        // but explicit checks are safer for logs)
        const queries = [
            `ALTER TABLE guild_configs ADD COLUMN IF NOT EXISTS ia_enabled BOOLEAN DEFAULT true;`,
            `ALTER TABLE guild_configs ADD COLUMN IF NOT EXISTS ia_channel_id VARCHAR(20);`,
            `ALTER TABLE guild_configs ADD COLUMN IF NOT EXISTS ia_system_prompt TEXT DEFAULT 'Você é a IA da CoreIA. Personalidade Única.';`,
            `ALTER TABLE guild_configs ADD COLUMN IF NOT EXISTS ia_admin_roles TEXT[] DEFAULT '{}';`,
            `ALTER TABLE guild_configs ADD COLUMN IF NOT EXISTS ia_voice_enabled BOOLEAN DEFAULT true;`
        ];
        for (const query of queries) {
            logger_service_1.logger.info(`Executing: ${query}`);
            await database_1.database.query(query);
        }
        logger_service_1.logger.info("✅ Migration completed successfully!");
    }
    catch (error) {
        logger_service_1.logger.error("❌ Migration failed:", error);
    }
    finally {
        await database_1.database.closePool();
    }
}
migrate();
//# sourceMappingURL=migrate-guild-configs.js.map