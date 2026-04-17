/**
 * 🎫 BOT COREIA TICKETS - Sistema de Tickets com Categorias TypeScript
 * ═══════════════════════════════════════════════════════════════════════════
 */

import {
    Client,
    GatewayIntentBits,
    Partials,
    EmbedBuilder,
    PermissionFlagsBits,
    REST,
    Routes,
    TextChannel,
    GuildMember,
    SlashCommandBuilder
} from 'discord.js';

import {
    config,
    logger,
    testConnection,
    initializeSchema,
    createTicketCategory,
    getTicketCategories,
    updateTicketCategory,
    deleteTicketCategory
} from '../../shared/services';

import {
    sendTicketPanel,
    createTicketChannel,
    handleTicketClaim,
    closeTicketProcess,
    THEME
} from './tickets.service';



// ═══════════════════════════════════════════════════════════════════════════
// 🔐 VALIDAÇÃO
// ═══════════════════════════════════════════════════════════════════════════

config.validate([
    'DISCORD_TOKEN',
    'OWNER_ROLE_ID'
]);

const TOKEN = config.get('DISCORD_TOKEN');
const OWNER_ROLE_ID = config.get('OWNER_ROLE_ID');
const SEMI_OWNER_ROLE_ID = config.getOptional('SEMI_OWNER_ROLE_ID');

// ═══════════════════════════════════════════════════════════════════════════
// 🤖 CLIENT
// ═══════════════════════════════════════════════════════════════════════════

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ],
    partials: [Partials.Channel, Partials.Message]
});

// ═══════════════════════════════════════════════════════════════════════════
// 🔐 HELPER PERMISSÕES
// ═══════════════════════════════════════════════════════════════════════════

function hasAdminPermission(member: GuildMember): boolean {
    if (!member?.roles) return false;
    return member.roles.cache.has(OWNER_ROLE_ID) ||
        (SEMI_OWNER_ROLE_ID ? member.roles.cache.has(SEMI_OWNER_ROLE_ID) : false) ||
        member.permissions.has(PermissionFlagsBits.Administrator);
}

