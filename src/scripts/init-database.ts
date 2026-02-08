/**
 * Script para inicializar o schema do banco de dados
 * Execute: npx ts-node src/scripts/init-database.ts
 */

import { query, testConnection, closePool, initializeSchema } from '../shared/services';
import { logger } from '../shared/services';


async function main() {
    console.log('╔═══════════════════════════════════════════════════════════════╗');
    console.log('║        NEXSTAR DATABASE INITIALIZATION                        ║');
    console.log('╚═══════════════════════════════════════════════════════════════╝\n');

    // 1. Test connection
    console.log('🔌 Testando conexão...');
    const connected = await testConnection();
    if (!connected) {
        console.error('❌ Falha na conexão com o banco de dados');
        process.exit(1);
    }
    console.log('✅ Conexão estabelecida!\n');

    // 2. Initialize schema using shared service
    console.log('📋 Inicializando schema...');
    try {
        await initializeSchema();
        console.log('✅ Schema inicializado/migrado com sucesso!\n');
    } catch (error: any) {
        console.error('❌ Erro ao inicializar schema:', error.message);
        process.exit(1);
    }

    // 3. Verify tables
    console.log('🔍 Verificando tabelas criadas...');
    const tablesResult = await query(`
        SELECT tablename FROM pg_catalog.pg_tables 
        WHERE schemaname = 'public'
        ORDER BY tablename
    `);

    console.log('\n📊 Tabelas no banco:');
    tablesResult.rows.forEach((row: any) => {
        console.log(`   ✅ ${row.tablename}`);
    });

    // 4. Count indexes
    const indexResult = await query(`
        SELECT COUNT(*) as count FROM pg_indexes WHERE schemaname = 'public'
    `);
    console.log(`\n📈 Índices criados: ${(indexResult.rows[0] as any).count}`);

    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('✅ Inicialização concluída com sucesso!');
    console.log('═══════════════════════════════════════════════════════════════\n');

    await closePool();
}

main().catch(err => {
    logger.error('Erro fatal:', err);
    process.exit(1);
});
