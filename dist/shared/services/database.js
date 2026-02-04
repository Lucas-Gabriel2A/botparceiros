"use strict";
/**
 * ╔═══════════════════════════════════════════════════════════════════════════╗
 * ║                      NEXSTAR DATABASE SERVICE                             ║
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
exports.getTicket = getTicket;
exports.getTicketsByUser = getTicketsByUser;
exports.closeTicket = closeTicket;
exports.deleteTicket = deleteTicket;
exports.getOpenTickets = getOpenTickets;
exports.closePool = closePool;
const pg_1 = require("pg");
const index_1 = require("./index");
// ═══════════════════════════════════════════════════════════════════════════
// 🔗 CONNECTION POOL
// ═══════════════════════════════════════════════════════════════════════════
let pool = null;
function getPool() {
    if (!pool) {
        const databaseUrl = index_1.config.getOptional('DATABASE_URL');
        if (!databaseUrl) {
            throw new Error('DATABASE_URL não configurada. Database desabilitado.');
        }
        pool = new pg_1.Pool({
            connectionString: databaseUrl,
            max: 10,
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 5000,
            ssl: {
                rejectUnauthorized: false // Railway uses self-signed certs
            }
        });
        pool.on('error', (err) => {
            index_1.logger.error('Erro no pool do PostgreSQL:', { error: err.message });
        });
        pool.on('connect', () => {
            index_1.logger.info('📦 Nova conexão PostgreSQL estabelecida');
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
            index_1.logger.warn(`Query lenta (${duration}ms): ${text.substring(0, 50)}...`);
        }
        return result;
    }
    catch (error) {
        index_1.logger.error(`Erro na query: ${error.message}`);
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
        index_1.logger.info(`✅ Conexão PostgreSQL OK: ${result.rows[0]?.now}`);
        return true;
    }
    catch (error) {
        index_1.logger.error(`❌ Falha na conexão PostgreSQL: ${error.message}`);
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
    vip_category_id VARCHAR(20),
    vip_role_id VARCHAR(20),
    welcome_channel_id VARCHAR(20),
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
`;
async function initializeSchema() {
    try {
        await query(SCHEMA_SQL);
        index_1.logger.info('✅ Schema do banco inicializado com sucesso');
    }
    catch (error) {
        index_1.logger.error(`❌ Erro ao inicializar schema: ${error.message}`);
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
async function upsertGuildConfig(guildId, updates) {
    const fields = Object.keys(updates);
    const values = Object.values(updates);
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
    const fields = Object.keys(updates).filter(k => updates[k] !== undefined);
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
// 🧹 CLEANUP
// ═══════════════════════════════════════════════════════════════════════════
async function closePool() {
    if (pool) {
        await pool.end();
        pool = null;
        index_1.logger.info('🔌 Pool PostgreSQL fechado');
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
    // Cleanup
    closePool,
    getPool
};
exports.default = exports.database;
//# sourceMappingURL=database.js.map