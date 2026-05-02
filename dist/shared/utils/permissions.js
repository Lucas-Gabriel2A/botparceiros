"use strict";
/**
 * 🔐 Permissions Utility - Funções centralizadas de verificação de permissões
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.hasAdminPermission = hasAdminPermission;
exports.hasStaffPermission = hasStaffPermission;
exports.hasModerationPermission = hasModerationPermission;
exports.hasIAAdminPermission = hasIAAdminPermission;
const discord_js_1 = require("discord.js");
/**
 * Verifica se o membro tem permissão de administrador
 */
function hasAdminPermission(member, ownerRoleId, semiOwnerRoleId) {
    if (!member)
        return false;
    // Dono do servidor sempre tem permissão
    if (member.id === member.guild.ownerId)
        return true;
    // Permissão de Administrator
    if (member.permissions.has(discord_js_1.PermissionFlagsBits.Administrator))
        return true;
    // Cargos específicos
    if (ownerRoleId && member.roles.cache.has(ownerRoleId))
        return true;
    if (semiOwnerRoleId && member.roles.cache.has(semiOwnerRoleId))
        return true;
    return false;
}
/**
 * Verifica se o membro tem permissão de staff/moderação
 */
function hasStaffPermission(member, staffRoleId, ownerRoleId, semiOwnerRoleId) {
    if (!member)
        return false;
    // Admin já inclui staff
    if (hasAdminPermission(member, ownerRoleId, semiOwnerRoleId))
        return true;
    // Cargo de staff
    if (staffRoleId && member.roles.cache.has(staffRoleId))
        return true;
    // Permissão de gerenciar mensagens
    if (member.permissions.has(discord_js_1.PermissionFlagsBits.ManageMessages))
        return true;
    return false;
}
/**
 * Verifica se o membro tem permissão de moderação
 */
function hasModerationPermission(member) {
    if (!member)
        return false;
    if (member.id === member.guild.ownerId)
        return true;
    return member.permissions.has(discord_js_1.PermissionFlagsBits.ManageMessages) ||
        member.permissions.has(discord_js_1.PermissionFlagsBits.Administrator);
}
/**
 * Verifica se o membro pode usar comandos da IA (baseado em cargos configurados)
 */
function hasIAAdminPermission(member, iaAdminRoles) {
    if (!member)
        return false;
    // Dono do servidor
    if (member.id === member.guild.ownerId)
        return true;
    // Admin
    if (member.permissions.has(discord_js_1.PermissionFlagsBits.Administrator))
        return true;
    // Cargos configurados para IA
    if (iaAdminRoles && iaAdminRoles.length > 0) {
        return iaAdminRoles.some(roleId => member.roles.cache.has(roleId));
    }
    return false;
}
//# sourceMappingURL=permissions.js.map