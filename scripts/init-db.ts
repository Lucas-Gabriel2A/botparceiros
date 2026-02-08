
import { Client } from 'pg';
import * as dotenv from 'dotenv';
import path from 'path';

// Load env from both root and web
dotenv.config({ path: path.join(process.cwd(), '.env') });
dotenv.config({ path: path.join(process.cwd(), 'web/.env.local') });

const config = {
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
};

const SCHEMA_SQL = `
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
    ia_enabled BOOLEAN DEFAULT true,
    ia_channel_id VARCHAR(20),
    ia_system_prompt TEXT DEFAULT 'Você é a IA da CoreBot. Personalidade Única.',
    ia_admin_roles TEXT[] DEFAULT '{}',
    ia_voice_enabled BOOLEAN DEFAULT true,
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

-- Indexes
CREATE INDEX IF NOT EXISTS idx_audit_log_guild ON audit_log(guild_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created ON audit_log(created_at);

-- Subscriptions Table
CREATE TABLE IF NOT EXISTS subscriptions (
    id VARCHAR(50) PRIMARY KEY,
    user_id VARCHAR(20) NOT NULL,
    plan VARCHAR(20) NOT NULL,
    status VARCHAR(20) NOT NULL,
    next_payment TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON subscriptions(user_id);

-- Payments Table
CREATE TABLE IF NOT EXISTS payments (
    id BIGINT PRIMARY KEY,
    subscription_id VARCHAR(50) REFERENCES subscriptions(id),
    amount DECIMAL(10, 2) NOT NULL,
    status VARCHAR(20) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payments_subscription ON payments(subscription_id);

-- Ticket Categories Table (New)
CREATE TABLE IF NOT EXISTS ticket_categories (
    id VARCHAR(50) PRIMARY KEY,
    guild_id VARCHAR(20) NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    color VARCHAR(10) DEFAULT '#7B68EE',
    created_at TIMESTAMP DEFAULT NOW(),
    created_by VARCHAR(20)
);

CREATE INDEX IF NOT EXISTS idx_ticket_categories_guild ON ticket_categories(guild_id);
`;

async function run() {
    console.log('🔄 Connecting to database...', process.env.DATABASE_URL ? 'URL Found' : 'URL Missing');
    const client = new Client(config);

    try {
        await client.connect();
        console.log('✅ Connected.');

        await client.query(SCHEMA_SQL);
        console.log('✅ Schema initialized (Tables created if not exist).');

        // Ticket Migration
        await client.query(`
            ALTER TABLE tickets 
            ADD COLUMN IF NOT EXISTS claimed_by VARCHAR(20);
        `);
        console.log('✅ Migrations applied.');

    } catch (error) {
        console.error('❌ Database Initialization Error:', error);
    } finally {
        await client.end();
        process.exit(0);
    }
}

run();
