/**
 * ╔═══════════════════════════════════════════════════════════════════════════╗
 * ║                      NEXSTAR DATABASE SERVICE                             ║
 * ║                   PostgreSQL Connection + Queries                         ║
 * ╚═══════════════════════════════════════════════════════════════════════════╝
 */

import { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg';
import { config, logger } from './index';

// ═══════════════════════════════════════════════════════════════════════════
// 📊 TIPOS
// ═══════════════════════════════════════════════════════════════════════════

export interface GuildConfig extends QueryResultRow {
    guild_id: string;
    automod_channel: string | null;
    prohibited_words: string[];
    vip_category_id: string | null;
    vip_role_id: string | null;
    welcome_channel_id: string | null;
    leave_channel_id: string | null;
    logs_channel_id: string | null;
    staff_role_id: string | null;
    
    // Configurações NexstarIA (SaaS)
    ia_enabled?: boolean;
    ia_channel_id?: string | null;
    ia_system_prompt?: string | null;
    ia_admin_roles?: string[];
    ia_voice_enabled?: boolean;
    
    updated_at: Date;
}

export interface AuditLog {
    id: number;
    guild_id: string;
    user_id: string;
    action: string;
    target_id: string | null;
    details: Record<string, unknown>;
    created_at: Date;
}

// ═══════════════════════════════════════════════════════════════════════════
// 🔗 CONNECTION POOL
// ═══════════════════════════════════════════════════════════════════════════

let pool: Pool | null = null;

export function getPool(): Pool {
    if (!pool) {
        const databaseUrl = config.getOptional('DATABASE_URL');
        
        if (!databaseUrl) {
            throw new Error('DATABASE_URL não configurada. Database desabilitado.');
        }

        pool = new Pool({
            connectionString: databaseUrl,
            max: 10,
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 5000,
            ssl: {
                rejectUnauthorized: false // Railway uses self-signed certs
            }
        });

        pool.on('error', (err) => {
            logger.error('Erro no pool do PostgreSQL:', { error: err.message });
        });

        pool.on('connect', () => {
            logger.info('📦 Nova conexão PostgreSQL estabelecida');
        });
    }
    return pool;
}

// ═══════════════════════════════════════════════════════════════════════════
// 🔧 QUERY HELPERS
// ═══════════════════════════════════════════════════════════════════════════

export async function query<T extends QueryResultRow = QueryResultRow>(
    text: string, 
    params?: unknown[]
): Promise<QueryResult<T>> {
    const pool = getPool();
    const start = Date.now();
    
    try {
        const result = await pool.query<T>(text, params);
        const duration = Date.now() - start;
        
        if (duration > 1000) {
            logger.warn(`Query lenta (${duration}ms): ${text.substring(0, 50)}...`);
        }
        
        return result;
    } catch (error: any) {
        logger.error(`Erro na query: ${error.message}`);
        throw error;
    }
}

export async function getClient(): Promise<PoolClient> {
    const pool = getPool();
    return pool.connect();
}

interface TimeResult extends QueryResultRow {
    now: Date;
}

export async function testConnection(): Promise<boolean> {
    try {
        const result = await query<TimeResult>('SELECT NOW()');
        logger.info(`✅ Conexão PostgreSQL OK: ${result.rows[0]?.now}`);
        return true;
    } catch (error: any) {
        logger.error(`❌ Falha na conexão PostgreSQL: ${error.message}`);
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
    leave_channel_id VARCHAR(20),
    logs_channel_id VARCHAR(20),
    staff_role_id VARCHAR(20),
    ia_enabled BOOLEAN DEFAULT true,
    ia_channel_id VARCHAR(20),
    ia_system_prompt TEXT DEFAULT 'Você é a IA da CoreBot's. Personalidade Única.',
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
`;

export async function initializeSchema(): Promise<void> {
    try {
        await query(SCHEMA_SQL);
        logger.info('✅ Schema do banco inicializado com sucesso');
    } catch (error: any) {
        logger.error(`❌ Erro ao inicializar schema: ${error.message}`);
        throw error;
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// 📊 GUILD CONFIG OPERATIONS
// ═══════════════════════════════════════════════════════════════════════════

export async function getGuildConfig(guildId: string): Promise<GuildConfig | null> {
    const result = await query<GuildConfig>(
        'SELECT * FROM guild_configs WHERE guild_id = $1',
        [guildId]
    );
    return result.rows[0] || null;
}

export async function upsertGuildConfig(
    guildId: string, 
    updates: Partial<Omit<GuildConfig, 'guild_id' | 'updated_at'>>
): Promise<GuildConfig> {
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

    const result = await query<GuildConfig>(sql, [guildId, ...values]);
    return result.rows[0];
}

// ═══════════════════════════════════════════════════════════════════════════
// 📝 AUDIT LOG OPERATIONS
// ═══════════════════════════════════════════════════════════════════════════

export async function logAudit(
    guildId: string,
    userId: string,
    action: string,
    targetId?: string,
    details?: Record<string, unknown>
): Promise<AuditLog> {
    const result = await query<AuditLog>(
        `INSERT INTO audit_log (guild_id, user_id, action, target_id, details)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [guildId, userId, action, targetId || null, JSON.stringify(details || {})]
    );
    return result.rows[0];
}

export async function getAuditLogs(
    guildId: string,
    limit: number = 50,
    offset: number = 0
): Promise<AuditLog[]> {
    const result = await query<AuditLog>(
        `SELECT * FROM audit_log 
         WHERE guild_id = $1 
         ORDER BY created_at DESC 
         LIMIT $2 OFFSET $3`,
        [guildId, limit, offset]
    );
    return result.rows;
}

// ═══════════════════════════════════════════════════════════════════════════
// 📞 PRIVATE CALLS OPERATIONS
// ═══════════════════════════════════════════════════════════════════════════

export interface PrivateCall extends QueryResultRow {
    channel_id: string;
    guild_id: string;
    owner_id: string;
    is_open: boolean;
    member_limit: number | null;
    created_at: Date;
}

export async function createPrivateCall(
    channelId: string,
    guildId: string,
    ownerId: string,
    isOpen: boolean = true,
    memberLimit?: number
): Promise<PrivateCall> {
    const result = await query<PrivateCall>(
        `INSERT INTO private_calls (channel_id, guild_id, owner_id, is_open, member_limit)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (channel_id) DO UPDATE SET 
            owner_id = $3, is_open = $4, member_limit = $5
         RETURNING *`,
        [channelId, guildId, ownerId, isOpen, memberLimit || null]
    );
    return result.rows[0];
}

export async function getPrivateCall(channelId: string): Promise<PrivateCall | null> {
    const result = await query<PrivateCall>(
        'SELECT * FROM private_calls WHERE channel_id = $1',
        [channelId]
    );
    return result.rows[0] || null;
}

export async function getPrivateCallByOwner(guildId: string, ownerId: string): Promise<PrivateCall | null> {
    const result = await query<PrivateCall>(
        'SELECT * FROM private_calls WHERE guild_id = $1 AND owner_id = $2',
        [guildId, ownerId]
    );
    return result.rows[0] || null;
}

export async function updatePrivateCall(
    channelId: string, 
    updates: { is_open?: boolean; member_limit?: number | null; owner_id?: string }
): Promise<PrivateCall | null> {
    const fields = Object.keys(updates).filter(k => updates[k as keyof typeof updates] !== undefined);
    if (fields.length === 0) return null;
    
    const setClause = fields.map((f, i) => `${f} = $${i + 2}`).join(', ');
    const values = fields.map(f => updates[f as keyof typeof updates]);
    
    const result = await query<PrivateCall>(
        `UPDATE private_calls SET ${setClause} WHERE channel_id = $1 RETURNING *`,
        [channelId, ...values]
    );
    return result.rows[0] || null;
}

export async function deletePrivateCall(channelId: string): Promise<boolean> {
    const result = await query(
        'DELETE FROM private_calls WHERE channel_id = $1',
        [channelId]
    );
    return (result.rowCount ?? 0) > 0;
}

export async function getAllPrivateCalls(guildId: string): Promise<PrivateCall[]> {
    const result = await query<PrivateCall>(
        'SELECT * FROM private_calls WHERE guild_id = $1',
        [guildId]
    );
    return result.rows;
}

// ═══════════════════════════════════════════════════════════════════════════
// 🎫 TICKETS OPERATIONS
// ═══════════════════════════════════════════════════════════════════════════

export interface Ticket extends QueryResultRow {
    id: number;
    guild_id: string;
    channel_id: string | null;
    user_id: string;
    category: string | null;
    status: string;
    created_at: Date;
    closed_at: Date | null;
}

export async function createTicket(
    guildId: string,
    channelId: string,
    userId: string,
    category?: string
): Promise<Ticket> {
    const result = await query<Ticket>(
        `INSERT INTO tickets (guild_id, channel_id, user_id, category, status)
         VALUES ($1, $2, $3, $4, 'open')
         RETURNING *`,
        [guildId, channelId, userId, category || null]
    );
    return result.rows[0];
}

export async function getTicket(channelId: string): Promise<Ticket | null> {
    const result = await query<Ticket>(
        'SELECT * FROM tickets WHERE channel_id = $1',
        [channelId]
    );
    return result.rows[0] || null;
}

export async function getTicketsByUser(guildId: string, userId: string): Promise<Ticket[]> {
    const result = await query<Ticket>(
        `SELECT * FROM tickets WHERE guild_id = $1 AND user_id = $2 AND status = 'open'`,
        [guildId, userId]
    );
    return result.rows;
}

export async function closeTicket(channelId: string): Promise<Ticket | null> {
    const result = await query<Ticket>(
        `UPDATE tickets SET status = 'closed', closed_at = NOW() 
         WHERE channel_id = $1 RETURNING *`,
        [channelId]
    );
    return result.rows[0] || null;
}

export async function deleteTicket(channelId: string): Promise<boolean> {
    const result = await query(
        'DELETE FROM tickets WHERE channel_id = $1',
        [channelId]
    );
    return (result.rowCount ?? 0) > 0;
}

export async function getOpenTickets(guildId: string): Promise<Ticket[]> {
    const result = await query<Ticket>(
        `SELECT * FROM tickets WHERE guild_id = $1 AND status = 'open' ORDER BY created_at DESC`,
        [guildId]
    );
    return result.rows;
}

// ═══════════════════════════════════════════════════════════════════════════
// 🧹 CLEANUP
// ═══════════════════════════════════════════════════════════════════════════

export async function closePool(): Promise<void> {
    if (pool) {
        await pool.end();
        pool = null;
        logger.info('🔌 Pool PostgreSQL fechado');
    }
}

// Export default database object
export const database = {
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

export default database;
