"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PRIVATE_CALLS_EVENTS = void 0;
exports.setupPrivateCallsEvents = setupPrivateCallsEvents;
const discord_js_1 = require("discord.js");
const database_1 = require("../../shared/services/database");
const logger_service_1 = require("../../shared/services/logger.service");
const private_calls_service_1 = require("./private-calls.service");
const builders_1 = require("@discordjs/builders");
const discord_js_2 = require("discord.js");
function setupPrivateCallsEvents(client) {
    logger_service_1.logger.info('📞 Módulo Private Calls: Eventos inicializados');
    client.on(discord_js_1.Events.InteractionCreate, async (interaction) => {
        await exports.PRIVATE_CALLS_EVENTS.onInteractionCreate(interaction);
    });
    client.on(discord_js_1.Events.VoiceStateUpdate, async (oldState, newState) => {
        await exports.PRIVATE_CALLS_EVENTS.onVoiceStateUpdate(oldState, newState);
    });
}
exports.PRIVATE_CALLS_EVENTS = {
    name: 'PrivateCalls',
    // Command Definition
    commands: [
        new builders_1.SlashCommandBuilder()
            .setName('call')
            .setDescription('Gerencia sua call privada')
            .addSubcommand(sub => sub.setName('criar')
            .setDescription('Cria uma nova call privada'))
            .addSubcommand(sub => sub.setName('convidar')
            .setDescription('Convida um usuário para sua call')
            .addUserOption(opt => opt.setName('usuario').setDescription('Usuário a convidar').setRequired(true)))
            .addSubcommand(sub => sub.setName('expulsar')
            .setDescription('Expulsa um usuário da sua call')
            .addUserOption(opt => opt.setName('usuario').setDescription('Usuário a expulsar').setRequired(true)))
            .addSubcommand(sub => sub.setName('bloquear')
            .setDescription('Bloqueia a call para novos usuários'))
            .addSubcommand(sub => sub.setName('desbloquear')
            .setDescription('Permite que todos entrem na call'))
            .addSubcommand(sub => sub.setName('limite')
            .setDescription('Define o limite de usuários na call')
            .addIntegerOption(opt => opt.setName('quantidade').setDescription('Número máximo de usuários (0 = sem limite)').setRequired(true)))
    ],
    async onInteractionCreate(interaction) {
        if (!interaction.isChatInputCommand())
            return;
        if (interaction.commandName !== 'call')
            return;
        const guildId = interaction.guildId;
        const member = interaction.member; // Cast needed for roles
        const config = await database_1.database.getGuildConfig(guildId);
        if (!config?.private_calls_enabled) {
            await interaction.reply({ content: '❌ O sistema de calls privadas está desativado neste servidor.', ephemeral: true });
            return;
        }
        // Check Allowed Roles
        if (config.private_calls_allowed_roles && config.private_calls_allowed_roles.length > 0) {
            const hasRole = member.roles.cache.some((r) => config.private_calls_allowed_roles.includes(r.id));
            const isManager = config.private_calls_manager_role && member.roles.cache.has(config.private_calls_manager_role);
            if (!hasRole && !isManager && !member.permissions.has(discord_js_2.PermissionsBitField.Flags.Administrator)) {
                await interaction.reply({ content: '❌ Você não tem permissão para usar este comando.', ephemeral: true });
                return;
            }
        }
        const subcommand = interaction.options.getSubcommand();
        if (subcommand === 'criar') {
            if (!config.private_calls_category_id) {
                await interaction.reply({ content: '❌ Categoria de calls privadas não configurada.', ephemeral: true });
                return;
            }
            await interaction.deferReply({ ephemeral: true });
            const channel = await private_calls_service_1.PRIVATE_CALLS_SERVICE.createPrivateChannel(interaction.guild, member, config.private_calls_category_id);
            if (channel) {
                await interaction.editReply(`✅ Call criada com sucesso: ${channel}`);
            }
            else {
                await interaction.editReply('❌ Você já possui uma call ativa ou ocorreu um erro.');
            }
            return;
        }
        // For other commands, ensure user owns the channel (or is manager)
        let call = await database_1.database.getPrivateCallByOwner(guildId, member.id);
        if (!call) {
            await interaction.reply({ content: '❌ Você não tem uma call ativa. Use `/call criar` primeiro.', ephemeral: true });
            return;
        }
        const channel = interaction.guild.channels.cache.get(call.channel_id);
        if (!channel) {
            await database_1.database.deletePrivateCall(call.channel_id);
            await interaction.reply({ content: '❌ Canal não encontrado (removido do banco).', ephemeral: true });
            return;
        }
        switch (subcommand) {
            case 'convidar':
                const userInvite = interaction.options.getUser('usuario');
                await channel.permissionOverwrites.edit(userInvite.id, {
                    Connect: true,
                    ViewChannel: true
                });
                await interaction.reply({ content: `✅ ${userInvite} foi convidado para a call.`, ephemeral: true });
                break;
            case 'expulsar':
                const userKick = interaction.options.getUser('usuario');
                // Remove permission
                await channel.permissionOverwrites.delete(userKick.id);
                // Also disconnect if connected
                const memberToKick = await interaction.guild.members.fetch(userKick.id).catch(() => null);
                if (memberToKick && memberToKick.voice.channelId === channel.id) {
                    await memberToKick.voice.disconnect();
                }
                await interaction.reply({ content: `👋 ${userKick} foi removido da call.`, ephemeral: true });
                break;
            case 'bloquear':
                await channel.permissionOverwrites.edit(guildId, { Connect: false });
                await interaction.reply({ content: '🔒 Call bloqueada para novos membros (apenas convidados).', ephemeral: true });
                await database_1.database.updatePrivateCall(channel.id, { is_open: false });
                break;
            case 'desbloquear':
                await channel.permissionOverwrites.edit(guildId, { Connect: true });
                await interaction.reply({ content: '🔓 Call desbloqueada para todos.', ephemeral: true });
                await database_1.database.updatePrivateCall(channel.id, { is_open: true });
                break;
            case 'limite':
                const limit = interaction.options.getInteger('quantidade');
                await channel.setUserLimit(limit);
                await interaction.reply({ content: `✅ Limite de usuários definido para ${limit === 0 ? 'ilimitado' : limit}.`, ephemeral: true });
                await database_1.database.updatePrivateCall(channel.id, { member_limit: limit });
                break;
        }
    },
    async onVoiceStateUpdate(oldState, _newState) {
        // Handle Auto-Cleanup
        const guild = oldState.guild;
        const channelLeft = oldState.channelId;
        if (channelLeft) {
            // Check if it was a private call
            const isPrivateCall = await database_1.database.getPrivateCall(channelLeft);
            if (isPrivateCall) {
                const channel = guild.channels.cache.get(channelLeft);
                // Force cast members to any to avoid TS issue with ThreadMemberManager union
                if (channel && channel.members.size === 0) {
                    await private_calls_service_1.PRIVATE_CALLS_SERVICE.deletePrivateChannel(channelLeft, guild);
                }
            }
        }
    }
};
//# sourceMappingURL=events.js.map