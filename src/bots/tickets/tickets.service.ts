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
    getGuildConfig,
    logAudit,
    logger
} from '../../shared/services';

// ═══════════════════════════════════════════════════════════════════════════
// 🎨 CONSTANTES & DEFAULTS
// ═══════════════════════════════════════════════════════════════════════════

export const THEME = {
    colors: {
        primary: 0x5865F2,
        success: 0x2ECC71,
        danger: 0xE74C3C,
        warning: 0xF1C40F,
        info: 0x3498DB
    },
    emojis: {
        ticket: '🎫',
        close: '🔒',
        claim: '🙋‍♂️',
        star: '✨',
        warning: '⚠️',
        log: '📜',
        user: '👤',
        success: '✅',
        error: '❌',
        edit: '✏️',
        delete: '🗑️'
    }
} as const;

// Alias internal defaults to THEME for consistency within this file
const DEFAULT_COLORS = THEME.colors;
const DEFAULT_EMOJIS = THEME.emojis;

const DEFAULT_BANNER = null;

// ═══════════════════════════════════════════════════════════════════════════
// 🧠 LÓGICA DE SERVIÇO (Implementação Baseada no Frontend)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Envia o painel de tickets para o canal especificado.
 * Baseado nas configurações de `TicketConfigForm.tsx` e `TicketDashboardClient.tsx`
 */
export async function sendTicketPanel(channel: TextChannel, guildId: string): Promise<void> {
    const categories = await getTicketCategories(guildId);
    const guildConfig = await getGuildConfig(guildId);

    // Default Values (Generic - No "Nexstar" hardcoded)
    let title = 'Central de Tickets';
    let description = 'Selecione uma categoria abaixo para abrir seu ticket.';
    let banner: string | null = DEFAULT_BANNER;
    let color: any = DEFAULT_COLORS.primary;
    let footerText = 'Sistema de Tickets';

    // Apply DB Config (Matches TicketDashboardClient props)
    if (guildConfig) {
        if (guildConfig.ticket_panel_title) title = guildConfig.ticket_panel_title;
        if (guildConfig.ticket_panel_description) description = guildConfig.ticket_panel_description;
        if (guildConfig.ticket_panel_banner_url) banner = guildConfig.ticket_panel_banner_url;
        if (guildConfig.ticket_panel_color) color = guildConfig.ticket_panel_color;
        if (guildConfig.ticket_panel_footer) footerText = guildConfig.ticket_panel_footer;
    }

    const embed = new EmbedBuilder()
        .setColor(color)
        .setTitle(title)
        .setDescription(description)
        .setFooter({ text: footerText })
        .setTimestamp();

    if (banner) {
        embed.setImage(banner);
        embed.setThumbnail(banner);
    }

    // Configuração de Componentes (Select Menu ou Botão de Aviso)
    if (categories.length === 0) {
        const warningEmbed = new EmbedBuilder()
            .setColor(DEFAULT_COLORS.warning)
            .setTitle(`${DEFAULT_EMOJIS.warning} Configuração Necessária`)
            .setDescription('Nenhuma categoria de ticket foi encontrada.\n\nPor favor, crie categorias através do comando `/ticket-categoria criar` ou pelo painel web.');

        await channel.send({ embeds: [embed, warningEmbed] });
        return;
    }

    // Criação do Menu de Seleção baseado nas categorias ativas
    const options = categories.map(cat => ({
        label: cat.name,
        description: (cat.description || 'Sem descrição').substring(0, 100),
        value: cat.id,
        emoji: cat.emoji || DEFAULT_EMOJIS.ticket
    }));

    const selectMenu = new StringSelectMenuBuilder()
        .setCustomId('ticket_category_select')
        .setPlaceholder('Selecione uma categoria...')
        .addOptions(options);

    const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu);

    await channel.send({ embeds: [embed], components: [row] });
}

/**
 * Cria o canal de ticket baseado na categoria selecionada.
 * Baseado na estrutura de `TicketForm.tsx` (TicketCategory)
 */
