"use strict";
/**
 * 📦 Barrel file for shared services
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.redisService = exports.syncRedisLimitsToDatabase = exports.incrementServerGenUsage = exports.checkServerGenLimit = exports.getLimitMessage = exports.incrementAiUsage = exports.checkAiLimit = exports.canUseFeature = exports.getPlanUpgradeMessage = exports.getUserPlan = exports.closePool = exports.toggleCustomCommand = exports.deleteCustomCommand = exports.getCustomCommand = exports.getCustomCommands = exports.createCustomCommand = exports.claimTicket = exports.getTicketCategory = exports.deleteTicketCategory = exports.updateTicketCategory = exports.getTicketCategories = exports.createTicketCategory = exports.getOpenTickets = exports.deleteTicket = exports.closeTicket = exports.getTicketsByUser = exports.getTicket = exports.createTicket = exports.getAllPrivateCalls = exports.deletePrivateCall = exports.updatePrivateCall = exports.getPrivateCallByOwner = exports.getPrivateCall = exports.createPrivateCall = exports.getAuditLogs = exports.logAudit = exports.upsertGuildConfig = exports.getGuildConfig = exports.initializeSchema = exports.testConnection = exports.query = exports.getPool = exports.database = exports.ConfigService = exports.config = exports.Logger = exports.logger = exports.LLMService = exports.llmService = void 0;
var llm_service_1 = require("./llm.service");
Object.defineProperty(exports, "llmService", { enumerable: true, get: function () { return llm_service_1.llmService; } });
Object.defineProperty(exports, "LLMService", { enumerable: true, get: function () { return llm_service_1.LLMService; } });
var logger_service_1 = require("./logger.service");
Object.defineProperty(exports, "logger", { enumerable: true, get: function () { return logger_service_1.logger; } });
Object.defineProperty(exports, "Logger", { enumerable: true, get: function () { return logger_service_1.Logger; } });
var config_service_1 = require("./config.service");
Object.defineProperty(exports, "config", { enumerable: true, get: function () { return config_service_1.config; } });
Object.defineProperty(exports, "ConfigService", { enumerable: true, get: function () { return config_service_1.ConfigService; } });
// Utils exports
// Permissions removed to avoid importing discord.js in frontend
// Database exports
var database_1 = require("./database");
Object.defineProperty(exports, "database", { enumerable: true, get: function () { return database_1.database; } });
Object.defineProperty(exports, "getPool", { enumerable: true, get: function () { return database_1.getPool; } });
Object.defineProperty(exports, "query", { enumerable: true, get: function () { return database_1.query; } });
Object.defineProperty(exports, "testConnection", { enumerable: true, get: function () { return database_1.testConnection; } });
Object.defineProperty(exports, "initializeSchema", { enumerable: true, get: function () { return database_1.initializeSchema; } });
// Guild Config
Object.defineProperty(exports, "getGuildConfig", { enumerable: true, get: function () { return database_1.getGuildConfig; } });
Object.defineProperty(exports, "upsertGuildConfig", { enumerable: true, get: function () { return database_1.upsertGuildConfig; } });
// Audit Log
Object.defineProperty(exports, "logAudit", { enumerable: true, get: function () { return database_1.logAudit; } });
Object.defineProperty(exports, "getAuditLogs", { enumerable: true, get: function () { return database_1.getAuditLogs; } });
// Private Calls
Object.defineProperty(exports, "createPrivateCall", { enumerable: true, get: function () { return database_1.createPrivateCall; } });
Object.defineProperty(exports, "getPrivateCall", { enumerable: true, get: function () { return database_1.getPrivateCall; } });
Object.defineProperty(exports, "getPrivateCallByOwner", { enumerable: true, get: function () { return database_1.getPrivateCallByOwner; } });
Object.defineProperty(exports, "updatePrivateCall", { enumerable: true, get: function () { return database_1.updatePrivateCall; } });
Object.defineProperty(exports, "deletePrivateCall", { enumerable: true, get: function () { return database_1.deletePrivateCall; } });
Object.defineProperty(exports, "getAllPrivateCalls", { enumerable: true, get: function () { return database_1.getAllPrivateCalls; } });
// Tickets
Object.defineProperty(exports, "createTicket", { enumerable: true, get: function () { return database_1.createTicket; } });
Object.defineProperty(exports, "getTicket", { enumerable: true, get: function () { return database_1.getTicket; } });
Object.defineProperty(exports, "getTicketsByUser", { enumerable: true, get: function () { return database_1.getTicketsByUser; } });
Object.defineProperty(exports, "closeTicket", { enumerable: true, get: function () { return database_1.closeTicket; } });
Object.defineProperty(exports, "deleteTicket", { enumerable: true, get: function () { return database_1.deleteTicket; } });
Object.defineProperty(exports, "getOpenTickets", { enumerable: true, get: function () { return database_1.getOpenTickets; } });
// Ticket Categories
Object.defineProperty(exports, "createTicketCategory", { enumerable: true, get: function () { return database_1.createTicketCategory; } });
Object.defineProperty(exports, "getTicketCategories", { enumerable: true, get: function () { return database_1.getTicketCategories; } });
Object.defineProperty(exports, "updateTicketCategory", { enumerable: true, get: function () { return database_1.updateTicketCategory; } });
Object.defineProperty(exports, "deleteTicketCategory", { enumerable: true, get: function () { return database_1.deleteTicketCategory; } });
Object.defineProperty(exports, "getTicketCategory", { enumerable: true, get: function () { return database_1.getTicketCategory; } });
Object.defineProperty(exports, "claimTicket", { enumerable: true, get: function () { return database_1.claimTicket; } });
// Custom Commands
Object.defineProperty(exports, "createCustomCommand", { enumerable: true, get: function () { return database_1.createCustomCommand; } });
Object.defineProperty(exports, "getCustomCommands", { enumerable: true, get: function () { return database_1.getCustomCommands; } });
Object.defineProperty(exports, "getCustomCommand", { enumerable: true, get: function () { return database_1.getCustomCommand; } });
Object.defineProperty(exports, "deleteCustomCommand", { enumerable: true, get: function () { return database_1.deleteCustomCommand; } });
Object.defineProperty(exports, "toggleCustomCommand", { enumerable: true, get: function () { return database_1.toggleCustomCommand; } });
// Cleanup
Object.defineProperty(exports, "closePool", { enumerable: true, get: function () { return database_1.closePool; } });
var plan_features_1 = require("./plan-features");
Object.defineProperty(exports, "getUserPlan", { enumerable: true, get: function () { return plan_features_1.getUserPlan; } });
Object.defineProperty(exports, "getPlanUpgradeMessage", { enumerable: true, get: function () { return plan_features_1.getPlanUpgradeMessage; } });
Object.defineProperty(exports, "canUseFeature", { enumerable: true, get: function () { return plan_features_1.canUseFeature; } });
var ai_limit_service_1 = require("./ai-limit.service");
Object.defineProperty(exports, "checkAiLimit", { enumerable: true, get: function () { return ai_limit_service_1.checkAiLimit; } });
Object.defineProperty(exports, "incrementAiUsage", { enumerable: true, get: function () { return ai_limit_service_1.incrementAiUsage; } });
Object.defineProperty(exports, "getLimitMessage", { enumerable: true, get: function () { return ai_limit_service_1.getLimitMessage; } });
Object.defineProperty(exports, "checkServerGenLimit", { enumerable: true, get: function () { return ai_limit_service_1.checkServerGenLimit; } });
Object.defineProperty(exports, "incrementServerGenUsage", { enumerable: true, get: function () { return ai_limit_service_1.incrementServerGenUsage; } });
Object.defineProperty(exports, "syncRedisLimitsToDatabase", { enumerable: true, get: function () { return ai_limit_service_1.syncRedisLimitsToDatabase; } });
var redis_service_1 = require("./redis.service");
Object.defineProperty(exports, "redisService", { enumerable: true, get: function () { return redis_service_1.redisService; } });
//# sourceMappingURL=index.js.map