function generateCategoryId(): string {
    return `cat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// ═══════════════════════════════════════════════════════════════════════════
// 📝 SLASH COMMANDS
// ═══════════════════════════════════════════════════════════════════════════

const commands = [
    new SlashCommandBuilder()
        .setName('ticket-painel')
        .setDescription('Envia o painel de tickets no canal atual'),

    new SlashCommandBuilder()
        .setName('ticket-categoria')
        .setDescription('Gerenciar categorias de tickets')
        .addSubcommand(sub =>
            sub.setName('criar')
                .setDescription('Criar nova categoria de ticket')
                .addStringOption(opt =>
                    opt.setName('nome')
                        .setDescription('Nome da categoria')
                        .setRequired(true))
                .addStringOption(opt =>
                    opt.setName('descricao')
                        .setDescription('Descrição da categoria')
                        .setRequired(true))
                .addStringOption(opt =>
                    opt.setName('cor')
                        .setDescription('Cor em hexadecimal (ex: #7B68EE)')
                        .setRequired(true)))
        .addSubcommand(sub =>
            sub.setName('editar')
                .setDescription('Editar categoria existente')
                .addStringOption(opt =>
                    opt.setName('categoria')
                        .setDescription('ID da categoria para editar')
                        .setRequired(true)
                        .setAutocomplete(true))
                .addStringOption(opt =>
                    opt.setName('nome')
                        .setDescription('Novo nome da categoria'))
                .addStringOption(opt =>
                    opt.setName('descricao')
                        .setDescription('Nova descrição'))
                .addStringOption(opt =>
                    opt.setName('cor')
                        .setDescription('Nova cor em hexadecimal')))
        .addSubcommand(sub =>
            sub.setName('excluir')
                .setDescription('Excluir categoria de ticket')
                .addStringOption(opt =>
                    opt.setName('categoria')
                        .setDescription('ID da categoria para excluir')
                        .setRequired(true)
                        .setAutocomplete(true)))
        .addSubcommand(sub =>
            sub.setName('listar')
                .setDescription('Listar todas as categorias'))
];

// ═══════════════════════════════════════════════════════════════════════════
// 🎯 EVENTOS
// ═══════════════════════════════════════════════════════════════════════════

client.once('clientReady', async () => {
    logger.info(`🌌 COREBOT TICKETS BOT - ONLINE`);
    logger.info(`Bot: ${client.user?.tag}`);

    // Init DB
    try {
        await testConnection();
        await initializeSchema();
        logger.info('✅ Banco de dados conectado.');
    } catch (error) {
        logger.error('❌ Falha na conexão com BD', { error });
    }

    const rest = new REST({ version: '10' }).setToken(TOKEN);

    try {
        logger.info('🚀 Registrando comandos slash...');
        for (const guild of client.guilds.cache.values()) {
            await rest.put(
                Routes.applicationGuildCommands(client.user!.id, guild.id),
                { body: commands.map(cmd => cmd.toJSON()) }
            );
        }
        logger.info('✅ Comandos registrados!');
    } catch (error) {
        logger.error('Erro ao registrar comandos', { error });
    }
});

client.on('interactionCreate', async (interaction) => {
    try {
        // Autocomplete
        if (interaction.isAutocomplete()) {
            const focused = interaction.options.getFocused().toLowerCase();
            const guildId = interaction.guildId!;

            const categories = await getTicketCategories(guildId);

            const filtered = categories
                .filter(cat => cat.name.toLowerCase().includes(focused))
                .slice(0, 25)
                .map(cat => ({ name: cat.name, value: cat.id }));

            await interaction.respond(filtered);
            return;
        }

        // Select Menu (Criar Ticket)
        if (interaction.isStringSelectMenu() && interaction.customId === 'ticket_category_select') {
            await interaction.deferReply({ ephemeral: true });

            const categoryId = interaction.values[0];
            const result = await createTicketChannel(interaction.guild!, interaction.member as GuildMember, categoryId);

            if (typeof result === 'string') {
                if (result === 'CATEGORY_NOT_FOUND') {
                    await interaction.editReply(`${THEME.emojis.error} Categoria não encontrada.`);
                } else {
                    await interaction.editReply(`${THEME.emojis.warning} Ticket já aberto: ${result}`);
                }
            } else {
                await interaction.editReply(`${THEME.emojis.success} Ticket criado: ${result.toString()}`);
            }
            return;
        }

        // Buttons
        if (interaction.isButton()) {
            if (interaction.customId === 'claim_ticket') {
                await handleTicketClaim(interaction);
                return;
            }

            if (interaction.customId.startsWith('close_ticket_')) {
                const parts = interaction.customId.split('_');
                const categoryName = parts.slice(3).join('_');

                await closeTicketProcess(
                    interaction.channel as TextChannel,
                    interaction.guild!,
                    interaction.member as GuildMember,
                    categoryName
                );
                return;
            }
        }

        // Chat Input Commands
        if (interaction.isChatInputCommand()) {
            const { commandName } = interaction;
            const member = interaction.member as GuildMember;
            const guildId = interaction.guildId!;

            if (commandName === 'ticket-painel') {
                if (!hasAdminPermission(member)) {
                    await interaction.reply({ content: `${THEME.emojis.error} Sem permissão.`, ephemeral: true });
                    return;
                }
                await sendTicketPanel(interaction.channel as TextChannel, guildId);
                await interaction.reply({ content: `${THEME.emojis.success} Painel enviado!`, ephemeral: true });
            }

            if (commandName === 'ticket-categoria') {
                if (!hasAdminPermission(member)) {
                    await interaction.reply({ content: `${THEME.emojis.error} Sem permissão.`, ephemeral: true });
                    return;
                }

                const sub = interaction.options.getSubcommand();

                if (sub === 'criar') {
                    const nome = interaction.options.getString('nome', true);
                    const descricao = interaction.options.getString('descricao', true);
                    const cor = interaction.options.getString('cor', true);

                    if (!/^#[0-9A-Fa-f]{6}$/.test(cor)) {
                        await interaction.reply({ content: 'Cor inválida.', ephemeral: true });
                        return;
                    }

                    await createTicketCategory(generateCategoryId(), guildId, nome, descricao, cor, member.id);
                    await interaction.reply({
                        embeds: [new EmbedBuilder()
                            .setColor(THEME.colors.success)
                            .setTitle(`${THEME.emojis.success} Categoria Criada`)
                            .setDescription(`**${nome}** criada com sucesso.`)]
                        , ephemeral: true
                    });
                }

                if (sub === 'editar') {
                    const id = interaction.options.getString('categoria', true);
                    const nome = interaction.options.getString('nome');
                    const descricao = interaction.options.getString('descricao');
                    const cor = interaction.options.getString('cor');

                    const updates: any = {};
                    if (nome) updates.name = nome;
                    if (descricao) updates.description = descricao;
                    if (cor) updates.color = cor;
                    updates.updatedBy = member.id;

                    await updateTicketCategory(id, updates);
                    await interaction.reply({ content: `${THEME.emojis.edit} Categoria atualizada.`, ephemeral: true });
                }

                if (sub === 'excluir') {
                    const id = interaction.options.getString('categoria', true);
                    await deleteTicketCategory(id);
                    await interaction.reply({ content: `${THEME.emojis.delete} Categoria excluída.`, ephemeral: true });
                }

                if (sub === 'listar') {
                    const cats = await getTicketCategories(guildId);
                    if (!cats.length) {
                        await interaction.reply({ content: 'Nenhuma categoria.', ephemeral: true });
                        return;
                    }

                    const embed = new EmbedBuilder()
                        .setColor(THEME.colors.primary)
                        .setTitle('Categorias')
                        .setDescription(cats.map((c, i) => `${i + 1}. **${c.name}**`).join('\n'));

                    await interaction.reply({ embeds: [embed], ephemeral: true });
                }
            }
        }

    } catch (error) {
        logger.error('Erro no handler de interação', { error });
        if (interaction.isRepliable() && !interaction.replied) {
            await interaction.reply({ content: 'Erro interno.', ephemeral: true }).catch(() => { });
        }
    }
});

client.login(TOKEN).catch(error => {
    logger.error('Erro ao conectar bot de tickets', { error });
});