export async function createTicketChannel(
    guild: Guild,
    member: GuildMember,
    categoryId: string
): Promise<TextChannel | string> {
    const guildConfig = await getGuildConfig(guild.id);
    const categories = await getTicketCategories(guild.id);
    const category = categories.find(c => c.id === categoryId);

    if (!category) return "CATEGORY_NOT_FOUND";

    // Check for existing ticket
    const existingChannel = guild.channels.cache.find(
        ch => ch.name === `ticket-${member.user.username.toLowerCase().replace(/[^a-z0-9]/g, '')}`
    );

    if (existingChannel) return existingChannel.toString();

    try {
        // Hierarquia de Configuração: Categoria Específica > Configuração Global > Defaults

        // 1. Categoria Pai (Discord Category ID)
        const parentCategory = category.ticket_channel_category_id; // From TicketForm: ID da Categoria Discord

        // 2. Cargo de Suporte (Support Role ID)
        const staffRoleId = category.support_role_id || guildConfig?.staff_role_id; // From TicketForm: ID do Cargo Suporte

        // 3. Permissões
        const permissionOverwrites: any[] = [
            { id: guild.id, deny: [PermissionFlagsBits.ViewChannel] }, // @everyone: Deny View
            { id: member.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] } // Ticket Owner: Allow View/Send
        ];

        if (staffRoleId) {
            permissionOverwrites.push({
                id: staffRoleId,
                allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.ManageMessages]
            });
        }

        // Create Channel
        const ticketChannel = await guild.channels.create({
            name: `ticket-${member.user.username.toLowerCase().replace(/[^a-z0-9]/g, '')}`,
            type: ChannelType.GuildText,
            parent: parentCategory || undefined,
            permissionOverwrites
        });

        // 4. Welcome Embed Customization (From TicketForm: Título e Descrição do Embed)
        const embedTitle = category.welcome_title || `Ticket Aberto: ${category.name}`;

        let embedDesc = category.welcome_description ||
            `Olá, ${member.user}!\n\nSeu ticket foi criado na categoria **${category.name}**.\nAguarde, nossa equipe irá atendê-lo em breve.`;

        // Replace variables if configured
        embedDesc = embedDesc
            .replace(/{user}/g, `${member.user}`)
            .replace(/{category}/g, category.name);

        const ticketEmbed = new EmbedBuilder()
            .setColor(category.color ? (category.color.startsWith('#') ? parseInt(category.color.replace('#', ''), 16) : DEFAULT_COLORS.primary) : DEFAULT_COLORS.primary)
            .setTitle(embedTitle)
            .setDescription(embedDesc)
            .addFields(
                { name: `${DEFAULT_EMOJIS.user} Aberto por`, value: `${member.user.tag}`, inline: true },
                { name: `${DEFAULT_EMOJIS.ticket} Categoria`, value: category.name, inline: true }
            )
            .setTimestamp()
            .setFooter({ text: 'Ticket System' });

        // Buttons
        const closeButton = new ButtonBuilder()
            .setCustomId(`close_ticket_${member.id}_${category.name}`)
            .setLabel('Fechar Ticket')
            .setStyle(ButtonStyle.Danger)
            .setEmoji(DEFAULT_EMOJIS.close);

        const claimButton = new ButtonBuilder()
            .setCustomId(`claim_ticket`)
            .setLabel('Assumir Ticket')
            .setStyle(ButtonStyle.Success)
            .setEmoji(DEFAULT_EMOJIS.claim);

        const row = new ActionRowBuilder<ButtonBuilder>().addComponents(closeButton, claimButton);

        const pingRole = staffRoleId ? `<@&${staffRoleId}>` : '';

        await ticketChannel.send({
            content: `${member.user} ${pingRole}`,
            embeds: [ticketEmbed],
            components: [row]
        });

        // Register in DB
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

/**
 * Lida com o botão de assumir ticket.
 */
export async function handleTicketClaim(
    interaction: any
): Promise<void> {
    const guildConfig = await getGuildConfig(interaction.guildId!);
    const member = interaction.member as GuildMember;

    // Check permissions
    const isStaff = member.permissions.has(PermissionFlagsBits.ManageMessages)
        || (guildConfig?.staff_role_id && member.roles.cache.has(guildConfig.staff_role_id));

    if (!isStaff) {
        await interaction.reply({ content: `${DEFAULT_EMOJIS.error} Apenas a equipe pode assumir tickets!`, ephemeral: true });
        return;
    }

    const channel = interaction.channel as TextChannel;

    await claimDbTicket(channel.id, member.id);

    const embed = new EmbedBuilder()
        .setColor(DEFAULT_COLORS.success)
        .setDescription(`${DEFAULT_EMOJIS.claim} **Ticket assumido por:** ${member.user}`);

    await interaction.reply({ embeds: [embed] });
    await channel.setTopic(`Assumido por: ${member.user.tag}`).catch(() => { });
}

/**
 * Gera o transcript e fecha o ticket.
 */
export async function closeTicketProcess(
    channel: TextChannel,
    guild: Guild,
    closedBy: GuildMember,
    categoryName: string
): Promise<void> {
    const messages = await channel.messages.fetch({ limit: 100 });
    const sortedMessages = [...messages.values()].reverse();

    let transcript = `TRANSCRIPT DO TICKET\n`;
    transcript += `Canal: ${channel.name}\n`;
    transcript += `Fechado por: ${closedBy.user.tag}\n`;
    transcript += `Data: ${new Date().toLocaleString('pt-BR')}\n`;
    transcript += `------------------------------------------------\n\n`;

    for (const msg of sortedMessages) {
        transcript += `[${msg.createdAt.toLocaleString('pt-BR')}] ${msg.author.tag}: ${msg.content || '[Anexo/Embed]'}\n`;
    }

    const guildConfig = await getGuildConfig(guild.id);

    // Send to logs channel if configured
    if (guildConfig?.logs_channel_id) {
        const logsChannel = guild.channels.cache.get(guildConfig.logs_channel_id) as TextChannel;
        if (logsChannel) {
            const buffer = Buffer.from(transcript, 'utf8');
            const attachment = new AttachmentBuilder(buffer, { name: `transcript-${channel.name}.txt` });

            const logEmbed = new EmbedBuilder()
                .setColor(DEFAULT_COLORS.info)
                .setTitle(`${DEFAULT_EMOJIS.log} Ticket Fechado`)
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
