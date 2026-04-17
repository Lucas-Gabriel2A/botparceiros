import { Client, GuildMember, TextChannel, AttachmentBuilder, PermissionFlagsBits } from 'discord.js';
import { getGuildConfig, logger } from '../../shared/services';
import { generateBanner, generateBannerFast } from './welcome.service';
import { trackEvent } from '../../shared/services/analytics.service';

export function setupWelcomeEvents(client: Client) {
    logger.info('🌌 Módulo Welcome: Eventos inicializados');

    // Welcome
    client.on('guildMemberAdd', async (member: GuildMember) => {
        if (member.user.bot) return;

        const guildId = member.guild.id;
        trackEvent(guildId, 'member_join').catch(() => {});

        try {
            const config = await getGuildConfig(guildId);
            if (!config || !config.welcome_channel_id) return;

            const channel = member.guild.channels.cache.get(config.welcome_channel_id) as TextChannel;
            if (!channel) {
                logger.warn(`Canal de welcome ${config.welcome_channel_id} não encontrado na guild ${guildId}`);
                return;
            }

            const botPermissions = channel.permissionsFor(member.guild.members.me!);
            if (!botPermissions?.has(PermissionFlagsBits.SendMessages) || !botPermissions?.has(PermissionFlagsBits.AttachFiles)) {
                logger.warn(`Sem permissão para enviar welcome em ${channel.name} (${guildId})`);
                return;
            }

            const messageText = config.welcome_message || 'Bem-vindo {user} ao servidor!';
            let buffer: Buffer;

            // Tenta gerar o banner passando url e fonte do config
            try {
                buffer = await generateBanner(member, messageText, config.welcome_banner_url, config.welcome_font);
            } catch (error) {
                logger.warn('Banner completo falhou, tentando versão rápida', { error });
                buffer = await generateBannerFast(member, messageText, config.welcome_banner_url);
            }

            const attachment = new AttachmentBuilder(buffer, { name: 'welcome.png' });

            // Opcional: Adicionar AutoRole se configurado
            if (config.autorole_id) {
                try {
                    await member.roles.add(config.autorole_id);
                    logger.info(`AutoRole ${config.autorole_id} adicionado para ${member.user.tag}`);
                } catch (roleError) {
                    logger.warn(`Falha ao adicionar AutoRole: ${(roleError as any).message}`);
                }
            }

            // O texto real agora é o configurado pelo form, mas a img ja tem o texto.
            // Para não duplicar, podemos mandar apenas uma menção simples no corpo:
            const content = `${member}`; // Só a marcação para pingar o usuário. A arte visual já possui a mensagem!

            await channel.send({
                content: content,
                files: [attachment]
            });

            logger.info(`Welcome enviado para ${member.user.tag} em ${member.guild.name}`);

        } catch (error) {
            logger.error(`Erro no evento guildMemberAdd: ${(error as any).message}`);
        }
    });

    // Leave
    client.on('guildMemberRemove', async (member) => {
        const guildMember = member as GuildMember;
        if (guildMember.user.bot) return;

        const guildId = guildMember.guild.id;
        trackEvent(guildId, 'member_leave').catch(() => {});

        try {
            const config = await getGuildConfig(guildId);
            if (!config || !config.leave_channel_id) return;

            const channel = guildMember.guild.channels.cache.get(config.leave_channel_id) as TextChannel;
            if (!channel) return;

            const botPermissions = channel.permissionsFor(guildMember.guild.members.me!);
            if (!botPermissions?.has(PermissionFlagsBits.SendMessages) || !botPermissions?.has(PermissionFlagsBits.AttachFiles)) {
                return;
            }

            const messageText = config.leave_message || 'Adeus {user}!';
            let buffer: Buffer;

            try {
                buffer = await generateBanner(guildMember, messageText, null);
            } catch (error) {
                buffer = await generateBannerFast(guildMember, messageText, null);
            }

            const attachment = new AttachmentBuilder(buffer, { name: 'leave.png' });
            await channel.send({ files: [attachment] });

            logger.info(`Leave enviado para ${guildMember.user.tag}`);

        } catch (error) {
            logger.error(`Erro no evento guildMemberRemove: ${(error as any).message}`);
        }
    });
}
