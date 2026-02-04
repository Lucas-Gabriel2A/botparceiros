"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.serverBuilder = exports.ServerBuilderService = void 0;
const discord_js_1 = require("discord.js");
const llm_service_1 = require("./llm.service");
const index_1 = require("./index");
const SERVER_BUILDER_PROMPT = `
Você é um Arquiteto de Servidores Discord Especialista.
Seu objetivo é gerar uma estrutura completa de servidor (Cargos, Categorias e Canais) baseada no TEMA fornecido pelo usuário.

REGRAS RÍGIDAS:
1. Responda APENAS com um JSON válido seguindo exatamente o schema abaixo.
2. Seja criativo nos nomes e cores.
3. Use emojis nos nomes de canais e categorias.
4. "permissions" para cargos devem ser strings compatíveis com Discord Permissions (ex: Administrator, KickMembers, ManageMessages, SendMessages, ViewChannel).
5. "color" deve ser Hex Code (ex: #FF0000).

SCHEMA:
{
  "roles": [
    { "name": "Nome do Cargo", "color": "#Hex", "permissions": ["SendMessages"] }
  ],
  "categories": [
    {
      "name": "Nome da Categoria",
      "channels": [
        { 
          "name": "nome-do-canal", 
          "type": "text" (ou "voice"), 
          "description": "Descrição do canal",
          "is_private": false,
          "allowed_roles": ["Nome do Cargo"] 
        }
      ]
    }
  ]
}
`;
class ServerBuilderService {
    /**
     * Passo 1: Gerar o plano JSON com a IA
     */
    async generateServerPlan(theme) {
        index_1.logger.info(`🏗️ Gerando plano de servidor para tema: ${theme}`);
        return await llm_service_1.llmService.generateJson(SERVER_BUILDER_PROMPT, `TEMA DO SERVIDOR: ${theme}`);
    }
    /**
     * Passo 2: Aplicar o plano no servidor
     */
    async buildServer(guild, schema, progressCallback) {
        const notify = (msg) => {
            index_1.logger.info(`[ServerBuilder] ${guild.id}: ${msg}`);
            if (progressCallback)
                progressCallback(msg);
        };
        notify(`🚀 Iniciando construção: ${schema.roles.length} cargos, ${schema.categories.length} categorias.`);
        // 1. Criar Cargos
        const roleMap = new Map(); // Name -> Rule Object
        for (const roleDef of schema.roles) {
            try {
                // Tenta achar permissions válidas
                const permissions = roleDef.permissions.map(p => {
                    const perm = discord_js_1.PermissionFlagsBits[p];
                    return perm || discord_js_1.PermissionFlagsBits.SendMessages;
                });
                const role = await guild.roles.create({
                    name: roleDef.name,
                    color: roleDef.color,
                    permissions: permissions, // Use calculated permissions
                    reason: 'Server Builder AI'
                });
                // Set permissions separately to be safe or use above
                // Note: For simplicity using basic setup. Advanced perms logic can be added.
                // Re-setting specific permissions bitfield if needed, but create accepts it.
                roleMap.set(roleDef.name, role);
                notify(`✅ Cargo criado: ${role.name}`);
            }
            catch (error) {
                index_1.logger.error(`Erro ao criar cargo ${roleDef.name}:`, { error: error });
            }
        }
        // 2. Criar Estrutura
        for (const catDef of schema.categories) {
            try {
                const category = await guild.channels.create({
                    name: catDef.name,
                    type: discord_js_1.ChannelType.GuildCategory,
                    reason: 'Server Builder AI'
                });
                for (const chanDef of catDef.channels) {
                    try {
                        const permissionOverwrites = [];
                        // Deny content for @everyone if private
                        if (chanDef.is_private) {
                            permissionOverwrites.push({
                                id: guild.id,
                                deny: [discord_js_1.PermissionFlagsBits.ViewChannel],
                            });
                        }
                        // Add role specific overwrites
                        if (chanDef.allowed_roles) {
                            for (const roleName of chanDef.allowed_roles) {
                                const role = roleMap.get(roleName);
                                if (role) {
                                    permissionOverwrites.push({
                                        id: role.id,
                                        allow: [discord_js_1.PermissionFlagsBits.ViewChannel, discord_js_1.PermissionFlagsBits.SendMessages],
                                    });
                                }
                            }
                        }
                        await guild.channels.create({
                            name: chanDef.name,
                            type: chanDef.type === 'voice' ? discord_js_1.ChannelType.GuildVoice : discord_js_1.ChannelType.GuildText,
                            parent: category.id,
                            topic: chanDef.description,
                            permissionOverwrites,
                            reason: 'Server Builder AI'
                        });
                    }
                    catch (err) {
                        index_1.logger.error(`Erro ao criar canal ${chanDef.name}`, { error: err });
                    }
                }
                notify(`📂 Categoria criada: ${catDef.name}`);
            }
            catch (error) {
                index_1.logger.error(`Erro ao criar categoria ${catDef.name}`, { error: error });
            }
        }
        notify('✨ Construção concluída com sucesso!');
    }
}
exports.ServerBuilderService = ServerBuilderService;
exports.serverBuilder = new ServerBuilderService();
//# sourceMappingURL=server-builder.service.js.map