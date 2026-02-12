import { ChatInputCommandInteraction, TextChannel, GuildMember, ApplicationCommandOptionType, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { logger } from '../../shared/services';
import { gifService } from '../../shared/services/gif.service';

interface Action {
    type: 'REPLY' | 'ADD_ROLE' | 'REMOVE_ROLE' | 'SEND_DM' | 'SEND_CHANNEL' | 'KICK' | 'BAN' | 'RANDOM_IMAGE' | 'SET_NICKNAME';
    [key: string]: any;
}

export class CommandEngine {
    async execute(interaction: ChatInputCommandInteraction, actions: Action[]) {
        try {
            // Extract params
            const params: Record<string, any> = {};
            if (interaction.options && interaction.options.data) {
                for (const opt of interaction.options.data) {
                    if (opt.value !== undefined) {
                        if (opt.type === ApplicationCommandOptionType.User) {
                            params[opt.name] = `<@${opt.value}>`;
                        } else if (opt.type === ApplicationCommandOptionType.Role) {
                            params[opt.name] = `<@&${opt.value}>`;
                        } else if (opt.type === ApplicationCommandOptionType.Channel) {
                            params[opt.name] = `<#${opt.value}>`;
                        } else {
                            params[opt.name] = opt.value;
                        }
                    }
                }
            }

            // Determine visibility based on the first REPLY action
            const replyAction = actions.find(a => a.type === 'REPLY');
            const shouldBeEphemeral = replyAction?.ephemeral || false;

            // Defer immediately            // Defer immediately
            if (!interaction.deferred && !interaction.replied) {
                logger.info(`[CommandEngine] Deferring reply for ${interaction.commandName}`);
                await interaction.deferReply({ ephemeral: shouldBeEphemeral });
            }

            let firstResponseSent = false;
            logger.info(`[CommandEngine] Executing ${actions.length} actions for ${interaction.commandName}`);

            // Check if RANDOM_IMAGE exists — if so, REPLY text will be merged into the embed
            const hasRandomImage = actions.some(a => a.type === 'RANDOM_IMAGE');

            for (const action of actions) {
                // Skip standalone REPLY when RANDOM_IMAGE will merge it into the embed
                if (action.type === 'REPLY' && hasRandomImage) {
                    logger.info(`[CommandEngine] Skipping standalone REPLY (merged into RANDOM_IMAGE embed)`);
                    continue;
                }
                logger.info(`[CommandEngine] Processing action: ${action.type}`);
                const sent = await this.executeAction(interaction, action, params, firstResponseSent, actions);
                if (sent) firstResponseSent = true;
            }

            // If no response was sent, delete the thinking state or send a done message
            if (!firstResponseSent) {
                logger.info(`[CommandEngine] No response sent, deleting reply.`);
                await interaction.deleteReply().catch(() => { });
            }

        } catch (error) {
            logger.error('Erro ao executar comando personalizado:', { error });
            const errorMessage = '❌ Erro ao executar comando.';

            try {
                if (interaction.deferred || interaction.replied) {
                    await interaction.followUp({ content: errorMessage, ephemeral: true });
                } else {
                    await interaction.reply({ content: errorMessage, ephemeral: true });
                }
            } catch (err) {
                logger.error('Erro ao enviar mensagem de erro:', { err });
            }
        }
    }

    private async getTargetMember(interaction: ChatInputCommandInteraction, action: Action, params: Record<string, any>): Promise<GuildMember | null> {
        const guild = interaction.guild;
        if (!guild) return null;

        // 1. If action has explicit user_id (e.g. from LLM or manual JSON)
        if (action.user_id) {
            // Interpolate to resolve "{membro}" -> "<@123>" or "123"
            const interpolated = this.interpolate(action.user_id, params);
            // Clean up <@...> syntax
            const cleanId = interpolated.replace(/[<@!>]/g, '');
            if (/^\d{17,20}$/.test(cleanId)) {
                try {
                    return await guild.members.fetch(cleanId);
                } catch (e) {
                    logger.warn(`[CommandEngine] Could not fetch target member ${cleanId}`);
                }
            }
        }

        // 2. Fallback: Default to executor if no user_id specified
        return interaction.member as GuildMember;
    }

    // Helper to reuse interpolation logic
    private interpolate(text: string, params: Record<string, any>) {
        if (!text) return text;
        return text.replace(/\{(\w+)\}/g, (_, key) => {
            return params[key] !== undefined ? String(params[key]) : `{${key}}`;
        });
    }

    private async executeAction(
        interaction: ChatInputCommandInteraction,
        action: Action,
        params: Record<string, any>,
        firstResponseSent: boolean,
        actions: Action[]
    ): Promise<boolean> {
        const guild = interaction.guild;
        if (!guild) return false;

        // Use the helper method for interpolation
        const interpolate = (text: string) => this.interpolate(text, params);

        try {
            switch (action.type) {
                case 'REPLY': {
                    const content = interpolate(action.content as string);
                    const ephemeral = action.ephemeral as boolean || false;

                    if (!firstResponseSent && interaction.deferred) {
                        await interaction.editReply({ content });
                    } else {
                        await interaction.followUp({ content, ephemeral });
                    }
                    return true;
                }

                case 'RANDOM_IMAGE': {
                    const category = action.category || 'anime_hug';
                    logger.info(`[CommandEngine] RANDOM_IMAGE: Fetching GIF for category '${category}'`);
                    const url = await gifService.get(category);

                    if (url) {
                        logger.info(`[CommandEngine] RANDOM_IMAGE: Found URL: ${url}`);

                        // Category theming
                        const categoryThemes: Record<string, { emoji: string; color: number; label: string }> = {
                            kiss: { emoji: '💋', color: 0xFF69B4, label: 'Beijo' },
                            hug: { emoji: '🤗', color: 0xFFD700, label: 'Abraço' },
                            slap: { emoji: '👋', color: 0xFF4444, label: 'Tapa' },
                            pat: { emoji: '💆', color: 0x87CEEB, label: 'Carinho' },
                            cuddle: { emoji: '🥰', color: 0xFF8FAE, label: 'Conchinha' },
                            dance: { emoji: '💃', color: 0x9B59B6, label: 'Dança' },
                            bite: { emoji: '😈', color: 0xE74C3C, label: 'Mordida' },
                            poke: { emoji: '👉', color: 0x3498DB, label: 'Cutucão' },
                            tickle: { emoji: '🤭', color: 0xF1C40F, label: 'Cócegas' },
                            wave: { emoji: '👋', color: 0x2ECC71, label: 'Tchau' },
                            wink: { emoji: '😉', color: 0xE91E63, label: 'Piscadinha' },
                            cry: { emoji: '😢', color: 0x607D8B, label: 'Chorando' },
                            highfive: { emoji: '🙌', color: 0xFF9800, label: 'High Five' },
                            yeet: { emoji: '🚀', color: 0xF44336, label: 'Yeet' },
                            feed: { emoji: '🍕', color: 0x8BC34A, label: 'Comidinha' },
                            smile: { emoji: '😊', color: 0xFFEB3B, label: 'Sorriso' },
                            blush: { emoji: '😳', color: 0xFF80AB, label: 'Corou' },
                            happy: { emoji: '😄', color: 0xFFC107, label: 'Feliz' },
                            laugh: { emoji: '😂', color: 0xFFEB3B, label: 'Risada' },
                            think: { emoji: '🤔', color: 0x795548, label: 'Pensando' },
                            sleep: { emoji: '😴', color: 0x9E9E9E, label: 'Dormindo' },
                            stare: { emoji: '👁️', color: 0x607D8B, label: 'Encarando' },
                            smug: { emoji: '😏', color: 0x9C27B0, label: 'Convencido' },
                            pout: { emoji: '😤', color: 0xFF5722, label: 'Biquinho' },
                            thumbsup: { emoji: '👍', color: 0x4CAF50, label: 'Joinha' },
                            facepalm: { emoji: '🤦', color: 0x795548, label: 'Facepalm' },
                            baka: { emoji: '💢', color: 0xF44336, label: 'Baka' },
                        };

                        const cleanCat = category.replace('anime_', '');
                        const theme = categoryThemes[cleanCat] || { emoji: '✨', color: 0x99AAB5, label: cleanCat };

                        // Find any preceding REPLY action to merge its text into the embed
                        const replyAction = actions.find(a => a.type === 'REPLY');
                        let description = '';
                        if (replyAction) {
                            description = interpolate(replyAction.content as string);
                        }

                        const embed = new EmbedBuilder()
                            .setAuthor({
                                name: `${interaction.user.displayName}`,
                                iconURL: interaction.user.displayAvatarURL({ size: 32 })
                            })
                            .setDescription(`${theme.emoji} ${description || `${theme.label}!`}`)
                            .setImage(url)
                            .setColor(theme.color)
                            .setFooter({ text: `${theme.label} • Interações Sociais` })
                            .setTimestamp();

                        // Extract target user ID from params for button interaction
                        const targetParam = Object.entries(params).find(([_, v]) => typeof v === 'string' && v.startsWith('<@'));
                        const targetUserId = targetParam ? targetParam[1].replace(/[<@!>]/g, '') : null;

                        // Build interactive buttons
                        const row = new ActionRowBuilder<ButtonBuilder>();

                        // "Retribuir" button - do the same action back
                        if (targetUserId) {
                            row.addComponents(
                                new ButtonBuilder()
                                    .setCustomId(`gif_retribuir:${cleanCat}:${interaction.user.id}`)
                                    .setLabel(`Retribuir ${theme.emoji}`)
                                    .setStyle(ButtonStyle.Primary)
                            );
                        }

                        // Quick reaction buttons based on context
                        if (cleanCat !== 'slap') {
                            row.addComponents(
                                new ButtonBuilder()
                                    .setCustomId(`gif_action:slap:${interaction.user.id}`)
                                    .setLabel('Dar Tapa 👋')
                                    .setStyle(ButtonStyle.Danger)
                            );
                        }
                        if (cleanCat !== 'hug') {
                            row.addComponents(
                                new ButtonBuilder()
                                    .setCustomId(`gif_action:hug:${interaction.user.id}`)
                                    .setLabel('Abraçar 🤗')
                                    .setStyle(ButtonStyle.Success)
                            );
                        }
                        if (cleanCat !== 'kiss' && cleanCat !== 'slap') {
                            row.addComponents(
                                new ButtonBuilder()
                                    .setCustomId(`gif_action:kiss:${interaction.user.id}`)
                                    .setLabel('Beijar 💋')
                                    .setStyle(ButtonStyle.Secondary)
                            );
                        }

                        const messagePayload: any = { embeds: [embed], content: null };
                        if (row.components.length > 0) {
                            messagePayload.components = [row];
                        }

                        if (!firstResponseSent && interaction.deferred) {
                            logger.info('[CommandEngine] RANDOM_IMAGE: Sending via editReply');
                            await interaction.editReply(messagePayload);
                        } else {
                            logger.info('[CommandEngine] RANDOM_IMAGE: Sending via followUp');
                            await interaction.followUp(messagePayload);
                        }
                        return true;
                    }
                    return false;
                }

                case 'ADD_ROLE': {
                    const target = await this.getTargetMember(interaction, action, params);
                    if (!target) return false;

                    const roleIdToAdd = interpolate(action.role_id);
                    const cleanRoleIdToAdd = roleIdToAdd.replace(/[<@&>]/g, '');

                    if (cleanRoleIdToAdd && /^\d{17,20}$/.test(cleanRoleIdToAdd)) {
                        await target.roles.add(cleanRoleIdToAdd).catch(err => logger.error(`Failed to add role to ${target.user.tag}`, { err }));
                    } else {
                        logger.info(`[CommandEngine] ADD_ROLE skipped: Invalid ID (${roleIdToAdd})`);
                    }
                    return false;
                }

                case 'REMOVE_ROLE': {
                    const target = await this.getTargetMember(interaction, action, params);
                    if (!target) return false;

                    const roleIdToRemove = interpolate(action.role_id);
                    const cleanRoleIdToRemove = roleIdToRemove.replace(/[<@&>]/g, '');

                    if (cleanRoleIdToRemove && /^\d{17,20}$/.test(cleanRoleIdToRemove)) {
                        await target.roles.remove(cleanRoleIdToRemove).catch(err => logger.error(`Failed to remove role from ${target.user.tag}`, { err }));
                    } else {
                        logger.info(`[CommandEngine] REMOVE_ROLE skipped: Invalid ID (${roleIdToRemove})`);
                    }
                    return false;
                }

                case 'SET_NICKNAME': {
                    const target = await this.getTargetMember(interaction, action, params);
                    if (!target) return false;

                    const newNickname = interpolate(action.nickname);
                    if (newNickname && !newNickname.startsWith('{') && newNickname !== action.nickname) {
                        if (!target.manageable) {
                            // Only warn if we are trying to manage someone else
                            // If user manages self and fails, it's less critical, but strict check is good
                            logger.warn(`[CommandEngine] Cannot manage user ${target.user.tag}`);
                            await interaction.followUp({
                                content: `⚠️ **Erro:** Não posso alterar o apelido de <@${target.id}> (Cargo superior ou Dono).`,
                                ephemeral: true
                            });
                            return false;
                        }
                        await target.setNickname(newNickname.substring(0, 32)).catch(err => logger.error(`Failed to set nick`, { err }));
                    }
                    return false;
                }

                case 'KICK': {
                    const target = await this.getTargetMember(interaction, action, params);
                    if (!target) return false;
                    const reason = interpolate(action.reason || 'Sem motivo');

                    if (target.kickable) {
                        await target.kick(reason).catch(err => logger.error(`Failed to kick ${target.user.tag}`, { err }));
                        await interaction.followUp({ content: `👢 **Expulso:** <@${target.id}> | Motivo: ${reason}`, ephemeral: true });
                    } else {
                        await interaction.followUp({ content: `⚠️ Não consigo expulsar <@${target.id}> (Hierarquia).`, ephemeral: true });
                    }
                    return false;
                }

                case 'BAN': {
                    const target = await this.getTargetMember(interaction, action, params);
                    if (!target) return false;
                    const reason = interpolate(action.reason || 'Sem motivo');

                    if (target.bannable) {
                        // Ban creates a ban entry, target member obj might be invalid after? No, it's fine.
                        await target.ban({ reason }).catch(err => logger.error(`Failed to ban ${target.user.tag}`, { err }));
                        await interaction.followUp({ content: `🔨 **Banido:** <@${target.id}> | Motivo: ${reason}`, ephemeral: true });
                    } else {
                        await interaction.followUp({ content: `⚠️ Não consigo banir <@${target.id}> (Hierarquia).`, ephemeral: true });
                    }
                    return false;
                }

                case 'SEND_DM': {
                    const target = await this.getTargetMember(interaction, action, params);
                    if (!target) return false;

                    const dmContent = interpolate(action.content);
                    await target.send(dmContent).catch(() => { });
                    return false;
                }

                case 'SEND_CHANNEL':
                    const channelId = action.channel_id;
                    const channelMsg = interpolate(action.content);
                    const channel = guild.channels.cache.get(channelId) as TextChannel;
                    if (channel) {
                        await channel.send(channelMsg);
                    }
                    return false;

                default:
                    return false;
            }
        } catch (error) {
            logger.error(`Error executing action ${action.type}`, { error });
            return false;
        }
    }
}

export const commandEngine = new CommandEngine();
