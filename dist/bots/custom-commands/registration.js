"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.refreshGuildCommands = refreshGuildCommands;
const rest_1 = require("@discordjs/rest");
const v10_1 = require("discord-api-types/v10");
const builders_1 = require("@discordjs/builders");
const services_1 = require("../../shared/services");
const service_1 = require("./service");
// Use config.get or env directly if config is not available in web context
const TOKEN = process.env.DISCORD_TOKEN || services_1.config.getOptional('DISCORD_TOKEN') || process.env.DISCORD_TOKEN_AGENTE_IA || services_1.config.get('DISCORD_TOKEN_AGENTE_IA');
const CLIENT_ID = process.env.DISCORD_CLIENT_ID || services_1.config.get('DISCORD_CLIENT_ID');
async function refreshGuildCommands(guildId) {
    try {
        const customCommands = await service_1.customCommandService.getAll(guildId);
        const discordCommands = customCommands
            .filter(cmd => cmd.enabled)
            .map(cmd => {
            const builder = new builders_1.SlashCommandBuilder()
                .setName(cmd.name)
                .setDescription(cmd.description);
            if (cmd.options && Array.isArray(cmd.options)) {
                cmd.options.forEach((opt) => {
                    const required = opt.required || false;
                    switch (opt.type) {
                        case 'STRING':
                            builder.addStringOption(o => o.setName(opt.name).setDescription(opt.description).setRequired(required));
                            break;
                        case 'USER':
                            builder.addUserOption(o => o.setName(opt.name).setDescription(opt.description).setRequired(required));
                            break;
                        case 'CHANNEL':
                            builder.addChannelOption(o => o.setName(opt.name).setDescription(opt.description).setRequired(required));
                            break;
                        case 'ROLE':
                            builder.addRoleOption(o => o.setName(opt.name).setDescription(opt.description).setRequired(required));
                            break;
                        case 'INTEGER':
                            builder.addIntegerOption(o => o.setName(opt.name).setDescription(opt.description).setRequired(required));
                            break;
                        case 'BOOLEAN':
                            builder.addBooleanOption(o => o.setName(opt.name).setDescription(opt.description).setRequired(required));
                            break;
                        case 'NUMBER':
                            builder.addNumberOption(o => o.setName(opt.name).setDescription(opt.description).setRequired(required));
                            break;
                        case 'ATTACHMENT':
                            builder.addAttachmentOption(o => o.setName(opt.name).setDescription(opt.description).setRequired(required));
                            break;
                    }
                });
            }
            return builder.toJSON();
        });
        // Always put, even if empty, to clear commands if all were deleted/disabled
        const rest = new rest_1.REST({ version: '10' }).setToken(TOKEN);
        services_1.logger.info(`🔄 Atualizando ${discordCommands.length} comandos personalizados para Guild ${guildId}...`);
        await rest.put(v10_1.Routes.applicationGuildCommands(CLIENT_ID, guildId), { body: discordCommands });
        services_1.logger.info(`✅ Comandos personalizados atualizados para Guild ${guildId}`);
    }
    catch (error) {
        services_1.logger.error(`❌ Erro ao atualizar comandos da guild ${guildId}:`, { error });
        throw error;
    }
}
//# sourceMappingURL=registration.js.map