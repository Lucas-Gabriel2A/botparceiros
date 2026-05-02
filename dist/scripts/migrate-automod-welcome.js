"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const database_1 = require("../shared/services/database");
const logger_service_1 = require("../shared/services/logger.service");
async function migrate() {
    logger_service_1.logger.info("🚀 Starting database migration for Welcome & AutoMod columns...");
    try {
        await database_1.database.testConnection();
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
            logger_service_1.logger.info(`Executing: ${query}`);
            await database_1.database.query(query);
        }
        logger_service_1.logger.info("✅ Migration completed successfully!");
    }
    catch (error) {
        logger_service_1.logger.error("❌ Migration failed:", { error: error.message || error });
    }
    finally {
        await database_1.database.closePool();
    }
}
migrate();
//# sourceMappingURL=migrate-automod-welcome.js.map