"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupWelcomeEvents = setupWelcomeEvents;
const discord_js_1 = require("discord.js");
const services_1 = require("../../shared/services");
const welcome_service_1 = require("./welcome.service");
const analytics_service_1 = require("../../shared/services/analytics.service");
function setupWelcomeEvents(client) {
    services_1.logger.info('🌌 Módulo Welcome: Eventos inicializados');
    // Welcome
    client.on('guildMemberAdd', async (member) => {
        if (member.user.bot)
            return;
        const guildId = member.guild.id;
        (0, analytics_service_1.trackEvent)(guildId, 'member_join').catch(() => { });
        try {
            const config = await (0, services_1.getGuildConfig)(guildId);
            if (!config || !config.welcome_channel_id)
                return;
            const channel = member.guild.channels.cache.get(config.welcome_channel_id);
            if (!channel) {
                services_1.logger.warn(`Canal de welcome ${config.welcome_channel_id} não encontrado na guild ${guildId}`);
                return;
            }
            const botPermissions = channel.permissionsFor(member.guild.members.me);
            if (!botPermissions?.has(discord_js_1.PermissionFlagsBits.SendMessages) || !botPermissions?.has(discord_js_1.PermissionFlagsBits.AttachFiles)) {
                services_1.logger.warn(`Sem permissão para enviar welcome em ${channel.name} (${guildId})`);
                return;
            }
            const messageText = config.welcome_message || 'Bem-vindo {user} ao servidor!';
            let buffer;
            // Tenta gerar o banner passando url e fonte do config
            try {
                buffer = await (0, welcome_service_1.generateBanner)(member, messageText, config.welcome_banner_url, config.welcome_font);
            }
            catch (error) {
                services_1.logger.warn('Banner completo falhou, tentando versão rápida', { error });
                buffer = await (0, welcome_service_1.generateBannerFast)(member, messageText, config.welcome_banner_url);
            }
            const attachment = new discord_js_1.AttachmentBuilder(buffer, { name: 'welcome.png' });
            // Opcional: Adicionar AutoRole se configurado
            if (config.autorole_id) {
                try {
                    await member.roles.add(config.autorole_id);
                    services_1.logger.info(`AutoRole ${config.autorole_id} adicionado para ${member.user.tag}`);
                }
                catch (roleError) {
                    services_1.logger.warn(`Falha ao adicionar AutoRole: ${roleError.message}`);
                }
            }
            // O texto real agora é o configurado pelo form, mas a img ja tem o texto.
            // Para não duplicar, podemos mandar apenas uma menção simples no corpo:
            const content = `${member}`; // Só a marcação para pingar o usuário. A arte visual já possui a mensagem!
            await channel.send({
                content: content,
                files: [attachment]
            });
            services_1.logger.info(`Welcome enviado para ${member.user.tag} em ${member.guild.name}`);
        }
        catch (error) {
            services_1.logger.error(`Erro no evento guildMemberAdd: ${error.message}`);
        }
    });
    // Leave
    client.on('guildMemberRemove', async (member) => {
        const guildMember = member;
        if (guildMember.user.bot)
            return;
        const guildId = guildMember.guild.id;
        (0, analytics_service_1.trackEvent)(guildId, 'member_leave').catch(() => { });
        try {
            const config = await (0, services_1.getGuildConfig)(guildId);
            if (!config || !config.leave_channel_id)
                return;
            const channel = guildMember.guild.channels.cache.get(config.leave_channel_id);
            if (!channel)
                return;
            const botPermissions = channel.permissionsFor(guildMember.guild.members.me);
            if (!botPermissions?.has(discord_js_1.PermissionFlagsBits.SendMessages) || !botPermissions?.has(discord_js_1.PermissionFlagsBits.AttachFiles)) {
                return;
            }
            const messageText = config.leave_message || 'Adeus {user}!';
            let buffer;
            try {
                buffer = await (0, welcome_service_1.generateBanner)(guildMember, messageText, null);
            }
            catch (error) {
                buffer = await (0, welcome_service_1.generateBannerFast)(guildMember, messageText, null);
            }
            const attachment = new discord_js_1.AttachmentBuilder(buffer, { name: 'leave.png' });
            await channel.send({ files: [attachment] });
            services_1.logger.info(`Leave enviado para ${guildMember.user.tag}`);
        }
        catch (error) {
            services_1.logger.error(`Erro no evento guildMemberRemove: ${error.message}`);
        }
    });
}
//# sourceMappingURL=events.js.map