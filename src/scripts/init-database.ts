/**
 * Script para inicializar o schema do banco de dados
 * Execute: npx ts-node src/scripts/init-database.ts
 */

import { query, testConnection, closePool } from '../shared/services';
import { logger } from '../shared/services';

const SCHEMA_SQL = `
-- ═══════════════════════════════════════════════════════════════════════════
-- 🗄️ NEXSTAR DISCORD BOTS - DATABASE SCHEMA
-- ═══════════════════════════════════════════════════════════════════════════

-- Guild Configs Table
CREATE TABLE IF NOT EXISTS guild_configs (
    guild_id VARCHAR(20) PRIMARY KEY,
    automod_channel VARCHAR(20),
    prohibited_words TEXT[] DEFAULT '{}',
    vip_category_id VARCHAR(20),
    vip_role_id VARCHAR(20),
    welcome_channel_id VARCHAR(20),
    leave_channel_id VARCHAR(20),
    logs_channel_id VARCHAR(20),
    staff_role_id VARCHAR(20),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Audit Log Table
CREATE TABLE IF NOT EXISTS audit_log (
    id SERIAL PRIMARY KEY,
    guild_id VARCHAR(20) NOT NULL,
    user_id VARCHAR(20) NOT NULL,
    action VARCHAR(50) NOT NULL,
    target_id VARCHAR(20),
    details JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW()
);

-- Private Calls Table
CREATE TABLE IF NOT EXISTS private_calls (
    channel_id VARCHAR(20) PRIMARY KEY,
    guild_id VARCHAR(20) NOT NULL,
    owner_id VARCHAR(20) NOT NULL,
    is_open BOOLEAN DEFAULT true,
    member_limit INTEGER,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Tickets Table
CREATE TABLE IF NOT EXISTS tickets (
    id SERIAL PRIMARY KEY,
    guild_id VARCHAR(20) NOT NULL,
    channel_id VARCHAR(20) UNIQUE,
    user_id VARCHAR(20) NOT NULL,
    category VARCHAR(50),
    status VARCHAR(20) DEFAULT 'open',
    created_at TIMESTAMP DEFAULT NOW(),
    closed_at TIMESTAMP
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_audit_log_guild ON audit_log(guild_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created ON audit_log(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_log_action ON audit_log(action);
CREATE INDEX IF NOT EXISTS idx_private_calls_guild ON private_calls(guild_id);
CREATE INDEX IF NOT EXISTS idx_private_calls_owner ON private_calls(owner_id);
CREATE INDEX IF NOT EXISTS idx_tickets_guild ON tickets(guild_id);
CREATE INDEX IF NOT EXISTS idx_tickets_user ON tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status);
`;

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

    // 2. Create schema
    console.log('📋 Criando tabelas...');
    try {
        await query(SCHEMA_SQL);
        console.log('✅ Schema criado com sucesso!\n');
    } catch (error: any) {
        console.error('❌ Erro ao criar schema:', error.message);
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
