/**
 * 🔐 Permissions Utility - Funções centralizadas de verificação de permissões
 */

import { GuildMember, PermissionFlagsBits } from 'discord.js';

/**
 * Verifica se o membro tem permissão de administrador
 */
export function hasAdminPermission(
    member: GuildMember | null, 
    ownerRoleId?: string, 
    semiOwnerRoleId?: string
): boolean {
    if (!member) return false;
    
    // Dono do servidor sempre tem permissão
    if (member.id === member.guild.ownerId) return true;
    
    // Permissão de Administrator
    if (member.permissions.has(PermissionFlagsBits.Administrator)) return true;
    
    // Cargos específicos
    if (ownerRoleId && member.roles.cache.has(ownerRoleId)) return true;
    if (semiOwnerRoleId && member.roles.cache.has(semiOwnerRoleId)) return true;
    
    return false;
}

/**
 * Verifica se o membro tem permissão de staff/moderação
 */
export function hasStaffPermission(
    member: GuildMember | null, 
    staffRoleId?: string,
    ownerRoleId?: string,
    semiOwnerRoleId?: string
): boolean {
    if (!member) return false;
    
    // Admin já inclui staff
    if (hasAdminPermission(member, ownerRoleId, semiOwnerRoleId)) return true;
    
    // Cargo de staff
    if (staffRoleId && member.roles.cache.has(staffRoleId)) return true;
    
    // Permissão de gerenciar mensagens
    if (member.permissions.has(PermissionFlagsBits.ManageMessages)) return true;
    
    return false;
}

/**
 * Verifica se o membro tem permissão de moderação
 */
export function hasModerationPermission(member: GuildMember | null): boolean {
    if (!member) return false;
    if (member.id === member.guild.ownerId) return true;
    return member.permissions.has(PermissionFlagsBits.ManageMessages) ||
           member.permissions.has(PermissionFlagsBits.Administrator);
}

/**
 * Verifica se o membro pode usar comandos da IA (baseado em cargos configurados)
 */
export function hasIAAdminPermission(
    member: GuildMember | null,
    iaAdminRoles?: string[]
): boolean {
    if (!member) return false;
    
    // Dono do servidor
    if (member.id === member.guild.ownerId) return true;
    
    // Admin
    if (member.permissions.has(PermissionFlagsBits.Administrator)) return true;
    
    // Cargos configurados para IA
    if (iaAdminRoles && iaAdminRoles.length > 0) {
        return iaAdminRoles.some(roleId => member.roles.cache.has(roleId));
    }
    
    return false;
}
