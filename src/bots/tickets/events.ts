import { Client, Events, Interaction, TextChannel, GuildMember, PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
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
            }

        } catch (error) {
            logger.error('Erro em evento de tickets:', { error });
        }
    });
}
