/**
 * 📊 Analytics Service
 * 
 * Rastreia métricas diárias dos servidores para o dashboard de Analytics.
 * Tabela: guild_analytics (métricas agregadas por dia)
 */

import { query } from './database';
import { logger } from './logger.service';

// ═══════════════════════════════════════════════════════════════════════════
// 📊 TIPOS
// ═══════════════════════════════════════════════════════════════════════════

export interface GuildAnalytics {
    guild_id: string;
    date: string;
    messages_count: number;
    members_joined: number;
    members_left: number;
    tickets_opened: number;
    tickets_closed: number;
    automod_actions: number;
    commands_used: number;
    ai_responses: number;
    guild_joins: number;
    guild_leaves: number;
}

export type AnalyticsEvent =
    | 'message'
    | 'member_join'
    | 'member_leave'
    | 'ticket_open'
    | 'ticket_close'
    | 'automod_action'
    | 'command_used'
    | 'ai_response'
    | 'guild_join'
    | 'guild_leave';

// Mapa de evento → coluna no banco
const EVENT_COLUMN_MAP: Record<AnalyticsEvent, string> = {
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
export async function trackEvent(guildId: string, event: AnalyticsEvent, count: number = 1): Promise<void> {
    const column = EVENT_COLUMN_MAP[event];
    if (!column) return;

    try {
        await query(
            `INSERT INTO guild_analytics (guild_id, date, ${column})
             VALUES ($1, CURRENT_DATE, $2)
             ON CONFLICT (guild_id, date)
             DO UPDATE SET ${column} = guild_analytics.${column} + $2`,
            [guildId, count]
        );
    } catch (error) {
        logger.error('Erro ao rastrear analytics', { error, guildId, event });
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// 📊 CONSULTAS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Retorna analytics de um guild para um período.
 * @param period - Número de dias para trás (7, 14, 30, 90)
 */
export async function getAnalytics(guildId: string, period: number = 7): Promise<GuildAnalytics[]> {
    try {
        const result = await query<GuildAnalytics>(
            `SELECT * FROM guild_analytics 
             WHERE guild_id = $1 AND date >= CURRENT_DATE - $2::integer
             ORDER BY date ASC`,
            [guildId, period]
        );
        return result.rows;
    } catch (error) {
        logger.error('Erro ao buscar analytics', { error, guildId });
        return [];
    }
}

/**
 * Retorna totais agregados de um guild para um período.
 */
export async function getAnalyticsSummary(guildId: string, period: number = 7): Promise<Partial<GuildAnalytics> | null> {
    try {
        const result = await query<GuildAnalytics>(
            `SELECT 
                SUM(messages_count) as messages_count,
                SUM(members_joined) as members_joined,
                SUM(members_left) as members_left,
                SUM(tickets_opened) as tickets_opened,
                SUM(tickets_closed) as tickets_closed,
                SUM(automod_actions) as automod_actions,
                SUM(commands_used) as commands_used,
                SUM(ai_responses) as ai_responses
             FROM guild_analytics 
             WHERE guild_id = $1 AND date >= CURRENT_DATE - $2::integer`,
            [guildId, period]
        );
        return result.rows[0] || null;
    } catch (error) {
        logger.error('Erro ao buscar resumo de analytics', { error, guildId });
        return null;
    }
}
