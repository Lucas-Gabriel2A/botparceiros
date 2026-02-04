/**
 * ╔═══════════════════════════════════════════════════════════════════════════╗
 * ║                      NEXSTAR DATABASE SERVICE                             ║
 * ║                   PostgreSQL Connection + Queries                         ║
 * ╚═══════════════════════════════════════════════════════════════════════════╝
 */
import { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg';
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
export declare function getPool(): Pool;
export declare function query<T extends QueryResultRow = QueryResultRow>(text: string, params?: unknown[]): Promise<QueryResult<T>>;
export declare function getClient(): Promise<PoolClient>;
export declare function testConnection(): Promise<boolean>;
export declare function initializeSchema(): Promise<void>;
export declare function getGuildConfig(guildId: string): Promise<GuildConfig | null>;
export declare function upsertGuildConfig(guildId: string, updates: Partial<Omit<GuildConfig, 'guild_id' | 'updated_at'>>): Promise<GuildConfig>;
export declare function logAudit(guildId: string, userId: string, action: string, targetId?: string, details?: Record<string, unknown>): Promise<AuditLog>;
export declare function getAuditLogs(guildId: string, limit?: number, offset?: number): Promise<AuditLog[]>;
export interface PrivateCall extends QueryResultRow {
    channel_id: string;
    guild_id: string;
    owner_id: string;
    is_open: boolean;
    member_limit: number | null;
    created_at: Date;
}
export declare function createPrivateCall(channelId: string, guildId: string, ownerId: string, isOpen?: boolean, memberLimit?: number): Promise<PrivateCall>;
export declare function getPrivateCall(channelId: string): Promise<PrivateCall | null>;
export declare function getPrivateCallByOwner(guildId: string, ownerId: string): Promise<PrivateCall | null>;
export declare function updatePrivateCall(channelId: string, updates: {
    is_open?: boolean;
    member_limit?: number | null;
    owner_id?: string;
}): Promise<PrivateCall | null>;
export declare function deletePrivateCall(channelId: string): Promise<boolean>;
export declare function getAllPrivateCalls(guildId: string): Promise<PrivateCall[]>;
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
export declare function createTicket(guildId: string, channelId: string, userId: string, category?: string): Promise<Ticket>;
export declare function getTicket(channelId: string): Promise<Ticket | null>;
export declare function getTicketsByUser(guildId: string, userId: string): Promise<Ticket[]>;
export declare function closeTicket(channelId: string): Promise<Ticket | null>;
export declare function deleteTicket(channelId: string): Promise<boolean>;
export declare function getOpenTickets(guildId: string): Promise<Ticket[]>;
export declare function closePool(): Promise<void>;
export declare const database: {
    query: typeof query;
    getClient: typeof getClient;
    testConnection: typeof testConnection;
    initializeSchema: typeof initializeSchema;
    getGuildConfig: typeof getGuildConfig;
    upsertGuildConfig: typeof upsertGuildConfig;
    logAudit: typeof logAudit;
    getAuditLogs: typeof getAuditLogs;
    createPrivateCall: typeof createPrivateCall;
    getPrivateCall: typeof getPrivateCall;
    getPrivateCallByOwner: typeof getPrivateCallByOwner;
    updatePrivateCall: typeof updatePrivateCall;
    deletePrivateCall: typeof deletePrivateCall;
    getAllPrivateCalls: typeof getAllPrivateCalls;
    createTicket: typeof createTicket;
    getTicket: typeof getTicket;
    getTicketsByUser: typeof getTicketsByUser;
    closeTicket: typeof closeTicket;
    deleteTicket: typeof deleteTicket;
    getOpenTickets: typeof getOpenTickets;
    closePool: typeof closePool;
    getPool: typeof getPool;
};
export default database;
//# sourceMappingURL=database.d.ts.map