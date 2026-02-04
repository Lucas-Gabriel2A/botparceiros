/**
 * Script de teste para conexão PostgreSQL
 * Execute: npx ts-node src/scripts/test-database.ts
 */

import { testConnection, initializeSchema, upsertGuildConfig, getGuildConfig, logAudit, getAuditLogs, closePool } from '../shared/services';

async function main() {
    console.log('🔍 Testando conexão com PostgreSQL...\n');

    // 1. Teste de conexão
    const connected = await testConnection();
    if (!connected) {
        console.error('❌ Falha na conexão');
        process.exit(1);
    }

    // 2. Inicializar schema
    console.log('\n📋 Inicializando schema...');
    await initializeSchema();

    // 3. Testar upsert de config
    console.log('\n📝 Testando upsert de guild_configs...');
    const config = await upsertGuildConfig('123456789', {
        automod_channel: '987654321',
        prohibited_words: ['teste', 'spam']
    });
    console.log('Config criada:', config);

    // 4. Testar leitura
    console.log('\n📖 Lendo config...');
    const readConfig = await getGuildConfig('123456789');
    console.log('Config lida:', readConfig);

    // 5. Testar audit log
    console.log('\n📝 Testando audit log...');
    const log = await logAudit('123456789', '111222333', 'test_action', '444555666', { reason: 'teste' });
    console.log('Log criado:', log);

    // 6. Ler logs
    console.log('\n📖 Lendo logs...');
    const logs = await getAuditLogs('123456789', 5);
    console.log('Logs:', logs);

    // 7. Limpar e fechar
    console.log('\n✅ Testes concluídos com sucesso!');
    await closePool();
}

main().catch(err => {
    console.error('❌ Erro:', err);
    process.exit(1);
});
