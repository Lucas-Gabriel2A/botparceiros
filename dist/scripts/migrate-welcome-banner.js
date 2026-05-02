"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const database_1 = require("../shared/services/database");
async function migrate() {
    console.log("Starting migration: Add Welcome Banner columns...");
    try {
        await database_1.database.query(`
            ALTER TABLE guild_configs 
            ADD COLUMN IF NOT EXISTS welcome_banner_url TEXT,
            ADD COLUMN IF NOT EXISTS welcome_font VARCHAR(50) DEFAULT 'Inter';
        `);
        console.log("Migration completed successfully.");
    }
    catch (error) {
        console.error("Migration failed:", error);
    }
}
migrate();
//# sourceMappingURL=migrate-welcome-banner.js.map