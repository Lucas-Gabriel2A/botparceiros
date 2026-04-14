
import { Client } from 'pg';
import * as dotenv from 'dotenv';
import path from 'path';

// Load env from both root and web
dotenv.config({ path: path.join(process.cwd(), '.env') });
dotenv.config({ path: path.join(process.cwd(), 'web/.env.local') });

const isLocal = process.env.DATABASE_URL?.includes('localhost') || process.env.DATABASE_URL?.includes('127.0.0.1') || process.env.DATABASE_URL?.includes('5435');

const config = {
    connectionString: process.env.DATABASE_URL,
    ssl: isLocal ? false : { rejectUnauthorized: false }
};

const SCHEMA_SQL = `
-- Guild Configs Table
CREATE TABLE IF NOT EXISTS guild_configs (
    guild_id VARCHAR(20) PRIMARY KEY,
    automod_channel VARCHAR(20),
    prohibited_words TEXT[] DEFAULT '{}',
    automod_action VARCHAR(20) DEFAULT 'delete',
    automod_timeout_duration INTEGER DEFAULT 0,
    automod_log_channel VARCHAR(20),
    automod_bypass_roles TEXT[] DEFAULT '{}',
    automod_links_enabled BOOLEAN DEFAULT false,
    automod_caps_enabled BOOLEAN DEFAULT false,
    automod_spam_enabled BOOLEAN DEFAULT false,
    vip_category_id VARCHAR(20),
    vip_role_id VARCHAR(20),
    welcome_channel_id VARCHAR(20),
    leave_channel_id VARCHAR(20),
    logs_channel_id VARCHAR(20),
    staff_role_id VARCHAR(20),
    welcome_message TEXT,
    leave_message TEXT,
    autorole_id VARCHAR(20),
    welcome_font VARCHAR(50),
    welcome_banner_url VARCHAR(255),
    ia_enabled BOOLEAN DEFAULT true,
    ia_channel_id VARCHAR(20),
    ia_system_prompt TEXT DEFAULT 'Você é a IA da CoreBot''s. Personalidade Única.',
    ia_admin_roles TEXT[] DEFAULT '{}',
    ia_voice_enabled BOOLEAN DEFAULT true,
    ia_temperature DECIMAL(3, 2) DEFAULT 0.7,
    ia_ignored_channels TEXT[] DEFAULT '{}',
    ia_ignored_roles TEXT[] DEFAULT '{}',
    private_calls_enabled BOOLEAN DEFAULT false,
    private_calls_category_id VARCHAR(20),
    private_calls_allowed_roles TEXT[] DEFAULT '{}',
    private_calls_manager_role VARCHAR(20),
    ticket_panel_title VARCHAR(255),
    ticket_panel_description TEXT,
    ticket_panel_banner_url VARCHAR(255),
    ticket_panel_color VARCHAR(20),
    ticket_panel_button_text VARCHAR(50),
    ticket_panel_button_emoji VARCHAR(50),
    ticket_panel_footer VARCHAR(255),
    ticket_logs_channel_id VARCHAR(20),
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

-- Private Calls Table (Restored)
CREATE TABLE IF NOT EXISTS private_calls (
    channel_id VARCHAR(20) PRIMARY KEY,
    guild_id VARCHAR(20) NOT NULL,
    owner_id VARCHAR(20) NOT NULL,
    is_open BOOLEAN DEFAULT true,
    member_limit INTEGER,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_private_calls_guild ON private_calls(guild_id);
CREATE INDEX IF NOT EXISTS idx_private_calls_owner ON private_calls(owner_id);

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

-- Tickets Table (Restored)
CREATE TABLE IF NOT EXISTS tickets (
    id SERIAL PRIMARY KEY,
    guild_id VARCHAR(20) NOT NULL,
    channel_id VARCHAR(20),
    user_id VARCHAR(20) NOT NULL,
    category VARCHAR(50),
    status VARCHAR(20) DEFAULT 'open',
    claimed_by VARCHAR(20),
    created_at TIMESTAMP DEFAULT NOW(),
    closed_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_tickets_guild ON tickets(guild_id);
CREATE INDEX IF NOT EXISTS idx_tickets_user ON tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_tickets_channel ON tickets(channel_id);

-- Ticket Categories Table
CREATE TABLE IF NOT EXISTS ticket_categories (
    id VARCHAR(50) PRIMARY KEY,
    guild_id VARCHAR(20) NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    emoji VARCHAR(50),
    color VARCHAR(10) DEFAULT '#7B68EE',
    ticket_channel_category_id VARCHAR(20),
    support_role_id VARCHAR(20),
    welcome_title VARCHAR(255),
    welcome_description TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    created_by VARCHAR(20)
);

CREATE INDEX IF NOT EXISTS idx_ticket_categories_guild ON ticket_categories(guild_id);

-- Custom Commands Table
CREATE TABLE IF NOT EXISTS custom_commands (
    id VARCHAR(50) PRIMARY KEY,
    guild_id VARCHAR(20) NOT NULL,
    name VARCHAR(50) NOT NULL,
    description TEXT,
    response TEXT,
    actions JSONB DEFAULT '[]',
    options JSONB DEFAULT '[]',
    enabled BOOLEAN DEFAULT true,
    created_by VARCHAR(20),
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(guild_id, name)
);

CREATE INDEX IF NOT EXISTS idx_custom_commands_guild ON custom_commands(guild_id);

-- Guild Analytics (Daily Metrics)
CREATE TABLE IF NOT EXISTS guild_analytics (
    guild_id VARCHAR(20) NOT NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    messages_count INTEGER DEFAULT 0,
    members_joined INTEGER DEFAULT 0,
    members_left INTEGER DEFAULT 0,
    tickets_opened INTEGER DEFAULT 0,
    tickets_closed INTEGER DEFAULT 0,
    automod_actions INTEGER DEFAULT 0,
    commands_used INTEGER DEFAULT 0,
    ai_responses INTEGER DEFAULT 0,
    guild_joins INTEGER DEFAULT 0,
    guild_leaves INTEGER DEFAULT 0,
    PRIMARY KEY (guild_id, date)
);

CREATE INDEX IF NOT EXISTS idx_guild_analytics_guild ON guild_analytics(guild_id);
 
-- Partnerships
CREATE TABLE IF NOT EXISTS partnerships (
    id SERIAL PRIMARY KEY,
    guild_id VARCHAR(20) NOT NULL,
    partner_guild_id VARCHAR(20) NOT NULL,
    partner_guild_name VARCHAR(100) NOT NULL,
    partner_invite VARCHAR(100),
    partner_description TEXT,
    channel_id VARCHAR(20),
    status VARCHAR(20) DEFAULT 'active',
    created_by VARCHAR(20),
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(guild_id, partner_guild_id)
);

CREATE INDEX IF NOT EXISTS idx_partnerships_guild ON partnerships(guild_id);


-- AI Usage Tracking (Daily per User per Guild)
CREATE TABLE IF NOT EXISTS ai_usage (
    user_id VARCHAR(20) NOT NULL,
    guild_id VARCHAR(20) NOT NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    count INTEGER DEFAULT 0,
    PRIMARY KEY (user_id, guild_id, date)
);


CREATE INDEX IF NOT EXISTS idx_ai_usage_user ON ai_usage(user_id);

-- Server Generation Usage (Monthly per User)
CREATE TABLE IF NOT EXISTS server_generation_usage (
    user_id VARCHAR(20) NOT NULL,
    month_year VARCHAR(7) NOT NULL, -- Format: YYYY-MM
    count INTEGER DEFAULT 0,
    PRIMARY KEY (user_id, month_year)
);
`;

async function run() {
    console.log('🔄 Connecting to database...', process.env.DATABASE_URL ? 'URL Found' : 'URL Missing');
    const client = new Client(config);

    try {
        await client.connect();
        console.log('✅ Connected.');

        await client.query(SCHEMA_SQL);
        console.log('✅ Schema initialized (All tables created).');

        console.log('✅ Migrations applied.');

    } catch (error) {
        console.error('❌ Database Initialization Error:', error);
    } finally {
        await client.end();
        process.exit(0);
    }
}

run();
