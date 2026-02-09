
import { database } from '../src/shared/services/database';
import { logger } from '../src/shared/services/logger.service';

async function migrate() {
    try {
        logger.info('🔄 Iniciando migração manual...');

        // Custom Commands Migration
        await database.query(`
            ALTER TABLE custom_commands
            ADD COLUMN IF NOT EXISTS options JSONB DEFAULT '[]';
        `);

        logger.info('✅ Alteração de tabela aplicada com sucesso!');
    } catch (error) {
        logger.error('❌ Erro na migração:', { error });
    } finally {
        await database.closePool();
    }
}

migrate();
