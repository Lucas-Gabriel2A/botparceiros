import { query } from './src/shared/services/database';

async function main() {
    try {
        console.log("Iniciando migração da base de dados...");
        // Add welcome_font_changes_count to guild_configs
        await query(`
            ALTER TABLE guild_configs 
            ADD COLUMN IF NOT EXISTS welcome_font_changes_count INTEGER DEFAULT 0;
        `);
        console.log("Success: Adicionada a coluna welcome_font_changes_count.");
        process.exit(0);
    } catch (e) {
        console.error("Erro na migração:");
        console.error(e);
        process.exit(1);
    }
}

main();
