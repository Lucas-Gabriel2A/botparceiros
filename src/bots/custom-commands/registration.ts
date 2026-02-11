import { REST } from '@discordjs/rest';
import { Routes } from 'discord-api-types/v10';
import { SlashCommandBuilder } from '@discordjs/builders';
import { config, logger } from '../../shared/services';
import { customCommandService } from './service';

// Use config.get or env directly if config is not available in web context
const TOKEN = process.env.DISCORD_TOKEN || config.getOptional('DISCORD_TOKEN') || process.env.DISCORD_TOKEN_AGENTE_IA || config.get('DISCORD_TOKEN_AGENTE_IA');
const CLIENT_ID = process.env.DISCORD_CLIENT_ID || config.get('DISCORD_CLIENT_ID');

export async function refreshGuildCommands(guildId: string) {
    try {
        const customCommands = await customCommandService.getAll(guildId);

        const discordCommands = customCommands
            .filter(cmd => cmd.enabled)
            .map(cmd => {
                const builder = new SlashCommandBuilder()
                    .setName(cmd.name)
                    .setDescription(cmd.description);

                if (cmd.options && Array.isArray(cmd.options)) {
                    cmd.options.forEach((opt: any) => {
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
        const rest = new REST({ version: '10' }).setToken(TOKEN);

        logger.info(`🔄 Atualizando ${discordCommands.length} comandos personalizados para Guild ${guildId}...`);

        await rest.put(
            Routes.applicationGuildCommands(CLIENT_ID, guildId),
            { body: discordCommands }
        );

        logger.info(`✅ Comandos personalizados atualizados para Guild ${guildId}`);
    } catch (error) {
        logger.error(`❌ Erro ao atualizar comandos da guild ${guildId}:`, { error });
        throw error;
    }
}
