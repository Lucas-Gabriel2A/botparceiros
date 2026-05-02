/**
 * 📊 Analytics Service
 *
 * Rastreia métricas diárias dos servidores para o dashboard de Analytics.
 * Tabela: guild_analytics (métricas agregadas por dia)
 */
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
export type AnalyticsEvent = 'message' | 'member_join' | 'member_leave' | 'ticket_open' | 'ticket_close' | 'automod_action' | 'command_used' | 'ai_response' | 'guild_join' | 'guild_leave';
/**
 * Incrementa um contador de analytics para um guild.
 * Usa UPSERT para criar/atualizar a row do dia.
 */
export declare function trackEvent(guildId: string, event: AnalyticsEvent, count?: number): Promise<void>;
/**
 * Retorna analytics de um guild para um período.
 * @param period - Número de dias para trás (7, 14, 30, 90)
 */
export declare function getAnalytics(guildId: string, period?: number): Promise<GuildAnalytics[]>;
/**
 * Retorna totais agregados de um guild para um período.
 */
export declare function getAnalyticsSummary(guildId: string, period?: number): Promise<Partial<GuildAnalytics> | null>;
//# sourceMappingURL=analytics.service.d.ts.map