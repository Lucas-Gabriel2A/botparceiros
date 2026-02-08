/**
 * 📦 Barrel file for shared services
 */

export { llmService, LLMService } from './llm.service';
export { logger, Logger } from './logger.service';
export { config, ConfigService } from './config.service';
// Utils exports
// Permissions removed to avoid importing discord.js in frontend

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
    // Ticket Categories
    createTicketCategory,
    getTicketCategories,
    updateTicketCategory,
    deleteTicketCategory,
    getTicketCategory,
    claimTicket,
    // Custom Commands
    createCustomCommand,
    getCustomCommands,
    getCustomCommand,
    deleteCustomCommand,
    toggleCustomCommand,
    // Cleanup
    closePool
} from './database';

export type { GuildConfig, AuditLog, PrivateCall, Ticket, TicketCategory, CustomCommand } from './database';

