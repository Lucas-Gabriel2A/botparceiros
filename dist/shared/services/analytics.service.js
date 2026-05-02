"use strict";
/**
 * 📊 Analytics Service
 *
 * Rastreia métricas diárias dos servidores para o dashboard de Analytics.
 * Tabela: guild_analytics (métricas agregadas por dia)
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.trackEvent = trackEvent;
exports.getAnalytics = getAnalytics;
exports.getAnalyticsSummary = getAnalyticsSummary;
const database_1 = require("./database");
const logger_service_1 = require("./logger.service");
// Mapa de evento → coluna no banco
const EVENT_COLUMN_MAP = {
    'message': 'messages_count',
    'member_join': 'members_joined',
    'member_leave': 'members_left',
    'ticket_open': 'tickets_opened',
    'ticket_close': 'tickets_closed',
    'automod_action': 'automod_actions',
    'command_used': 'commands_used',
    'ai_response': 'ai_responses',
    'guild_join': 'guild_joins',
    'guild_leave': 'guild_leaves'
};
// ═══════════════════════════════════════════════════════════════════════════
// 📈 TRACKING
// ═══════════════════════════════════════════════════════════════════════════
/**
 * Incrementa um contador de analytics para um guild.
 * Usa UPSERT para criar/atualizar a row do dia.
 */
async function trackEvent(guildId, event, count = 1) {
    const column = EVENT_COLUMN_MAP[event];
    if (!column)
        return;
    try {
        await (0, database_1.query)(`INSERT INTO guild_analytics (guild_id, date, ${column})
             VALUES ($1, CURRENT_DATE, $2)
             ON CONFLICT (guild_id, date)
             DO UPDATE SET ${column} = guild_analytics.${column} + $2`, [guildId, count]);
    }
    catch (error) {
        logger_service_1.logger.error('Erro ao rastrear analytics', { error, guildId, event });
    }
}
// ═══════════════════════════════════════════════════════════════════════════
// 📊 CONSULTAS
// ═══════════════════════════════════════════════════════════════════════════
/**
 * Retorna analytics de um guild para um período.
 * @param period - Número de dias para trás (7, 14, 30, 90)
 */
async function getAnalytics(guildId, period = 7) {
    try {
        const result = await (0, database_1.query)(`SELECT * FROM guild_analytics 
             WHERE guild_id = $1 AND date >= CURRENT_DATE - $2::integer
             ORDER BY date ASC`, [guildId, period]);
        return result.rows;
    }
    catch (error) {
        logger_service_1.logger.error('Erro ao buscar analytics', { error, guildId });
        return [];
    }
}
/**
 * Retorna totais agregados de um guild para um período.
 */
async function getAnalyticsSummary(guildId, period = 7) {
    try {
        const result = await (0, database_1.query)(`SELECT 
                SUM(messages_count) as messages_count,
                SUM(members_joined) as members_joined,
                SUM(members_left) as members_left,
                SUM(tickets_opened) as tickets_opened,
                SUM(tickets_closed) as tickets_closed,
                SUM(automod_actions) as automod_actions,
                SUM(commands_used) as commands_used,
                SUM(ai_responses) as ai_responses
             FROM guild_analytics 
             WHERE guild_id = $1 AND date >= CURRENT_DATE - $2::integer`, [guildId, period]);
        return result.rows[0] || null;
    }
    catch (error) {
        logger_service_1.logger.error('Erro ao buscar resumo de analytics', { error, guildId });
        return null;
    }
}
//# sourceMappingURL=analytics.service.js.map