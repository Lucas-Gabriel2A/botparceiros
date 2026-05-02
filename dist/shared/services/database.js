"use strict";
/**
* ╔═══════════════════════════════════════════════════════════════════════════╗
* ║                     COREBOT DATABASE SERVICE                             ║
* ║                   PostgreSQL Connection + Queries                         ║
* ╚═══════════════════════════════════════════════════════════════════════════╝
*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.database = void 0;
exports.getPool = getPool;
exports.query = query;
exports.getClient = getClient;
exports.testConnection = testConnection;
exports.initializeSchema = initializeSchema;
exports.getGuildConfig = getGuildConfig;
exports.upsertGuildConfig = upsertGuildConfig;
exports.logAudit = logAudit;
exports.getAuditLogs = getAuditLogs;
exports.createPrivateCall = createPrivateCall;
exports.getPrivateCall = getPrivateCall;
exports.getPrivateCallByOwner = getPrivateCallByOwner;
exports.updatePrivateCall = updatePrivateCall;
exports.deletePrivateCall = deletePrivateCall;
exports.getAllPrivateCalls = getAllPrivateCalls;
exports.createTicket = createTicket;
exports.createTicketCategory = createTicketCategory;
exports.getTicketCategories = getTicketCategories;
exports.updateTicketCategory = updateTicketCategory;
exports.deleteTicketCategory = deleteTicketCategory;
exports.getTicketCategory = getTicketCategory;
exports.claimTicket = claimTicket;
exports.getTicket = getTicket;
exports.getTicketsByUser = getTicketsByUser;
exports.closeTicket = closeTicket;
exports.deleteTicket = deleteTicket;
exports.getOpenTickets = getOpenTickets;
exports.createSubscription = createSubscription;
exports.getSubscription = getSubscription;
exports.getSubscriptionByUser = getSubscriptionByUser;
exports.updateSubscriptionStatus = updateSubscriptionStatus;
exports.createPayment = createPayment;
exports.getPaymentsBySubscription = getPaymentsBySubscription;
exports.closePool = closePool;
exports.createCustomCommand = createCustomCommand;
exports.getCustomCommands = getCustomCommands;
exports.getCustomCommand = getCustomCommand;
exports.deleteCustomCommand = deleteCustomCommand;
exports.toggleCustomCommand = toggleCustomCommand;
const pg_1 = require("pg");
const config_service_1 = require("./config.service");
const logger_service_1 = require("./logger.service");
// ═══════════════════════════════════════════════════════════════════════════
// 🔗 CONNECTION POOL
// ═══════════════════════════════════════════════════════════════════════════
let pool = null;
function getPool() {
    if (!pool) {
        const databaseUrl = config_service_1.config.getOptional('DATABASE_URL');
        if (!databaseUrl) {
            throw new Error('DATABASE_URL não configurada. Database desabilitado.');
        }
        const isLocal = databaseUrl.includes('localhost') || databaseUrl.includes('127.0.0.1');
        pool = new pg_1.Pool({
            connectionString: databaseUrl,
            max: 5, // Limite conservador para evitar erros no Railway/Dev
            idleTimeoutMillis: 10000, // Fecha conexões ociosas após 10s
            connectionTimeoutMillis: 10000, // Timeout de conexão de 10s
            allowExitOnIdle: false,
            ssl: isLocal ? false : {
                rejectUnauthorized: false
            }
        });
        pool.on('error', (err) => {
            logger_service_1.logger.error('Erro no pool do PostgreSQL:', { error: err.message });
        });
        pool.on('connect', () => {
            logger_service_1.logger.info('📦 Nova conexão PostgreSQL estabelecida');
        });
    }
    return pool;
}
// ═══════════════════════════════════════════════════════════════════════════
// 🔧 QUERY HELPERS
// ═══════════════════════════════════════════════════════════════════════════
async function query(text, params) {
    const pool = getPool();
    const start = Date.now();
    try {
        const result = await pool.query(text, params);
        const duration = Date.now() - start;
        if (duration > 1000) {
            logger_service_1.logger.warn(`Query lenta (${duration}ms): ${text.substring(0, 50)}...`);
        }
        return result;
    }
    catch (error) {
        logger_service_1.logger.error(`Erro na query: `, { error: error.message || error });
        throw error;
    }
}
async function getClient() {
    const pool = getPool();
    return pool.connect();
}
async function testConnection() {
    try {
        const result = await query('SELECT NOW()');
        logger_service_1.logger.info(`✅ Conexão PostgreSQL OK: ${result.rows[0]?.now}`);
        return true;
    }
    catch (error) {
        logger_service_1.logger.error(`❌ Falha na conexão PostgreSQL: `, { error: error.message || error });
        return false;
    }
}
// ═══════════════════════════════════════════════════════════════════════════
// 📋 SCHEMA INITIALIZATION
// ═══════════════════════════════════════════════════════════════════════════
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
    ia_system_prompt TEXT DEFAULT 'Você é a IA da CoreIA. Personalidade Única.',
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

-- Ticket Categories Table (New)
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
async function initializeSchema() {
    try {
        await query(SCHEMA_SQL);
        // 🛠️ MIGRATION: Ensure columns exist for existing tables
        try {
            await query(`
                ALTER TABLE guild_configs 
                ADD COLUMN IF NOT EXISTS automod_channel VARCHAR(20),
                ADD COLUMN IF NOT EXISTS prohibited_words TEXT[] DEFAULT '{}',
                ADD COLUMN IF NOT EXISTS automod_action VARCHAR(20) DEFAULT 'delete',
                ADD COLUMN IF NOT EXISTS automod_timeout_duration INTEGER DEFAULT 0,
                ADD COLUMN IF NOT EXISTS automod_log_channel VARCHAR(20),
                ADD COLUMN IF NOT EXISTS automod_bypass_roles TEXT[] DEFAULT '{}',
                ADD COLUMN IF NOT EXISTS automod_links_enabled BOOLEAN DEFAULT false,
                ADD COLUMN IF NOT EXISTS automod_caps_enabled BOOLEAN DEFAULT false,
                ADD COLUMN IF NOT EXISTS automod_spam_enabled BOOLEAN DEFAULT false,
                ADD COLUMN IF NOT EXISTS ia_temperature DECIMAL(3, 2) DEFAULT 0.7,
                ADD COLUMN IF NOT EXISTS ia_ignored_channels TEXT[] DEFAULT '{}',
                ADD COLUMN IF NOT EXISTS ia_ignored_roles TEXT[] DEFAULT '{}',
                ADD COLUMN IF NOT EXISTS private_calls_enabled BOOLEAN DEFAULT false,
                ADD COLUMN IF NOT EXISTS private_calls_category_id VARCHAR(20),
                ADD COLUMN IF NOT EXISTS private_calls_allowed_roles TEXT[] DEFAULT '{}',
                ADD COLUMN IF NOT EXISTS private_calls_manager_role VARCHAR(20),
                
                ADD COLUMN IF NOT EXISTS welcome_message TEXT,
                ADD COLUMN IF NOT EXISTS leave_message TEXT,
                ADD COLUMN IF NOT EXISTS autorole_id VARCHAR(20),
                ADD COLUMN IF NOT EXISTS welcome_font VARCHAR(50),
                ADD COLUMN IF NOT EXISTS welcome_banner_url VARCHAR(255),
                ADD COLUMN IF NOT EXISTS welcome_font_changes_count INTEGER DEFAULT 0,
                
                -- Ticket Panel Customization
                ADD COLUMN IF NOT EXISTS ticket_panel_title VARCHAR(255),
                ADD COLUMN IF NOT EXISTS ticket_panel_description TEXT,
                ADD COLUMN IF NOT EXISTS ticket_panel_banner_url VARCHAR(255),
                ADD COLUMN IF NOT EXISTS ticket_panel_color VARCHAR(20),
                ADD COLUMN IF NOT EXISTS ticket_panel_button_text VARCHAR(50),
                ADD COLUMN IF NOT EXISTS ticket_panel_button_emoji VARCHAR(50),
                ADD COLUMN IF NOT EXISTS ticket_panel_footer VARCHAR(255),
                ADD COLUMN IF NOT EXISTS ticket_logs_channel_id VARCHAR(20),
                ADD COLUMN IF NOT EXISTS automod_ai_enabled BOOLEAN DEFAULT false,
                ADD COLUMN IF NOT EXISTS whitelabel_name VARCHAR(32),
                ADD COLUMN IF NOT EXISTS ia_triggers TEXT[] DEFAULT '{}',
                ADD COLUMN IF NOT EXISTS whitelabel_avatar_url VARCHAR(255);
            `);
            // Ticket Migration
            await query(`
                ALTER TABLE tickets 
                ADD COLUMN IF NOT EXISTS claimed_by VARCHAR(20),
                ADD COLUMN IF NOT EXISTS category VARCHAR(50),
                ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'open';
            `);
            // Ticket Category Migration
            await query(`
                ALTER TABLE ticket_categories
                ADD COLUMN IF NOT EXISTS emoji VARCHAR(50),
                ADD COLUMN IF NOT EXISTS ticket_channel_category_id VARCHAR(20),
                ADD COLUMN IF NOT EXISTS support_role_id VARCHAR(20),
                ADD COLUMN IF NOT EXISTS welcome_title VARCHAR(255),
                ADD COLUMN IF NOT EXISTS welcome_description TEXT;
            `);
            // Custom Commands Migration
            await query(`
                ALTER TABLE custom_commands
                ADD COLUMN IF NOT EXISTS options JSONB DEFAULT '[]';
            `);
            // Analytics Migration
            await query(`
                ALTER TABLE guild_analytics
                ADD COLUMN IF NOT EXISTS guild_joins INTEGER DEFAULT 0,
                ADD COLUMN IF NOT EXISTS guild_leaves INTEGER DEFAULT 0;
            `);
            logger_service_1.logger.info('✅ Schema migrado: colunas verificadas.');
        }
        catch (migError) {
            logger_service_1.logger.warn('⚠️ Erro na migração (pode ser ignorado se colunas existirem):', { error: migError });
        }
        logger_service_1.logger.info('✅ Schema do banco inicializado com sucesso');
    }
    catch (error) {
        logger_service_1.logger.error(`❌ Erro ao inicializar schema: ${error.message}`);
        throw error;
    }
}
// ═══════════════════════════════════════════════════════════════════════════
// 📊 GUILD CONFIG OPERATIONS
// ═══════════════════════════════════════════════════════════════════════════
async function getGuildConfig(guildId) {
    const result = await query('SELECT * FROM guild_configs WHERE guild_id = $1', [guildId]);
    return result.rows[0] || null;
}
// Whitelist de colunas permitidas para prevenir SQL Injection
const GUILD_CONFIG_COLUMNS = new Set([
    'automod_channel', 'prohibited_words', 'vip_category_id', 'vip_role_id',
    'welcome_channel_id', 'leave_channel_id', 'logs_channel_id', 'staff_role_id',
    'welcome_message', 'leave_message', 'autorole_id', 'welcome_font', 'welcome_banner_url', 'welcome_font_changes_count',
    'automod_links_enabled', 'automod_caps_enabled', 'automod_spam_enabled',
    'automod_action', 'automod_timeout_duration', 'automod_log_channel', 'automod_bypass_roles',
    'ia_enabled', 'ia_channel_id', 'ia_system_prompt', 'ia_admin_roles', 'ia_triggers',
    'ia_voice_enabled', 'ia_temperature', 'ia_ignored_channels', 'ia_ignored_roles',
    'private_calls_enabled', 'private_calls_category_id', 'private_calls_allowed_roles', 'private_calls_manager_role',
    'ticket_panel_title', 'ticket_panel_description', 'ticket_panel_banner_url',
    'ticket_panel_color', 'ticket_panel_button_text', 'ticket_panel_button_emoji', 'ticket_panel_footer',
    'ticket_logs_channel_id',
    'automod_ai_enabled',
    'whitelabel_name', 'whitelabel_avatar_url'
]);
const PRIVATE_CALL_COLUMNS = new Set(['is_open', 'member_limit', 'owner_id']);
const TICKET_CATEGORY_COLUMNS = new Set([
    'name', 'description', 'emoji', 'color',
    'ticket_channel_category_id', 'support_role_id', 'welcome_title', 'welcome_description'
]);
async function upsertGuildConfig(guildId, updates) {
    const fields = Object.keys(updates).filter(f => GUILD_CONFIG_COLUMNS.has(f));
    const values = fields.map(f => updates[f]);
    if (fields.length === 0) {
        throw new Error('No fields to update');
    }
    const setClause = fields.map((f, i) => `${f} = $${i + 2}`).join(', ');
    const insertFields = ['guild_id', ...fields].join(', ');
    const insertValues = ['$1', ...fields.map((_, i) => `$${i + 2}`)].join(', ');
    const sql = `
        INSERT INTO guild_configs (${insertFields}, updated_at)
        VALUES (${insertValues}, NOW())
        ON CONFLICT (guild_id) 
        DO UPDATE SET ${setClause}, updated_at = NOW()
        RETURNING *
    `;
    const result = await query(sql, [guildId, ...values]);
    return result.rows[0];
}
// ═══════════════════════════════════════════════════════════════════════════
// 📝 AUDIT LOG OPERATIONS
// ═══════════════════════════════════════════════════════════════════════════
async function logAudit(guildId, userId, action, targetId, details) {
    const result = await query(`INSERT INTO audit_log (guild_id, user_id, action, target_id, details)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`, [guildId, userId, action, targetId || null, JSON.stringify(details || {})]);
    return result.rows[0];
}
async function getAuditLogs(guildId, limit = 50, offset = 0) {
    const result = await query(`SELECT * FROM audit_log 
         WHERE guild_id = $1 
         ORDER BY created_at DESC 
         LIMIT $2 OFFSET $3`, [guildId, limit, offset]);
    return result.rows;
}
async function createPrivateCall(channelId, guildId, ownerId, isOpen = true, memberLimit) {
    const result = await query(`INSERT INTO private_calls (channel_id, guild_id, owner_id, is_open, member_limit)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (channel_id) DO UPDATE SET 
            owner_id = $3, is_open = $4, member_limit = $5
         RETURNING *`, [channelId, guildId, ownerId, isOpen, memberLimit || null]);
    return result.rows[0];
}
async function getPrivateCall(channelId) {
    const result = await query('SELECT * FROM private_calls WHERE channel_id = $1', [channelId]);
    return result.rows[0] || null;
}
async function getPrivateCallByOwner(guildId, ownerId) {
    const result = await query('SELECT * FROM private_calls WHERE guild_id = $1 AND owner_id = $2', [guildId, ownerId]);
    return result.rows[0] || null;
}
async function updatePrivateCall(channelId, updates) {
    const fields = Object.keys(updates).filter(k => PRIVATE_CALL_COLUMNS.has(k) && updates[k] !== undefined);
    if (fields.length === 0)
        return null;
    const setClause = fields.map((f, i) => `${f} = $${i + 2}`).join(', ');
    const values = fields.map(f => updates[f]);
    const result = await query(`UPDATE private_calls SET ${setClause} WHERE channel_id = $1 RETURNING *`, [channelId, ...values]);
    return result.rows[0] || null;
}
async function deletePrivateCall(channelId) {
    const result = await query('DELETE FROM private_calls WHERE channel_id = $1', [channelId]);
    return (result.rowCount ?? 0) > 0;
}
async function getAllPrivateCalls(guildId) {
    const result = await query('SELECT * FROM private_calls WHERE guild_id = $1', [guildId]);
    return result.rows;
}
async function createTicket(guildId, channelId, userId, category) {
    const result = await query(`INSERT INTO tickets (guild_id, channel_id, user_id, category, status)
         VALUES ($1, $2, $3, $4, 'open')
         RETURNING *`, [guildId, channelId, userId, category || null]);
    return result.rows[0];
}
async function createTicketCategory(id, guildId, name, description, color, createdBy, emoji, ticketChannelCategoryId, supportRoleId, welcomeTitle, welcomeDescription) {
    const result = await query(`INSERT INTO ticket_categories (
            id, guild_id, name, description, color, created_by,
            emoji, ticket_channel_category_id, support_role_id, welcome_title, welcome_description
        )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         RETURNING *`, [
        id, guildId, name, description, color, createdBy,
        emoji || null, ticketChannelCategoryId || null, supportRoleId || null, welcomeTitle || null, welcomeDescription || null
    ]);
    return result.rows[0];
}
async function getTicketCategories(guildId) {
    const result = await query('SELECT * FROM ticket_categories WHERE guild_id = $1 ORDER BY created_at ASC', [guildId]);
    return result.rows;
}
async function updateTicketCategory(id, updates) {
    const fields = Object.keys(updates).filter(f => TICKET_CATEGORY_COLUMNS.has(f));
    const values = fields.map(f => updates[f]);
    if (fields.length === 0)
        return null;
    const setClause = fields.map((f, i) => `${f} = $${i + 2}`).join(', ');
    const result = await query(`UPDATE ticket_categories SET ${setClause} WHERE id = $1 RETURNING *`, [id, ...values]);
    return result.rows[0] || null;
}
async function deleteTicketCategory(id) {
    const result = await query('DELETE FROM ticket_categories WHERE id = $1', [id]);
    return (result.rowCount ?? 0) > 0;
}
async function getTicketCategory(id) {
    const result = await query('SELECT * FROM ticket_categories WHERE id = $1', [id]);
    return result.rows[0] || null;
}
async function claimTicket(channelId, userId) {
    const result = await query(`UPDATE tickets SET claimed_by = $2 WHERE channel_id = $1 RETURNING *`, [channelId, userId]);
    return result.rows[0] || null;
}
async function getTicket(channelId) {
    const result = await query('SELECT * FROM tickets WHERE channel_id = $1', [channelId]);
    return result.rows[0] || null;
}
async function getTicketsByUser(guildId, userId) {
    const result = await query(`SELECT * FROM tickets WHERE guild_id = $1 AND user_id = $2 AND status = 'open'`, [guildId, userId]);
    return result.rows;
}
async function closeTicket(channelId) {
    const result = await query(`UPDATE tickets SET status = 'closed', closed_at = NOW() 
         WHERE channel_id = $1 RETURNING *`, [channelId]);
    return result.rows[0] || null;
}
async function deleteTicket(channelId) {
    const result = await query('DELETE FROM tickets WHERE channel_id = $1', [channelId]);
    return (result.rowCount ?? 0) > 0;
}
async function getOpenTickets(guildId) {
    const result = await query(`SELECT * FROM tickets WHERE guild_id = $1 AND status = 'open' ORDER BY created_at DESC`, [guildId]);
    return result.rows;
}
// ═══════════════════════════════════════════════════════════════════════════
// 💳 SUBSCRIPTION OPERATIONS
// ═══════════════════════════════════════════════════════════════════════════
async function createSubscription(id, userId, plan, status, nextPayment) {
    const result = await query(`INSERT INTO subscriptions (id, user_id, plan, status, next_payment)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`, [id, userId, plan, status, nextPayment || null]);
    return result.rows[0];
}
async function getSubscription(id) {
    const result = await query('SELECT * FROM subscriptions WHERE id = $1', [id]);
    return result.rows[0] || null;
}
async function getSubscriptionByUser(userId) {
    const result = await query(`SELECT * FROM subscriptions WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1`, [userId]);
    return result.rows[0] || null;
}
async function updateSubscriptionStatus(id, status, nextPayment) {
    const result = await query(`UPDATE subscriptions SET status = $2, next_payment = COALESCE($3, next_payment), updated_at = NOW() 
         WHERE id = $1 RETURNING *`, [id, status, nextPayment || null]);
    return result.rows[0] || null;
}
// ═══════════════════════════════════════════════════════════════════════════
// 💰 PAYMENT OPERATIONS
// ═══════════════════════════════════════════════════════════════════════════
async function createPayment(id, subscriptionId, amount, status) {
    const result = await query(`INSERT INTO payments (id, subscription_id, amount, status)
         VALUES ($1, $2, $3, $4)
         RETURNING *`, [id, subscriptionId, amount, status]);
    return result.rows[0];
}
async function getPaymentsBySubscription(subscriptionId) {
    const result = await query(`SELECT * FROM payments WHERE subscription_id = $1 ORDER BY created_at DESC`, [subscriptionId]);
    return result.rows;
}
// ═══════════════════════════════════════════════════════════════════════════
// 🧹 CLEANUP
// ═══════════════════════════════════════════════════════════════════════════
async function closePool() {
    if (pool) {
        await pool.end();
        pool = null;
        logger_service_1.logger.info('🔌 Pool PostgreSQL fechado');
    }
}
// Export default database object
exports.database = {
    query,
    getClient,
    testConnection,
    initializeSchema,
    getGuildConfig,
    upsertGuildConfig,
    logAudit,
    getAuditLogs,
    // Private Calls
    createPrivateCall,
    getPrivateCall,
    getPrivateCallByOwner,
    updatePrivateCall,
    deletePrivateCall,
    getAllPrivateCalls,
    // Tickets
    createTicket,
    getTicket,
    getTicketsByUser,
    closeTicket,
    deleteTicket,
    getOpenTickets,
    // Ticket Categories
    createTicketCategory,
    getTicketCategories,
    updateTicketCategory,
    deleteTicketCategory,
    getTicketCategory,
    claimTicket,
    // Subscriptions
    createSubscription,
    getSubscription,
    getSubscriptionByUser,
    updateSubscriptionStatus,
    // Payments
    createPayment,
    getPaymentsBySubscription,
    // Cleanup
    closePool,
    getPool,
    // Custom Commands
    createCustomCommand,
    getCustomCommands,
    getCustomCommand,
    deleteCustomCommand,
    toggleCustomCommand
};
async function createCustomCommand(id, guildId, name, description, response, actions, createdBy, options = []) {
    const result = await query(`INSERT INTO custom_commands (id, guild_id, name, description, response, actions, created_by, options)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING *`, [id, guildId, name, description, response, JSON.stringify(actions), createdBy, JSON.stringify(options)]);
    return result.rows[0];
}
async function getCustomCommands(guildId) {
    const result = await query('SELECT * FROM custom_commands WHERE guild_id = $1 ORDER BY name ASC', [guildId]);
    return result.rows;
}
async function getCustomCommand(guildId, name) {
    const result = await query('SELECT * FROM custom_commands WHERE guild_id = $1 AND name = $2', [guildId, name]);
    return result.rows[0] || null;
}
async function deleteCustomCommand(id) {
    const result = await query('DELETE FROM custom_commands WHERE id = $1', [id]);
    return (result.rowCount ?? 0) > 0;
}
async function toggleCustomCommand(id, enabled) {
    const result = await query('UPDATE custom_commands SET enabled = $2 WHERE id = $1 RETURNING *', [id, enabled]);
    return result.rows[0] || null;
}
exports.default = exports.database;
//# sourceMappingURL=database.js.map