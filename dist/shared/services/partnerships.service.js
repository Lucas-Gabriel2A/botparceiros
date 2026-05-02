"use strict";
/**
 * 🤝 Partnerships Service
 *
 * Gerencia parcerias entre servidores Discord.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createPartnership = createPartnership;
exports.listPartnerships = listPartnerships;
exports.removePartnership = removePartnership;
exports.getPartnership = getPartnership;
const database_1 = require("./database");
const logger_service_1 = require("./logger.service");
// ═══════════════════════════════════════════════════════════════════════════
// 🔧 OPERAÇÕES
// ═══════════════════════════════════════════════════════════════════════════
async function createPartnership(guildId, partnerGuildId, partnerGuildName, createdBy, options = {}) {
    try {
        const result = await (0, database_1.query)(`INSERT INTO partnerships (guild_id, partner_guild_id, partner_guild_name, partner_invite, partner_description, channel_id, created_by)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             ON CONFLICT (guild_id, partner_guild_id) 
             DO UPDATE SET partner_guild_name = $3, partner_invite = $4, partner_description = $5, channel_id = $6, status = 'active'
             RETURNING *`, [guildId, partnerGuildId, partnerGuildName, options.invite || null, options.description || null, options.channelId || null, createdBy]);
        return result.rows[0];
    }
    catch (error) {
        logger_service_1.logger.error('Erro ao criar parceria', { error, guildId, partnerGuildId });
        throw error;
    }
}
async function listPartnerships(guildId) {
    try {
        const result = await (0, database_1.query)(`SELECT * FROM partnerships WHERE guild_id = $1 AND status = 'active' ORDER BY created_at DESC`, [guildId]);
        return result.rows;
    }
    catch (error) {
        logger_service_1.logger.error('Erro ao listar parcerias', { error, guildId });
        return [];
    }
}
async function removePartnership(guildId, partnerGuildId) {
    try {
        const result = await (0, database_1.query)(`UPDATE partnerships SET status = 'inactive' WHERE guild_id = $1 AND partner_guild_id = $2`, [guildId, partnerGuildId]);
        return (result.rowCount ?? 0) > 0;
    }
    catch (error) {
        logger_service_1.logger.error('Erro ao remover parceria', { error, guildId, partnerGuildId });
        return false;
    }
}
async function getPartnership(guildId, partnerGuildId) {
    try {
        const result = await (0, database_1.query)(`SELECT * FROM partnerships WHERE guild_id = $1 AND partner_guild_id = $2`, [guildId, partnerGuildId]);
        return result.rows[0] || null;
    }
    catch (error) {
        logger_service_1.logger.error('Erro ao buscar parceria', { error });
        return null;
    }
}
//# sourceMappingURL=partnerships.service.js.map