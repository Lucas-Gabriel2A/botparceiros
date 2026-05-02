/**
 * 📦 Barrel file for shared services
 */
export { llmService, LLMService } from './llm.service';
export { logger, Logger } from './logger.service';
export { config, ConfigService } from './config.service';
export { database, getPool, query, testConnection, initializeSchema, getGuildConfig, upsertGuildConfig, logAudit, getAuditLogs, createPrivateCall, getPrivateCall, getPrivateCallByOwner, updatePrivateCall, deletePrivateCall, getAllPrivateCalls, createTicket, getTicket, getTicketsByUser, closeTicket, deleteTicket, getOpenTickets, createTicketCategory, getTicketCategories, updateTicketCategory, deleteTicketCategory, getTicketCategory, claimTicket, createCustomCommand, getCustomCommands, getCustomCommand, deleteCustomCommand, toggleCustomCommand, closePool } from './database';
export type { GuildConfig, AuditLog, PrivateCall, Ticket, TicketCategory, CustomCommand } from './database';
export { getUserPlan, getPlanUpgradeMessage, canUseFeature } from './plan-features';
export { checkAiLimit, incrementAiUsage, getLimitMessage, checkServerGenLimit, incrementServerGenUsage, syncRedisLimitsToDatabase } from './ai-limit.service';
export { redisService } from './redis.service';
//# sourceMappingURL=index.d.ts.map