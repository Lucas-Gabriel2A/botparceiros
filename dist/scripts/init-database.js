"use strict";
/**
 * Script para inicializar o schema do banco de dados
 * Execute: npx ts-node src/scripts/init-database.ts
 */
Object.defineProperty(exports, "__esModule", { value: true });
const services_1 = require("../shared/services");
const services_2 = require("../shared/services");
async function main() {
    console.log('╔═══════════════════════════════════════════════════════════════╗');
    console.log('║        Core DATABASE INITIALIZATION                        ║');
    console.log('╚═══════════════════════════════════════════════════════════════╝\n');
    // 1. Test connection
    console.log('🔌 Testando conexão...');
    const connected = await (0, services_1.testConnection)();
    if (!connected) {
        console.error('❌ Falha na conexão com o banco de dados');
        process.exit(1);
    }
    console.log('✅ Conexão estabelecida!\n');
    // 2. Initialize schema using shared service
    console.log('📋 Inicializando schema...');
    try {
        await (0, services_1.initializeSchema)();
        console.log('✅ Schema inicializado/migrado com sucesso!\n');
    }
    catch (error) {
        console.error('❌ Erro ao inicializar schema:', error.message);
        process.exit(1);
    }
    // 3. Verify tables
    console.log('🔍 Verificando tabelas criadas...');
    const tablesResult = await (0, services_1.query)(`
        SELECT tablename FROM pg_catalog.pg_tables 
        WHERE schemaname = 'public'
        ORDER BY tablename
    `);
    console.log('\n📊 Tabelas no banco:');
    tablesResult.rows.forEach((row) => {
        console.log(`   ✅ ${row.tablename}`);
    });
    // 4. Count indexes
    const indexResult = await (0, services_1.query)(`
        SELECT COUNT(*) as count FROM pg_indexes WHERE schemaname = 'public'
    `);
    console.log(`\n📈 Índices criados: ${indexResult.rows[0].count}`);
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('✅ Inicialização concluída com sucesso!');
    console.log('═══════════════════════════════════════════════════════════════\n');
    await (0, services_1.closePool)();
}
main().catch(err => {
    services_2.logger.error('Erro fatal:', err);
    process.exit(1);
});
//# sourceMappingURL=init-database.js.map