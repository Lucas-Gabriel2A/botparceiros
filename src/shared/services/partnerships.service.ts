/**
 * 🤝 Partnerships Service
 * 
 * Gerencia parcerias entre servidores Discord.
 */

import { query } from './database';
import { logger } from './logger.service';

// ═══════════════════════════════════════════════════════════════════════════
// 📊 TIPOS
// ═══════════════════════════════════════════════════════════════════════════

export interface Partnership {
    id: number;
    guild_id: string;
    partner_guild_id: string;
    partner_guild_name: string;
    partner_invite: string | null;
    partner_description: string | null;
    channel_id: string | null;
    status: 'active' | 'inactive';
    created_by: string | null;
    created_at: Date;
}

// ═══════════════════════════════════════════════════════════════════════════
// 🔧 OPERAÇÕES
// ═══════════════════════════════════════════════════════════════════════════

export async function createPartnership(
    guildId: string,
    partnerGuildId: string,
    partnerGuildName: string,
    createdBy: string,
    options: { invite?: string; description?: string; channelId?: string } = {}
): Promise<Partnership> {
    try {
        const result = await query<Partnership>(
            `INSERT INTO partnerships (guild_id, partner_guild_id, partner_guild_name, partner_invite, partner_description, channel_id, created_by)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             ON CONFLICT (guild_id, partner_guild_id) 
             DO UPDATE SET partner_guild_name = $3, partner_invite = $4, partner_description = $5, channel_id = $6, status = 'active'
             RETURNING *`,
            [guildId, partnerGuildId, partnerGuildName, options.invite || null, options.description || null, options.channelId || null, createdBy]
        );
        return result.rows[0];
    } catch (error) {
        logger.error('Erro ao criar parceria', { error, guildId, partnerGuildId });
        throw error;
    }
}

export async function listPartnerships(guildId: string): Promise<Partnership[]> {
    try {
        const result = await query<Partnership>(
            `SELECT * FROM partnerships WHERE guild_id = $1 AND status = 'active' ORDER BY created_at DESC`,
            [guildId]
        );
        return result.rows;
    } catch (error) {
        logger.error('Erro ao listar parcerias', { error, guildId });
        return [];
    }
}

export async function removePartnership(guildId: string, partnerGuildId: string): Promise<boolean> {
    try {
        const result = await query(
            `UPDATE partnerships SET status = 'inactive' WHERE guild_id = $1 AND partner_guild_id = $2`,
            [guildId, partnerGuildId]
        );
        return (result.rowCount ?? 0) > 0;
    } catch (error) {
        logger.error('Erro ao remover parceria', { error, guildId, partnerGuildId });
        return false;
    }
}

export async function getPartnership(guildId: string, partnerGuildId: string): Promise<Partnership | null> {
    try {
        const result = await query<Partnership>(
            `SELECT * FROM partnerships WHERE guild_id = $1 AND partner_guild_id = $2`,
            [guildId, partnerGuildId]
        );
        return result.rows[0] || null;
    } catch (error) {
        logger.error('Erro ao buscar parceria', { error });
        return null;
    }
}
