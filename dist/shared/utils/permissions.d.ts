/**
 * 🔐 Permissions Utility - Funções centralizadas de verificação de permissões
 */
import { GuildMember } from 'discord.js';
/**
 * Verifica se o membro tem permissão de administrador
 */
export declare function hasAdminPermission(member: GuildMember | null, ownerRoleId?: string, semiOwnerRoleId?: string): boolean;
/**
 * Verifica se o membro tem permissão de staff/moderação
 */
export declare function hasStaffPermission(member: GuildMember | null, staffRoleId?: string, ownerRoleId?: string, semiOwnerRoleId?: string): boolean;
/**
 * Verifica se o membro tem permissão de moderação
 */
export declare function hasModerationPermission(member: GuildMember | null): boolean;
/**
 * Verifica se o membro pode usar comandos da IA (baseado em cargos configurados)
 */
export declare function hasIAAdminPermission(member: GuildMember | null, iaAdminRoles?: string[]): boolean;
//# sourceMappingURL=permissions.d.ts.map