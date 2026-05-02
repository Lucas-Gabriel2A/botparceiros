"use strict";
/**
 * 🎫 BOT COREIA TICKETS - Sistema de Tickets com Categorias TypeScript
 * ═══════════════════════════════════════════════════════════════════════════
 */
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const services_1 = require("../../shared/services");
const tickets_service_1 = require("./tickets.service");
// ═══════════════════════════════════════════════════════════════════════════
// 🔐 VALIDAÇÃO
// ═══════════════════════════════════════════════════════════════════════════
services_1.config.validate([
    'DISCORD_TOKEN',
    'OWNER_ROLE_ID'
]);
const TOKEN = services_1.config.get('DISCORD_TOKEN');
const OWNER_ROLE_ID = services_1.config.get('OWNER_ROLE_ID');
const SEMI_OWNER_ROLE_ID = services_1.config.getOptional('SEMI_OWNER_ROLE_ID');
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
// 🔐 HELPER PERMISSÕES
// ═══════════════════════════════════════════════════════════════════════════
function hasAdminPermission(member) {
    if (!member?.roles)
        return false;
    return member.roles.cache.has(OWNER_ROLE_ID) ||
        (SEMI_OWNER_ROLE_ID ? member.roles.cache.has(SEMI_OWNER_ROLE_ID) : false) ||
        member.permissions.has(discord_js_1.PermissionFlagsBits.Administrator);
}
function _generateCategoryId() {
    return `cat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
// ═══════════════════════════════════════════════════════════════════════════
// 📝 SLASH COMMANDS
// ═══════════════════════════════════════════════════════════════════════════
const commands = [
    new discord_js_1.SlashCommandBuilder()
        .setName('ticket-painel')
        .setDescription('Envia o painel de tickets no canal atual'),
];
// ═══════════════════════════════════════════════════════════════════════════
// 🎯 EVENTOS
// ═══════════════════════════════════════════════════════════════════════════
client.once('clientReady', async () => {
    services_1.logger.info(`🌌 COREBOT TICKETS BOT - ONLINE`);
    services_1.logger.info(`Bot: ${client.user?.tag}`);
    // Init DB
    try {
        await (0, services_1.testConnection)();
        await (0, services_1.initializeSchema)();
        services_1.logger.info('✅ Banco de dados conectado.');
    }
    catch (error) {
        services_1.logger.error('❌ Falha na conexão com BD', { error });
    }
    const rest = new discord_js_1.REST({ version: '10' }).setToken(TOKEN);
    try {
        services_1.logger.info('🚀 Registrando comandos slash...');
        for (const guild of client.guilds.cache.values()) {
            await rest.put(discord_js_1.Routes.applicationGuildCommands(client.user.id, guild.id), { body: commands.map(cmd => cmd.toJSON()) });
        }
        services_1.logger.info('✅ Comandos registrados!');
    }
    catch (error) {
        services_1.logger.error('Erro ao registrar comandos', { error });
    }
});
client.on('interactionCreate', async (interaction) => {
    try {
        // Autocomplete
        if (interaction.isAutocomplete()) {
            const focused = interaction.options.getFocused().toLowerCase();
            const guildId = interaction.guildId;
            const categories = await (0, services_1.getTicketCategories)(guildId);
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
            const result = await (0, tickets_service_1.createTicketChannel)(interaction.guild, interaction.member, categoryId);
            if (typeof result === 'string') {
                if (result === 'CATEGORY_NOT_FOUND') {
                    await interaction.editReply(`${tickets_service_1.THEME.emojis.error} Categoria não encontrada.`);
                }
                else {
                    await interaction.editReply(`${tickets_service_1.THEME.emojis.warning} Ticket já aberto: ${result}`);
                }
            }
            else {
                await interaction.editReply(`${tickets_service_1.THEME.emojis.success} Ticket criado: ${result.toString()}`);
            }
            return;
        }
        // Buttons
        if (interaction.isButton()) {
            if (interaction.customId === 'claim_ticket') {
                await (0, tickets_service_1.handleTicketClaim)(interaction);
                return;
            }
            if (interaction.customId.startsWith('close_ticket_')) {
                const parts = interaction.customId.split('_');
                const categoryName = parts.slice(3).join('_');
                await (0, tickets_service_1.closeTicketProcess)(interaction.channel, interaction.guild, interaction.member, categoryName);
                return;
            }
        }
        // Chat Input Commands
        if (interaction.isChatInputCommand()) {
            const { commandName } = interaction;
            const member = interaction.member;
            const guildId = interaction.guildId;
            if (commandName === 'ticket-painel') {
                if (!hasAdminPermission(member)) {
                    await interaction.reply({ content: `${tickets_service_1.THEME.emojis.error} Sem permissão.`, ephemeral: true });
                    return;
                }
                await (0, tickets_service_1.sendTicketPanel)(interaction.channel, guildId);
                await interaction.reply({ content: `${tickets_service_1.THEME.emojis.success} Painel enviado!`, ephemeral: true });
            }
        }
    }
    catch (error) {
        services_1.logger.error('Erro no handler de interação', { error });
        if (interaction.isRepliable() && !interaction.replied) {
            await interaction.reply({ content: 'Erro interno.', ephemeral: true }).catch(() => { });
        }
    }
});
client.login(TOKEN).catch(error => {
    services_1.logger.error('Erro ao conectar bot de tickets', { error });
});
//# sourceMappingURL=index.js.map