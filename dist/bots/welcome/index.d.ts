/**
 * ╔═══════════════════════════════════════════════════════════════════════════╗
 * ║                         BOT WELCOME - NEXSTAR                             ║
 * ║                     Sistema de Boas-vindas Premium                        ║
 * ╚═══════════════════════════════════════════════════════════════════════════╝
 *
 * Funcionalidades:
 * - Banners personalizados com canvas
 * - Avatares hexagonais com efeito neon
 * - Backgrounds customizáveis
 * - Mensagens de entrada/saída
 * - Slash commands para configuração
 */
import { GuildMember } from 'discord.js';
declare function generateBanner(member: GuildMember, text: string, _isWelcome?: boolean): Promise<Buffer>;
declare function generateBannerFast(member: GuildMember, text: string, _isWelcome?: boolean): Promise<Buffer>;
export { generateBanner, generateBannerFast };
//# sourceMappingURL=index.d.ts.map