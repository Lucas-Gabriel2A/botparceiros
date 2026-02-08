import {
    TextChannel,
    EmbedBuilder,
    ActionRowBuilder,
    StringSelectMenuBuilder,
    ButtonBuilder,
    ButtonStyle,
    PermissionFlagsBits,
    ChannelType,
    GuildMember,
    Guild,
    AttachmentBuilder
} from 'discord.js';

import {
    getTicketCategories,
    createTicket as createDbTicket,
    closeTicket as closeDbTicket,
    claimTicket as claimDbTicket,
    logAudit,
    logger,
    config
} from '../../shared/services';

// ═══════════════════════════════════════════════════════════════════════════
// 🎨 CONSTANTES & TEMA
// ═══════════════════════════════════════════════════════════════════════════

export const THEME = {
    colors: {
        primary: 0x7B68EE,
        success: 0x00FF7F,
        danger: 0xFF4500,
        info: 0x1E90FF,
        warning: 0xFFD700,
        cosmic: 0x9400D3
    },
    emojis: {
        star: '✨',
        rocket: '🚀',
        planet: '🪐',
        galaxy: '🌌',
        ticket: '🎫',
        close: '🔒',
        delete: '🗑️',
        edit: '✏️',
        add: '➕',
        list: '📋',
        log: '📜',
        user: '👤',
        staff: '👮',
        success: '✅',
        error: '❌',
        warning: '⚠️',
        claim: '🙋‍♂️'
    }
} as const;

const NEXSTAR_BANNER = 'https://i.ibb.co/TDRDH2kq/nexstar.jpg';
const STAFF_ROLE_ID = config.get('STAFF_ROLE_ID');
const TICKETS_CATEGORY_ID = config.get('TICKETS_CATEGORY_ID');
const LOGS_TICKETS = config.getOptional('LOGS_TICKETS');

// ═══════════════════════════════════════════════════════════════════════════
// 🧠 LÓGICA DE SERVIÇO
// ═══════════════════════════════════════════════════════════════════════════

export async function sendTicketPanel(channel: TextChannel, guildId: string): Promise<void> {
    const categories = await getTicketCategories(guildId);

    const embed = new EmbedBuilder()
        .setColor(THEME.colors.primary)
        .setTitle(`${THEME.emojis.galaxy} Central de Tickets - Nexstar`)
        .setDescription(`
${THEME.emojis.star} **Bem-vindo ao Sistema de Tickets!**

Selecione uma categoria abaixo para abrir seu ticket.
Nossa equipe galáctica está pronta para te ajudar!

${THEME.emojis.rocket} Escolha a categoria que melhor descreve sua necessidade.
        `)
        .setImage(NEXSTAR_BANNER)
        .setThumbnail(NEXSTAR_BANNER)
        .setFooter({ text: '🌌 Nexstar - Explorando o Universo Juntos' })
        .setTimestamp();

    if (categories.length === 0) {
        embed.addFields({
            name: `${THEME.emojis.warning} Nenhuma Categoria`,
            value: 'Ainda não há categorias configuradas. Use `/ticket-categoria criar` para começar.'
        });
        await channel.send({ embeds: [embed] });
        return;
    }

    const options = categories.map(cat => ({
        label: cat.name,
        description: cat.description ? cat.description.substring(0, 100) : 'Sem descrição',
        value: cat.id,
        emoji: THEME.emojis.planet
    }));

    const selectMenu = new StringSelectMenuBuilder()
        .setCustomId('ticket_category_select')
        .setPlaceholder(`${THEME.emojis.ticket} Selecione uma categoria...`)
        .addOptions(options);

    const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu);

    await channel.send({ embeds: [embed], components: [row] });
}

