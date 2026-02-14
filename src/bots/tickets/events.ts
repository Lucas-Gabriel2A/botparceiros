import { Client, Events, Interaction, TextChannel, GuildMember, PermissionFlagsBits, SlashCommandBuilder, ChannelType } from 'discord.js';
import { logger } from '../../shared/services';
import {
    sendTicketPanel,
    createTicketChannel,
    closeTicketProcess,
    handleTicketClaim,
    THEME
} from './tickets.service';
import {
    createTicketCategory
} from '../../shared/services';

export const TICKET_EVENTS = {
    name: 'Tickets',
    commands: [
        new SlashCommandBuilder()
            .setName('ticket-painel')
            .setDescription('🎫 Envia o painel de tickets para o canal atual')
            .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
        new SlashCommandBuilder()
            .setName('ticket-categoria')
            .setDescription('⚙️ Gerencia categorias de tickets')
            .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
            .addSubcommand(sub =>
                sub.setName('criar')
                    .setDescription('Cria uma nova categoria')
                    .addStringOption(opt => opt.setName('nome').setDescription('Nome da categoria').setRequired(true))
                    .addStringOption(opt => opt.setName('descricao').setDescription('Descrição').setRequired(true))
                    .addStringOption(opt => opt.setName('cor').setDescription('Cor Hex (ex: #FF0000)').setRequired(true))
            ),
        new SlashCommandBuilder()
            .setName('ticket-config')
            .setDescription('⚙️ Configurações do sistema de tickets')
            .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
            .addSubcommand(sub =>
                sub.setName('logs')
                    .setDescription('Define o canal de logs dos tickets')
                    .addChannelOption(opt =>
                        opt.setName('canal')
                            .setDescription('Canal para receber os transcripts')
                            .addChannelTypes(ChannelType.GuildText)
                            .setRequired(true)
                    )
            )
    ]
};

export function setupTicketEvents(client: Client) {
    logger.info('🎫 Módulo Tickets: Eventos inicializados');

    client.on(Events.InteractionCreate, async (interaction: Interaction) => {
        if (!interaction.isRepliable()) return;

        try {
            // 🎫 SELECT CATEGORY -> CREATE TICKET
            if (interaction.isStringSelectMenu() && interaction.customId === 'ticket_category_select') {
                const categoryId = interaction.values[0];
                await interaction.deferReply({ ephemeral: true });

                try {
                    const result = await createTicketChannel(interaction.guild!, interaction.member as GuildMember, categoryId);

                    if (result === "CATEGORY_NOT_FOUND") {
                        await interaction.editReply(`${THEME.emojis.error} Categoria não encontrada.`);
                    } else {
                        await interaction.editReply(`${THEME.emojis.success} Ticket criado: ${result}`);
                    }
                } catch (error) {
                    await interaction.editReply(`${THEME.emojis.error} Erro ao criar ticket.`);
                }
            }

            // 🔒 CLOSE TICKET
            if (interaction.isButton() && interaction.customId.startsWith('close_ticket_')) {
                const parts = interaction.customId.split('_');
                const categoryName = parts.slice(3).join('_');
                const member = interaction.member as GuildMember;

                await interaction.reply({ content: `${THEME.emojis.close} Fechando ticket em 5 segundos...` });

                setTimeout(async () => {
                    await closeTicketProcess(
                        interaction.channel as TextChannel,
                        interaction.guild!,
                        member,
                        categoryName
                    );
                }, 5000);
            }

            // 🙋‍♂️ CLAIM TICKET
            if (interaction.isButton() && interaction.customId === 'claim_ticket') {
                await handleTicketClaim(interaction);
            }

            // 🛠️ SLASH COMMANDS
            if (interaction.isChatInputCommand()) {
                const { commandName } = interaction;

                if (commandName === 'ticket-painel') {
                    if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
                        await interaction.reply({ content: 'Sem permissão.', ephemeral: true });
                        return;
                    }
                    await interaction.deferReply({ ephemeral: true });
                    await sendTicketPanel(interaction.channel as TextChannel, interaction.guildId!);
                    await interaction.editReply({ content: 'Painel enviado!' });
                }

                if (commandName === 'ticket-categoria') {
                    const subcommand = interaction.options.getSubcommand();

                    if (subcommand === 'criar') {
                        const name = interaction.options.getString('nome', true);
                        const desc = interaction.options.getString('descricao', true);
                        const cor = interaction.options.getString('cor', true);

                        const guild = interaction.guild!;
                        const { getTicketCategories, getUserPlan } = await import('../../shared/services');

                        // 1. Verificar Limite de Categorias (Free = 5)
                        const ownerId = guild.ownerId;
                        const ownerPlan = await getUserPlan(ownerId);
                        const currentCategories = await getTicketCategories(guild.id);

                        if (ownerPlan === 'free' && currentCategories.length >= 5) {
                            await interaction.reply({
                                content: `⚠️ **Limite Atingido!**\n\nNo plano Grátis, você pode criar apenas **5 categorias** de tickets.\nAtualmente você tem: ${currentCategories.length}.\n\nFaça upgrade para **Starter** ou superior para criar mais!`,
                                ephemeral: true
                            });
                            return;
                        }

                        await createTicketCategory(
                            `cat_${Date.now()}`,
                            interaction.guildId!,
                            name,
                            desc,
                            cor,
                            interaction.user.id
                        );
                        await interaction.reply({ content: `Categoria ${name} criada!`, ephemeral: true });
                    }
                }

                if (commandName === 'ticket-config') {
                    const subcommand = interaction.options.getSubcommand();

                    if (subcommand === 'logs') {
                        const channel = interaction.options.getChannel('canal', true);
                        const { upsertGuildConfig } = await import('../../shared/services');

                        await upsertGuildConfig(interaction.guildId!, {
                            ticket_logs_channel_id: channel.id
                        });

                        await interaction.reply({
                            content: `✅ Canal de logs de tickets definido para ${channel}. Transcripts serão enviados para lá ao fechar tickets.`,
                            ephemeral: true
                        });
                    }
                }
            }

        } catch (error) {
            logger.error('Erro em evento de tickets:', { error });
        }
    });
}
