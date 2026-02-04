"use strict";
/**
 * 🎫 BOT NEXSTAR TICKETS - Sistema de Tickets com Categorias TypeScript
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Migrado de botnexstartickets.js - Sistema completo de tickets galáctico
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const services_1 = require("../../shared/services");
let dbConnected = false;
// ═══════════════════════════════════════════════════════════════════════════
// 🔐 VALIDAÇÃO
// ═══════════════════════════════════════════════════════════════════════════
services_1.config.validate([
    'DISCORD_TOKEN',
    'STAFF_ROLE_ID',
    'TICKETS_CATEGORY_ID',
    'OWNER_ROLE_ID'
]);
const TOKEN = services_1.config.get('DISCORD_TOKEN');
const STAFF_ROLE_ID = services_1.config.get('STAFF_ROLE_ID');
const TICKETS_CATEGORY_ID = services_1.config.get('TICKETS_CATEGORY_ID');
const OWNER_ROLE_ID = services_1.config.get('OWNER_ROLE_ID');
const SEMI_OWNER_ROLE_ID = services_1.config.getOptional('SEMI_OWNER_ROLE_ID');
const LOGS_TICKETS = services_1.config.getOptional('LOGS_TICKETS');
// ═══════════════════════════════════════════════════════════════════════════
// 🎨 CONSTANTES
// ═══════════════════════════════════════════════════════════════════════════
const THEME = {
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
        warning: '⚠️'
    }
};
const NEXSTAR_BANNER = 'https://i.ibb.co/TDRDH2kq/nexstar.jpg';
const CATEGORIES_FILE = path.join(process.cwd(), 'ticket_categories.json');
// ═══════════════════════════════════════════════════════════════════════════
// 🤖 CLIENT
// ═══════════════════════════════════════════════════════════════════════════
const client = new discord_js_1.Client({
    intents: [
        discord_js_1.GatewayIntentBits.Guilds,
        discord_js_1.GatewayIntentBits.GuildMessages,
        discord_js_1.GatewayIntentBits.MessageContent
    ],
    partials: [discord_js_1.Partials.Channel, discord_js_1.Partials.Message]
});
// ═══════════════════════════════════════════════════════════════════════════
// 📁 GERENCIAMENTO DE CATEGORIAS
// ═══════════════════════════════════════════════════════════════════════════
function loadCategories() {
    try {
        if (fs.existsSync(CATEGORIES_FILE)) {
            const data = fs.readFileSync(CATEGORIES_FILE, 'utf8');
            return JSON.parse(data);
        }
    }
    catch (error) {
        services_1.logger.error('Erro ao carregar categorias');
    }
    return [];
}
function saveCategories(categories) {
    try {
        fs.writeFileSync(CATEGORIES_FILE, JSON.stringify(categories, null, 2), 'utf8');
        return true;
    }
    catch (error) {
        services_1.logger.error('Erro ao salvar categorias');
        return false;
    }
}
function generateCategoryId() {
    return `cat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
// ═══════════════════════════════════════════════════════════════════════════
// 🔐 VERIFICAÇÃO DE PERMISSÕES
// ═══════════════════════════════════════════════════════════════════════════
function hasAdminPermission(member) {
    if (member.roles.cache.has(OWNER_ROLE_ID))
        return true;
    if (SEMI_OWNER_ROLE_ID && member.roles.cache.has(SEMI_OWNER_ROLE_ID))
        return true;
    return false;
}
function hasStaffPermission(member) {
    return member.roles.cache.has(STAFF_ROLE_ID) || hasAdminPermission(member);
}
// ═══════════════════════════════════════════════════════════════════════════
// 📜 SISTEMA DE LOGS/TRANSCRIPT
// ═══════════════════════════════════════════════════════════════════════════
async function createTranscript(channel, closedBy) {
    try {
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
    catch (error) {
        services_1.logger.error('Erro ao criar transcript');
        return null;
    }
}
async function sendTranscriptToLogs(guild, transcript, ticketInfo) {
    if (!LOGS_TICKETS)
        return;
    try {
        const logsChannel = await guild.channels.fetch(LOGS_TICKETS);
        if (!logsChannel)
            return;
        const buffer = Buffer.from(transcript, 'utf8');
        const logEmbed = new discord_js_1.EmbedBuilder()
            .setColor(THEME.colors.info)
            .setTitle(`${THEME.emojis.log} Ticket Fechado`)
            .setDescription(`
${THEME.emojis.ticket} **Ticket:** ${ticketInfo.channelName}
${THEME.emojis.user} **Aberto por:** <@${ticketInfo.userId}>
${THEME.emojis.staff} **Fechado por:** <@${ticketInfo.closedById}>
${THEME.emojis.planet} **Categoria:** ${ticketInfo.category}
            `)
            .setTimestamp()
            .setFooter({ text: '🌌 Nexstar Tickets System' });
        await logsChannel.send({
            embeds: [logEmbed],
            files: [{
                    attachment: buffer,
                    name: `transcript-${ticketInfo.channelName}-${Date.now()}.txt`
                }]
        });
    }
    catch (error) {
        services_1.logger.error('Erro ao enviar transcript para logs');
    }
}
// ═══════════════════════════════════════════════════════════════════════════
// 🎫 SISTEMA DE TICKETS
// ═══════════════════════════════════════════════════════════════════════════
async function sendTicketPanel(channel) {
    const categories = loadCategories();
    const embed = new discord_js_1.EmbedBuilder()
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
            value: 'Ainda não há categorias configuradas. Um administrador deve criar categorias primeiro.'
        });
        await channel.send({ embeds: [embed] });
        return;
    }
    const options = categories.map(cat => ({
        label: cat.name,
        description: cat.description.substring(0, 100),
        value: cat.id,
        emoji: THEME.emojis.planet
    }));
    const selectMenu = new discord_js_1.StringSelectMenuBuilder()
        .setCustomId('ticket_category_select')
        .setPlaceholder(`${THEME.emojis.ticket} Selecione uma categoria...`)
        .addOptions(options);
    const row = new discord_js_1.ActionRowBuilder().addComponents(selectMenu);
    await channel.send({ embeds: [embed], components: [row] });
}
async function createTicket(interaction, categoryId) {
    const categories = loadCategories();
    const category = categories.find(c => c.id === categoryId);
    if (!category) {
        await interaction.reply({
            content: `${THEME.emojis.error} Categoria não encontrada!`,
            ephemeral: true
        });
        return;
    }
    const guild = interaction.guild;
    const member = interaction.member;
    const existingTicket = guild.channels.cache.find(ch => ch.name === `ticket-${member.user.username.toLowerCase().replace(/[^a-z0-9]/g, '')}`);
    if (existingTicket) {
        await interaction.reply({
            content: `${THEME.emojis.warning} Você já possui um ticket aberto: ${existingTicket}`,
            ephemeral: true
        });
        return;
    }
    await interaction.deferReply({ ephemeral: true });
    try {
        const ticketChannel = await guild.channels.create({
            name: `ticket-${member.user.username.toLowerCase().replace(/[^a-z0-9]/g, '')}`,
            type: discord_js_1.ChannelType.GuildText,
            parent: TICKETS_CATEGORY_ID,
            permissionOverwrites: [
                { id: guild.id, deny: [discord_js_1.PermissionFlagsBits.ViewChannel] },
                { id: member.id, allow: [discord_js_1.PermissionFlagsBits.ViewChannel, discord_js_1.PermissionFlagsBits.SendMessages, discord_js_1.PermissionFlagsBits.ReadMessageHistory] },
                { id: STAFF_ROLE_ID, allow: [discord_js_1.PermissionFlagsBits.ViewChannel, discord_js_1.PermissionFlagsBits.SendMessages, discord_js_1.PermissionFlagsBits.ReadMessageHistory, discord_js_1.PermissionFlagsBits.ManageMessages] }
            ]
        });
        const ticketEmbed = new discord_js_1.EmbedBuilder()
            .setColor(parseInt(category.color.replace('#', ''), 16))
            .setTitle(`${THEME.emojis.ticket} Ticket Aberto`)
            .setDescription(`
${THEME.emojis.star} **Olá, ${member.user}!**

Seu ticket foi criado com sucesso na categoria **${category.name}**.

${THEME.emojis.planet} **Descrição da Categoria:**
${category.description}

${THEME.emojis.rocket} Nossa equipe responderá em breve!
            `)
            .addFields({ name: `${THEME.emojis.user} Aberto por`, value: `${member.user.tag}`, inline: true }, { name: `${THEME.emojis.galaxy} Categoria`, value: category.name, inline: true })
            .setTimestamp()
            .setFooter({ text: '🌌 Nexstar Tickets System' });
        const closeButton = new discord_js_1.ButtonBuilder()
            .setCustomId(`close_ticket_${member.id}_${category.name}`)
            .setLabel('Fechar Ticket')
            .setStyle(discord_js_1.ButtonStyle.Danger)
            .setEmoji(THEME.emojis.close);
        const row = new discord_js_1.ActionRowBuilder().addComponents(closeButton);
        await ticketChannel.send({
            content: `${member.user} | <@&${STAFF_ROLE_ID}>`,
            embeds: [ticketEmbed],
            components: [row]
        });
        // Registrar ticket no banco de dados
        if (dbConnected) {
            try {
                await (0, services_1.createTicket)(guild.id, ticketChannel.id, member.id, category.name);
                await (0, services_1.logAudit)(guild.id, member.id, 'TICKET_CREATED', ticketChannel.id, {
                    category: category.name,
                    channel_name: ticketChannel.name
                });
            }
            catch (error) {
                services_1.logger.warn('Erro ao registrar ticket no DB');
            }
        }
        await interaction.editReply({
            content: `${THEME.emojis.success} Seu ticket foi criado: ${ticketChannel}`
        });
    }
    catch (error) {
        services_1.logger.error('Erro ao criar ticket');
        await interaction.editReply({
            content: `${THEME.emojis.error} Erro ao criar o ticket. Tente novamente.`
        });
    }
}
async function closeTicket(interaction, userId, categoryName) {
    const channel = interaction.channel;
    const member = interaction.member;
    if (!hasStaffPermission(member) && member.id !== userId) {
        await interaction.reply({
            content: `${THEME.emojis.error} Você não tem permissão para fechar este ticket!`,
            ephemeral: true
        });
        return;
    }
    await interaction.deferReply();
    const transcript = await createTranscript(channel, member);
    if (transcript) {
        await sendTranscriptToLogs(interaction.guild, transcript, {
            channelName: channel.name,
            userId: userId,
            closedById: member.id,
            category: categoryName
        });
    }
    const closeEmbed = new discord_js_1.EmbedBuilder()
        .setColor(THEME.colors.danger)
        .setTitle(`${THEME.emojis.close} Ticket Fechado`)
        .setDescription(`
Este ticket será deletado em **5 segundos**.

${THEME.emojis.log} O transcript foi salvo no canal de logs.
        `)
        .setTimestamp();
    await interaction.editReply({ embeds: [closeEmbed] });
    setTimeout(async () => {
        try {
            // Fechar ticket no banco antes de deletar
            if (dbConnected) {
                await (0, services_1.closeTicket)(channel.id);
                await (0, services_1.logAudit)(interaction.guild.id, member.id, 'TICKET_CLOSED', channel.id, {
                    category: categoryName,
                    original_user_id: userId
                });
            }
            await channel.delete();
        }
        catch (error) {
            services_1.logger.error('Erro ao deletar canal');
        }
    }, 5000);
}
// ═══════════════════════════════════════════════════════════════════════════
// 📝 SLASH COMMANDS
// ═══════════════════════════════════════════════════════════════════════════
const commands = [
    new discord_js_1.SlashCommandBuilder()
        .setName('ticket-painel')
        .setDescription('Envia o painel de tickets no canal atual'),
    new discord_js_1.SlashCommandBuilder()
        .setName('ticket-categoria')
        .setDescription('Gerenciar categorias de tickets')
        .addSubcommand(sub => sub.setName('criar')
        .setDescription('Criar nova categoria de ticket')
        .addStringOption(opt => opt.setName('nome')
        .setDescription('Nome da categoria')
        .setRequired(true))
        .addStringOption(opt => opt.setName('descricao')
        .setDescription('Descrição da categoria')
        .setRequired(true))
        .addStringOption(opt => opt.setName('cor')
        .setDescription('Cor em hexadecimal (ex: #7B68EE)')
        .setRequired(true)))
        .addSubcommand(sub => sub.setName('editar')
        .setDescription('Editar categoria existente')
        .addStringOption(opt => opt.setName('categoria')
        .setDescription('ID da categoria para editar')
        .setRequired(true)
        .setAutocomplete(true))
        .addStringOption(opt => opt.setName('nome')
        .setDescription('Novo nome da categoria'))
        .addStringOption(opt => opt.setName('descricao')
        .setDescription('Nova descrição'))
        .addStringOption(opt => opt.setName('cor')
        .setDescription('Nova cor em hexadecimal')))
        .addSubcommand(sub => sub.setName('excluir')
        .setDescription('Excluir categoria de ticket')
        .addStringOption(opt => opt.setName('categoria')
        .setDescription('ID da categoria para excluir')
        .setRequired(true)
        .setAutocomplete(true)))
        .addSubcommand(sub => sub.setName('listar')
        .setDescription('Listar todas as categorias'))
];
// ═══════════════════════════════════════════════════════════════════════════
// 🎯 EVENTOS
// ═══════════════════════════════════════════════════════════════════════════
client.once('ready', async () => {
    services_1.logger.info(`🌌 NEXSTAR TICKETS BOT - ONLINE`);
    services_1.logger.info(`Bot: ${client.user?.tag}`);
    services_1.logger.info(`Servidores: ${client.guilds.cache.size}`);
    const rest = new discord_js_1.REST({ version: '10' }).setToken(TOKEN);
    try {
        services_1.logger.info('🚀 Registrando comandos slash...');
        for (const guild of client.guilds.cache.values()) {
            await rest.put(discord_js_1.Routes.applicationGuildCommands(client.user.id, guild.id), { body: commands.map(cmd => cmd.toJSON()) });
        }
        services_1.logger.info('✅ Comandos registrados com sucesso!');
    }
    catch (error) {
        services_1.logger.error('Erro ao registrar comandos');
    }
    if (!fs.existsSync(CATEGORIES_FILE)) {
        saveCategories([]);
        services_1.logger.info('📁 Arquivo de categorias criado.');
    }
});
client.on('interactionCreate', async (interaction) => {
    try {
        // Autocomplete para categorias
        if (interaction.isAutocomplete()) {
            const categories = loadCategories();
            const focused = interaction.options.getFocused().toLowerCase();
            const filtered = categories
                .filter(cat => cat.name.toLowerCase().includes(focused))
                .slice(0, 25)
                .map(cat => ({ name: cat.name, value: cat.id }));
            await interaction.respond(filtered);
            return;
        }
        // Seleção de categoria para abrir ticket
        if (interaction.isStringSelectMenu() && interaction.customId === 'ticket_category_select') {
            const categoryId = interaction.values[0];
            await createTicket(interaction, categoryId);
            return;
        }
        // Botão de fechar ticket
        if (interaction.isButton() && interaction.customId.startsWith('close_ticket_')) {
            const parts = interaction.customId.split('_');
            const userId = parts[2];
            const categoryName = parts.slice(3).join('_');
            await closeTicket(interaction, userId, categoryName);
            return;
        }
        // Slash Commands
        if (interaction.isChatInputCommand()) {
            const { commandName } = interaction;
            const member = interaction.member;
            if (commandName === 'ticket-painel') {
                if (!hasAdminPermission(member)) {
                    await interaction.reply({
                        content: `${THEME.emojis.error} Apenas o Dono ou Semidono podem usar este comando!`,
                        ephemeral: true
                    });
                    return;
                }
                await sendTicketPanel(interaction.channel);
                await interaction.reply({
                    content: `${THEME.emojis.success} Painel de tickets enviado!`,
                    ephemeral: true
                });
                return;
            }
            if (commandName === 'ticket-categoria') {
                if (!hasAdminPermission(member)) {
                    await interaction.reply({
                        content: `${THEME.emojis.error} Apenas o Dono ou Semidono podem gerenciar categorias!`,
                        ephemeral: true
                    });
                    return;
                }
                const subcommand = interaction.options.getSubcommand();
                if (subcommand === 'criar') {
                    const nome = interaction.options.getString('nome', true);
                    const descricao = interaction.options.getString('descricao', true);
                    const cor = interaction.options.getString('cor', true);
                    if (!/^#[0-9A-Fa-f]{6}$/.test(cor)) {
                        await interaction.reply({
                            content: `${THEME.emojis.error} Cor inválida! Use formato hexadecimal (ex: #7B68EE)`,
                            ephemeral: true
                        });
                        return;
                    }
                    const categories = loadCategories();
                    const newCategory = {
                        id: generateCategoryId(),
                        name: nome,
                        description: descricao,
                        color: cor,
                        createdAt: new Date().toISOString(),
                        createdBy: interaction.user.id
                    };
                    categories.push(newCategory);
                    saveCategories(categories);
                    const embed = new discord_js_1.EmbedBuilder()
                        .setColor(parseInt(cor.replace('#', ''), 16))
                        .setTitle(`${THEME.emojis.success} Categoria Criada`)
                        .addFields({ name: `${THEME.emojis.planet} Nome`, value: nome, inline: true }, { name: `${THEME.emojis.star} Cor`, value: cor, inline: true }, { name: `${THEME.emojis.galaxy} Descrição`, value: descricao })
                        .setTimestamp();
                    await interaction.reply({ embeds: [embed], ephemeral: true });
                    return;
                }
                if (subcommand === 'editar') {
                    const categoryId = interaction.options.getString('categoria', true);
                    const nome = interaction.options.getString('nome');
                    const descricao = interaction.options.getString('descricao');
                    const cor = interaction.options.getString('cor');
                    const categories = loadCategories();
                    const categoryIndex = categories.findIndex(c => c.id === categoryId);
                    if (categoryIndex === -1) {
                        await interaction.reply({
                            content: `${THEME.emojis.error} Categoria não encontrada!`,
                            ephemeral: true
                        });
                        return;
                    }
                    if (cor && !/^#[0-9A-Fa-f]{6}$/.test(cor)) {
                        await interaction.reply({
                            content: `${THEME.emojis.error} Cor inválida! Use formato hexadecimal (ex: #7B68EE)`,
                            ephemeral: true
                        });
                        return;
                    }
                    if (nome)
                        categories[categoryIndex].name = nome;
                    if (descricao)
                        categories[categoryIndex].description = descricao;
                    if (cor)
                        categories[categoryIndex].color = cor;
                    categories[categoryIndex].updatedAt = new Date().toISOString();
                    categories[categoryIndex].updatedBy = interaction.user.id;
                    saveCategories(categories);
                    const embed = new discord_js_1.EmbedBuilder()
                        .setColor(THEME.colors.success)
                        .setTitle(`${THEME.emojis.edit} Categoria Editada`)
                        .addFields({ name: `${THEME.emojis.planet} Nome`, value: categories[categoryIndex].name, inline: true }, { name: `${THEME.emojis.star} Cor`, value: categories[categoryIndex].color, inline: true }, { name: `${THEME.emojis.galaxy} Descrição`, value: categories[categoryIndex].description })
                        .setTimestamp();
                    await interaction.reply({ embeds: [embed], ephemeral: true });
                    return;
                }
                if (subcommand === 'excluir') {
                    const categoryId = interaction.options.getString('categoria', true);
                    const categories = loadCategories();
                    const categoryIndex = categories.findIndex(c => c.id === categoryId);
                    if (categoryIndex === -1) {
                        await interaction.reply({
                            content: `${THEME.emojis.error} Categoria não encontrada!`,
                            ephemeral: true
                        });
                        return;
                    }
                    const deletedCategory = categories.splice(categoryIndex, 1)[0];
                    saveCategories(categories);
                    const embed = new discord_js_1.EmbedBuilder()
                        .setColor(THEME.colors.danger)
                        .setTitle(`${THEME.emojis.delete} Categoria Excluída`)
                        .setDescription(`A categoria **${deletedCategory.name}** foi excluída com sucesso.`)
                        .setTimestamp();
                    await interaction.reply({ embeds: [embed], ephemeral: true });
                    return;
                }
                if (subcommand === 'listar') {
                    const categories = loadCategories();
                    if (categories.length === 0) {
                        await interaction.reply({
                            content: `${THEME.emojis.warning} Nenhuma categoria cadastrada!`,
                            ephemeral: true
                        });
                        return;
                    }
                    const embed = new discord_js_1.EmbedBuilder()
                        .setColor(THEME.colors.primary)
                        .setTitle(`${THEME.emojis.list} Categorias de Tickets`)
                        .setDescription(categories.map((cat, i) => `**${i + 1}.** ${THEME.emojis.planet} **${cat.name}**\n` +
                        `   ${THEME.emojis.star} Cor: \`${cat.color}\`\n` +
                        `   ${THEME.emojis.galaxy} ${cat.description}\n`).join('\n'))
                        .setFooter({ text: `Total: ${categories.length} categorias` })
                        .setTimestamp();
                    await interaction.reply({ embeds: [embed], ephemeral: true });
                    return;
                }
            }
        }
    }
    catch (error) {
        services_1.logger.error('Erro na interação');
        if (interaction.isRepliable()) {
            const replied = interaction.replied || interaction.deferred;
            const content = `${THEME.emojis.error} Ocorreu um erro ao processar sua solicitação.`;
            if (replied) {
                await interaction.followUp({ content, ephemeral: true });
            }
            else {
                await interaction.reply({ content, ephemeral: true });
            }
        }
    }
});
// ═══════════════════════════════════════════════════════════════════════════
// 🚀 START
// ═══════════════════════════════════════════════════════════════════════════
client.once('ready', async () => {
    services_1.logger.info(`✨ Bot Tickets ${client.user?.tag} está online!`);
    try {
        const connected = await (0, services_1.testConnection)();
        if (connected) {
            await (0, services_1.initializeSchema)();
            dbConnected = true;
            services_1.logger.info('💾 Database PostgreSQL conectado!');
        }
    }
    catch (error) {
        services_1.logger.warn('⚠️ Database não disponível, usando apenas JSON local');
    }
});
client.login(TOKEN).catch(error => {
    services_1.logger.error('Erro ao fazer login:', { error });
    process.exit(1);
});
process.on('SIGINT', async () => {
    services_1.logger.info('Desligando Nexstar Tickets...');
    await (0, services_1.closePool)();
    client.destroy();
    process.exit(0);
});
process.on('unhandledRejection', (error) => {
    services_1.logger.error('Erro não tratado:', { error });
});
//# sourceMappingURL=index.js.map