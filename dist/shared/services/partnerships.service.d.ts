/**
 * 🤝 Partnerships Service
 *
 * Gerencia parcerias entre servidores Discord.
 */
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
export declare function createPartnership(guildId: string, partnerGuildId: string, partnerGuildName: string, createdBy: string, options?: {
    invite?: string;
    description?: string;
    channelId?: string;
}): Promise<Partnership>;
export declare function listPartnerships(guildId: string): Promise<Partnership[]>;
export declare function removePartnership(guildId: string, partnerGuildId: string): Promise<boolean>;
export declare function getPartnership(guildId: string, partnerGuildId: string): Promise<Partnership | null>;
//# sourceMappingURL=partnerships.service.d.ts.map