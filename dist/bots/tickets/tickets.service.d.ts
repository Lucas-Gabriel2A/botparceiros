import { TextChannel, GuildMember, Guild } from 'discord.js';
export declare const THEME: {
    readonly colors: {
        readonly primary: 5793266;
        readonly success: 3066993;
        readonly danger: 15158332;
        readonly warning: 15844367;
        readonly info: 3447003;
    };
    readonly emojis: {
        readonly ticket: "🎫";
        readonly close: "🔒";
        readonly claim: "🙋‍♂️";
        readonly star: "✨";
        readonly warning: "⚠️";
        readonly log: "📜";
        readonly user: "👤";
        readonly success: "✅";
        readonly error: "❌";
        readonly edit: "✏️";
        readonly delete: "🗑️";
    };
};
/**
 * Envia o painel de tickets para o canal especificado.
 * Baseado nas configurações de `TicketConfigForm.tsx` e `TicketDashboardClient.tsx`
 */
export declare function sendTicketPanel(channel: TextChannel, guildId: string): Promise<void>;
/**
 * Cria o canal de ticket baseado na categoria selecionada.
 * Baseado na estrutura de `TicketForm.tsx` (TicketCategory)
 */
export declare function createTicketChannel(guild: Guild, member: GuildMember, categoryId: string): Promise<TextChannel | string>;
/**
 * Lida com o botão de assumir ticket.
 */
export declare function handleTicketClaim(interaction: any): Promise<void>;
/**
 * Gera o transcript e fecha o ticket.
 */
export declare function closeTicketProcess(channel: TextChannel, guild: Guild, closedBy: GuildMember, categoryName: string): Promise<void>;
//# sourceMappingURL=tickets.service.d.ts.map