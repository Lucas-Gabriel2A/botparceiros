/**
 * 📦 Barrel file for shared services
 */

export { llmService, LLMService } from './llm.service';
export { logger, Logger } from './logger.service';
export { config, ConfigService } from './config.service';
export { serverBuilder, ServerBuilderService } from './server-builder.service';

// Utils exports
export { 
    hasAdminPermission, 
    hasStaffPermission, 
    hasModerationPermission,
    hasIAAdminPermission 
} from '../utils/permissions';

// Database exports
export { 
    database, 
    getPool, 
    query, 
    testConnection, 
    initializeSchema, 
    // Guild Config
    getGuildConfig, 
    upsertGuildConfig, 
    // Audit Log
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
    closePool 
} from './database';

export type { GuildConfig, AuditLog, PrivateCall, Ticket } from './database';