export async function createTicketChannel(
    guild: Guild,
    member: GuildMember,
    categoryId: string
): Promise<TextChannel | string> {
    const categories = await getTicketCategories(guild.id);
    const category = categories.find(c => c.id === categoryId);

    if (!category) return "CATEGORY_NOT_FOUND";

    // Verificar se já tem ticket aberto (opcional, por simplicidade vamos permitir múltiplos por enquanto ou verificar via DB)
    // Para simplificar e seguir o original:
    const existingChannel = guild.channels.cache.find(
        ch => ch.name === `ticket-${member.user.username.toLowerCase().replace(/[^a-z0-9]/g, '')}`
    );

    if (existingChannel) return existingChannel.toString();

    try {
        const parentCategory = category.ticket_channel_category_id || TICKETS_CATEGORY_ID;

        const permissionOverwrites: any[] = [
            { id: guild.id, deny: [PermissionFlagsBits.ViewChannel] },
            { id: member.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] },
            { id: STAFF_ROLE_ID, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.ManageMessages] }
        ];

        if (category.support_role_id && category.support_role_id !== STAFF_ROLE_ID) {
            permissionOverwrites.push({
                id: category.support_role_id,
                allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.ManageMessages]
            });
        }

        const ticketChannel = await guild.channels.create({
            name: `ticket-${member.user.username.toLowerCase().replace(/[^a-z0-9]/g, '')}`,
            type: ChannelType.GuildText,
            parent: parentCategory,
            permissionOverwrites
        });

        const embedTitle = category.welcome_title || `${THEME.emojis.ticket} Ticket Aberto`;
        const embedDesc = category.welcome_description
            ? category.welcome_description.replace(/{user}/g, `${member.user}`).replace(/{category}/g, category.name)
            : `
${THEME.emojis.star} **Olá, ${member.user}!**

Seu ticket foi criado com sucesso na categoria **${category.name}**.

${THEME.emojis.planet} **Descrição da Categoria:**
${category.description || 'Sem descrição'}

${THEME.emojis.rocket} Nossa equipe responderá em breve!
            `;

        const ticketEmbed = new EmbedBuilder()
            .setColor(parseInt(category.color.replace('#', ''), 16) || THEME.colors.primary)
            .setTitle(embedTitle)
            .setDescription(embedDesc)
            .addFields(
                { name: `${THEME.emojis.user} Aberto por`, value: `${member.user.tag}`, inline: true },
                { name: `${THEME.emojis.galaxy} Categoria`, value: category.name, inline: true }
            )
            .setTimestamp()
            .setFooter({ text: '🌌 Nexstar Tickets System' });

        const closeButton = new ButtonBuilder()
            .setCustomId(`close_ticket_${member.id}_${category.name}`)
            .setLabel('Fechar Ticket')
            .setStyle(ButtonStyle.Danger)
            .setEmoji(THEME.emojis.close);

        const claimButton = new ButtonBuilder()
            .setCustomId(`claim_ticket`)
            .setLabel('Assumir Ticket')
            .setStyle(ButtonStyle.Success)
            .setEmoji(THEME.emojis.claim);

        const row = new ActionRowBuilder<ButtonBuilder>().addComponents(closeButton, claimButton);

        const pingRole = category.support_role_id || STAFF_ROLE_ID;

        await ticketChannel.send({
            content: `${member.user} | <@&${pingRole}>`,
            embeds: [ticketEmbed],
            components: [row]
        });

        // Database Registration
        await createDbTicket(guild.id, ticketChannel.id, member.id, category.name);
        await logAudit(guild.id, member.id, 'TICKET_CREATED', ticketChannel.id, {
            category: category.name,
            channel_name: ticketChannel.name
        });

        return ticketChannel;
    } catch (error) {
        logger.error('Erro ao criar canal de ticket', { error });
        throw error;
    }
}

export async function handleTicketClaim(
    interaction: any // ButtonInteraction
): Promise<void> {
    if (!interaction.member.roles.cache.has(STAFF_ROLE_ID)) {
        await interaction.reply({ content: `${THEME.emojis.error} Apenas Staff pode assumir tickets!`, ephemeral: true });
        return;
    }

    const channel = interaction.channel as TextChannel;
    const member = interaction.member as GuildMember;

    await claimDbTicket(channel.id, member.id);

    const embed = new EmbedBuilder()
        .setColor(THEME.colors.success)
        .setDescription(`${THEME.emojis.claim} **Ticket assumido por:** ${member.user}`);

    await interaction.reply({ embeds: [embed] });

    // Atualizar tópico do canal se possível
    await channel.setTopic(`Assumido por: ${member.user.tag}`).catch(() => { });
}

// ═══════════════════════════════════════════════════════════════════════════
// 📜 TRANSCRIPTS
// ═══════════════════════════════════════════════════════════════════════════

export async function generateTranscript(channel: TextChannel, closedBy: GuildMember): Promise<string> {
    const messages = await channel.messages.fetch({ limit: 100 });
    const sortedMessages = [...messages.values()].reverse();

    let transcript = `╔══════════════════════════════════════════════════════════════╗\n`;
    transcript += `║           🌌 NEXSTAR TICKETS - TRANSCRIPT                    ║\n`;
    transcript += `╚══════════════════════════════════════════════════════════════╝\n\n`;
    transcript += `📋 Canal: ${channel.name}\n`;
    transcript += `📅 Data de Fechamento: ${new Date().toLocaleString('pt-BR')}\n`;
    transcript += `👤 Fechado por: ${closedBy.user.tag}\n`;
    transcript += `💬 Total de Mensagens: ${sortedMessages.length}\n\n`;
    transcript += `═══════════════════════════════════════════════════════════════\n\n`;

    for (const msg of sortedMessages) {
        const timestamp = msg.createdAt.toLocaleString('pt-BR');
        transcript += `[${timestamp}] ${msg.author.tag}:\n`;
        transcript += `${msg.content || '[Embed/Anexo]'}\n\n`;
    }

    transcript += `\n═══════════════════════════════════════════════════════════════\n`;
    transcript += `🚀 Fim do Transcript - Nexstar Tickets System\n`;

    return transcript;
}

export async function closeTicketProcess(
    channel: TextChannel,
    guild: Guild,
    closedBy: GuildMember,
    categoryName: string
): Promise<void> {
    const transcript = await generateTranscript(channel, closedBy);

    if (LOGS_TICKETS) {
        const logsChannel = guild.channels.cache.get(LOGS_TICKETS) as TextChannel;
        if (logsChannel) {
            const buffer = Buffer.from(transcript, 'utf8');
            const attachment = new AttachmentBuilder(buffer, { name: `transcript-${channel.name}.txt` });

            const logEmbed = new EmbedBuilder()
                .setColor(THEME.colors.info)
                .setTitle(`${THEME.emojis.log} Ticket Fechado`)
                .addFields(
                    { name: 'Ticket', value: channel.name, inline: true },
                    { name: 'Fechado por', value: closedBy.user.tag, inline: true },
                    { name: 'Categoria', value: categoryName, inline: true }
                )
                .setTimestamp();

            await logsChannel.send({ embeds: [logEmbed], files: [attachment] }).catch(() => { });
        }
    }

    await closeDbTicket(channel.id);

    await channel.delete();
}
