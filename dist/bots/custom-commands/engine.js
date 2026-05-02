"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.commandEngine = exports.CommandEngine = void 0;
const discord_js_1 = require("discord.js");
const services_1 = require("../../shared/services");
const gif_service_1 = require("../../shared/services/gif.service");
const api_bridge_service_1 = require("../../shared/services/api-bridge.service");
const analytics_service_1 = require("../../shared/services/analytics.service");
class CommandEngine {
    async execute(interaction, actions) {
        try {
            // Extract params
            const params = {};
            if (interaction.options && interaction.options.data) {
                for (const opt of interaction.options.data) {
                    if (opt.value !== undefined) {
                        if (opt.type === discord_js_1.ApplicationCommandOptionType.User) {
                            params[opt.name] = `<@${opt.value}>`;
                        }
                        else if (opt.type === discord_js_1.ApplicationCommandOptionType.Role) {
                            params[opt.name] = `<@&${opt.value}>`;
                        }
                        else if (opt.type === discord_js_1.ApplicationCommandOptionType.Channel) {
                            params[opt.name] = `<#${opt.value}>`;
                        }
                        else {
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
                services_1.logger.info(`[CommandEngine] Deferring reply for ${interaction.commandName}`);
                await interaction.deferReply({ ephemeral: shouldBeEphemeral });
            }
            let firstResponseSent = false;
            services_1.logger.info(`[CommandEngine] Executing ${actions.length} actions for ${interaction.commandName}`);
            // Check if RANDOM_IMAGE exists — if so, REPLY text will be merged into the embed
            const hasRandomImage = actions.some(a => a.type === 'RANDOM_IMAGE');
            for (const action of actions) {
                // Skip standalone REPLY when RANDOM_IMAGE will merge it into the embed
                if (action.type === 'REPLY' && hasRandomImage) {
                    services_1.logger.info(`[CommandEngine] Skipping standalone REPLY (merged into RANDOM_IMAGE embed)`);
                    continue;
                }
                services_1.logger.info(`[CommandEngine] Processing action: ${action.type}`);
                const sent = await this.executeAction(interaction, action, params, firstResponseSent, actions);
                if (sent)
                    firstResponseSent = true;
            }
            // If no response was sent, delete the thinking state or send a done message
            if (!firstResponseSent) {
                services_1.logger.info(`[CommandEngine] No response sent, deleting reply.`);
                await interaction.deleteReply().catch(() => { });
            }
            if (interaction.guildId) {
                (0, analytics_service_1.trackEvent)(interaction.guildId, 'command_used').catch(() => { });
            }
        }
        catch (error) {
            services_1.logger.error('Erro ao executar comando personalizado:', { error });
            const errorMessage = '❌ Erro ao executar comando.';
            try {
                if (interaction.deferred || interaction.replied) {
                    await interaction.followUp({ content: errorMessage, ephemeral: true });
                }
                else {
                    await interaction.reply({ content: errorMessage, ephemeral: true });
                }
            }
            catch (err) {
                services_1.logger.error('Erro ao enviar mensagem de erro:', { err });
            }
        }
    }
    async getTargetMember(interaction, action, params) {
        const guild = interaction.guild;
        if (!guild)
            return null;
        // 1. If action has explicit user_id (e.g. from LLM or manual JSON)
        if (action.user_id) {
            // Interpolate to resolve "{membro}" -> "<@123>" or "123"
            const interpolated = this.interpolate(action.user_id, params);
            // Clean up <@...> syntax
            const cleanId = interpolated.replace(/[<@!>]/g, '');
            if (/^\d{17,20}$/.test(cleanId)) {
                try {
                    return await guild.members.fetch(cleanId);
                }
                catch (e) {
                    services_1.logger.warn(`[CommandEngine] Could not fetch target member ${cleanId}`);
                }
            }
        }
        // 2. Fallback: Default to executor if no user_id specified
        return interaction.member;
    }
    // Helper to reuse interpolation logic
    interpolate(text, params) {
        if (!text)
            return text;
        let result = text.replace(/\{(\w+)\}/g, (_, key) => {
            return params[key] !== undefined ? String(params[key]) : `{${key}}`;
        });
        // Limpa menções duplas acidentais geradas pela IA ou usuário (ex: <@<@123>> vira <@123>)
        result = result.replace(/<@<@(!?\&?\d+)>>/g, '<@$1>');
        result = result.replace(/<#<#(\d+)>>/g, '<#$1>');
        return result;
    }
    async executeAction(interaction, action, params, firstResponseSent, actions) {
        const guild = interaction.guild;
        if (!guild)
            return false;
        // Use the helper method for interpolation
        const interpolate = (text) => this.interpolate(text, params);
        try {
            switch (action.type) {
                case 'REPLY': {
                    const content = interpolate(action.content);
                    const ephemeral = action.ephemeral || false;
                    if (!firstResponseSent && interaction.deferred) {
                        await interaction.editReply({ content });
                    }
                    else {
                        await interaction.followUp({ content, ephemeral });
                    }
                    return true;
                }
                case 'RANDOM_IMAGE': {
                    const category = action.category || 'anime_hug';
                    services_1.logger.info(`[CommandEngine] RANDOM_IMAGE: Fetching GIF for category '${category}'`);
                    const url = await gif_service_1.gifService.get(category);
                    if (url) {
                        services_1.logger.info(`[CommandEngine] RANDOM_IMAGE: Found URL: ${url}`);
                        // Category theming
                        const categoryThemes = {
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
                            description = interpolate(replyAction.content);
                        }
                        const embed = new discord_js_1.EmbedBuilder()
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
                        const row = new discord_js_1.ActionRowBuilder();
                        // "Retribuir" button - do the same action back
                        if (targetUserId) {
                            row.addComponents(new discord_js_1.ButtonBuilder()
                                .setCustomId(`gif_retribuir:${cleanCat}:${interaction.user.id}:${targetUserId}`)
                                .setLabel(`Retribuir ${theme.emoji}`)
                                .setStyle(discord_js_1.ButtonStyle.Primary));
                        }
                        // Quick reaction buttons based on context
                        if (cleanCat !== 'slap') {
                            row.addComponents(new discord_js_1.ButtonBuilder()
                                .setCustomId(`gif_action:slap:${interaction.user.id}:${targetUserId || 'none'}`)
                                .setLabel('Dar Tapa 👋')
                                .setStyle(discord_js_1.ButtonStyle.Danger));
                        }
                        if (cleanCat !== 'hug') {
                            row.addComponents(new discord_js_1.ButtonBuilder()
                                .setCustomId(`gif_action:hug:${interaction.user.id}:${targetUserId || 'none'}`)
                                .setLabel('Abraçar 🤗')
                                .setStyle(discord_js_1.ButtonStyle.Success));
                        }
                        if (cleanCat !== 'kiss' && cleanCat !== 'slap') {
                            row.addComponents(new discord_js_1.ButtonBuilder()
                                .setCustomId(`gif_action:kiss:${interaction.user.id}:${targetUserId || 'none'}`)
                                .setLabel('Beijar 💋')
                                .setStyle(discord_js_1.ButtonStyle.Secondary));
                        }
                        const messagePayload = { embeds: [embed], content: null };
                        if (row.components.length > 0) {
                            messagePayload.components = [row];
                        }
                        if (!firstResponseSent && interaction.deferred) {
                            services_1.logger.info('[CommandEngine] RANDOM_IMAGE: Sending via editReply');
                            await interaction.editReply(messagePayload);
                        }
                        else {
                            services_1.logger.info('[CommandEngine] RANDOM_IMAGE: Sending via followUp');
                            await interaction.followUp(messagePayload);
                        }
                        return true;
                    }
                    return false;
                }
                case 'EXTERNAL_API': {
                    const provider = action.provider || 'nasa_apod';
                    // Extracts a param mapped dynamically if the action specifies a query key
                    const queryKey = action.query_key || 'query';
                    const queryParam = params[queryKey] || interpolate(action.query || '');
                    services_1.logger.info(`[CommandEngine] EXTERNAL_API for provider: ${provider} | Query: ${queryParam}`);
                    const result = await api_bridge_service_1.apiBridgeService.fetchApi(provider, queryParam);
                    if (result) {
                        const embed = new discord_js_1.EmbedBuilder()
                            .setAuthor({
                            name: `${interaction.user.displayName}`,
                            iconURL: interaction.user.displayAvatarURL({ size: 32 })
                        });
                        if (result.title)
                            embed.setTitle(result.title);
                        if (result.description)
                            embed.setDescription(result.description);
                        if (result.image)
                            embed.setImage(result.image);
                        if (result.color) {
                            try {
                                embed.setColor(result.color);
                            }
                            catch {
                                embed.setColor('#99AAB5');
                            }
                        }
                        embed.setFooter({ text: `${provider.toUpperCase()} • Integração CoreBot` }).setTimestamp();
                        const messagePayload = { embeds: [embed], content: null };
                        if (!firstResponseSent && interaction.deferred) {
                            await interaction.editReply(messagePayload);
                        }
                        else {
                            await interaction.followUp(messagePayload);
                        }
                        return true;
                    }
                    else {
                        const errMsg = `⚠️ Não foi possível obter dados da API externa (${provider}).`;
                        if (!firstResponseSent && interaction.deferred) {
                            await interaction.editReply(errMsg);
                        }
                        else {
                            await interaction.followUp({ content: errMsg, ephemeral: true });
                        }
                        return true;
                    }
                }
                case 'ADD_ROLE': {
                    const target = await this.getTargetMember(interaction, action, params);
                    if (!target)
                        return false;
                    const roleIdToAdd = interpolate(action.role_id);
                    const cleanRoleIdToAdd = roleIdToAdd.replace(/[<@&>]/g, '');
                    if (cleanRoleIdToAdd && /^\d{17,20}$/.test(cleanRoleIdToAdd)) {
                        await target.roles.add(cleanRoleIdToAdd).catch(err => services_1.logger.error(`Failed to add role to ${target.user.tag}`, { err }));
                    }
                    else {
                        services_1.logger.info(`[CommandEngine] ADD_ROLE skipped: Invalid ID (${roleIdToAdd})`);
                    }
                    return false;
                }
                case 'REMOVE_ROLE': {
                    const target = await this.getTargetMember(interaction, action, params);
                    if (!target)
                        return false;
                    const roleIdToRemove = interpolate(action.role_id);
                    const cleanRoleIdToRemove = roleIdToRemove.replace(/[<@&>]/g, '');
                    if (cleanRoleIdToRemove && /^\d{17,20}$/.test(cleanRoleIdToRemove)) {
                        await target.roles.remove(cleanRoleIdToRemove).catch(err => services_1.logger.error(`Failed to remove role from ${target.user.tag}`, { err }));
                    }
                    else {
                        services_1.logger.info(`[CommandEngine] REMOVE_ROLE skipped: Invalid ID (${roleIdToRemove})`);
                    }
                    return false;
                }
                case 'SET_NICKNAME': {
                    const target = await this.getTargetMember(interaction, action, params);
                    if (!target)
                        return false;
                    const newNickname = interpolate(action.nickname);
                    if (newNickname && !newNickname.startsWith('{') && newNickname !== action.nickname) {
                        if (!target.manageable) {
                            // Only warn if we are trying to manage someone else
                            // If user manages self and fails, it's less critical, but strict check is good
                            services_1.logger.warn(`[CommandEngine] Cannot manage user ${target.user.tag}`);
                            await interaction.followUp({
                                content: `⚠️ **Erro:** Não posso alterar o apelido de <@${target.id}> (Cargo superior ou Dono).`,
                                ephemeral: true
                            });
                            return false;
                        }
                        await target.setNickname(newNickname.substring(0, 32)).catch(err => services_1.logger.error(`Failed to set nick`, { err }));
                    }
                    return false;
                }
                case 'KICK': {
                    const target = await this.getTargetMember(interaction, action, params);
                    if (!target)
                        return false;
                    const reason = interpolate(action.reason || 'Sem motivo');
                    if (target.kickable) {
                        await target.kick(reason).catch(err => services_1.logger.error(`Failed to kick ${target.user.tag}`, { err }));
                        await interaction.followUp({ content: `👢 **Expulso:** <@${target.id}> | Motivo: ${reason}`, ephemeral: true });
                    }
                    else {
                        await interaction.followUp({ content: `⚠️ Não consigo expulsar <@${target.id}> (Hierarquia).`, ephemeral: true });
                    }
                    return false;
                }
                case 'BAN': {
                    const target = await this.getTargetMember(interaction, action, params);
                    if (!target)
                        return false;
                    const reason = interpolate(action.reason || 'Sem motivo');
                    if (target.bannable) {
                        // Ban creates a ban entry, target member obj might be invalid after? No, it's fine.
                        await target.ban({ reason }).catch(err => services_1.logger.error(`Failed to ban ${target.user.tag}`, { err }));
                        await interaction.followUp({ content: `🔨 **Banido:** <@${target.id}> | Motivo: ${reason}`, ephemeral: true });
                    }
                    else {
                        await interaction.followUp({ content: `⚠️ Não consigo banir <@${target.id}> (Hierarquia).`, ephemeral: true });
                    }
                    return false;
                }
                case 'SEND_DM': {
                    const target = await this.getTargetMember(interaction, action, params);
                    if (!target)
                        return false;
                    const dmContent = interpolate(action.content);
                    await target.send(dmContent).catch(() => { });
                    return false;
                }
                case 'SEND_CHANNEL':
                    const channelId = action.channel_id;
                    const channelMsg = interpolate(action.content);
                    const channel = guild.channels.cache.get(channelId);
                    if (channel) {
                        await channel.send(channelMsg);
                    }
                    return false;
                default:
                    return false;
            }
        }
        catch (error) {
            services_1.logger.error(`Error executing action ${action.type}`, { error });
            return false;
        }
    }
}
exports.CommandEngine = CommandEngine;
exports.commandEngine = new CommandEngine();
//# sourceMappingURL=engine.js.map