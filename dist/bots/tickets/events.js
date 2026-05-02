"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TICKET_EVENTS = void 0;
exports.setupTicketEvents = setupTicketEvents;
const discord_js_1 = require("discord.js");
const services_1 = require("../../shared/services");
const tickets_service_1 = require("./tickets.service");
exports.TICKET_EVENTS = {
    name: 'Tickets',
    commands: [
        new discord_js_1.SlashCommandBuilder()
            .setName('ticket-painel')
            .setDescription('🎫 Envia o painel de tickets para o canal atual')
            .setDefaultMemberPermissions(discord_js_1.PermissionFlagsBits.Administrator)
    ]
};
function setupTicketEvents(client) {
    services_1.logger.info('🎫 Módulo Tickets: Eventos inicializados');
    client.on(discord_js_1.Events.InteractionCreate, async (interaction) => {
        if (!interaction.isRepliable())
            return;
        try {
            // 🎫 SELECT CATEGORY -> CREATE TICKET
            if (interaction.isStringSelectMenu() && interaction.customId === 'ticket_category_select') {
                const categoryId = interaction.values[0];
                await interaction.deferReply({ ephemeral: true });
                try {
                    const result = await (0, tickets_service_1.createTicketChannel)(interaction.guild, interaction.member, categoryId);
                    if (result === "CATEGORY_NOT_FOUND") {
                        await interaction.editReply(`${tickets_service_1.THEME.emojis.error} Categoria não encontrada.`);
                    }
                    else {
                        await interaction.editReply(`${tickets_service_1.THEME.emojis.success} Ticket criado: ${result}`);
                    }
                }
                catch (error) {
                    await interaction.editReply(`${tickets_service_1.THEME.emojis.error} Erro ao criar ticket.`);
                }
            }
            // 🔒 CLOSE TICKET
            if (interaction.isButton() && interaction.customId.startsWith('close_ticket_')) {
                const parts = interaction.customId.split('_');
                const categoryName = parts.slice(3).join('_');
                const member = interaction.member;
                await interaction.reply({ content: `${tickets_service_1.THEME.emojis.close} Fechando ticket em 5 segundos...` });
                setTimeout(async () => {
                    await (0, tickets_service_1.closeTicketProcess)(interaction.channel, interaction.guild, member, categoryName);
                }, 5000);
            }
            // 🙋‍♂️ CLAIM TICKET
            if (interaction.isButton() && interaction.customId === 'claim_ticket') {
                await (0, tickets_service_1.handleTicketClaim)(interaction);
            }
            // 🛠️ SLASH COMMANDS
            if (interaction.isChatInputCommand()) {
                const { commandName } = interaction;
                if (commandName === 'ticket-painel') {
                    if (!interaction.memberPermissions?.has(discord_js_1.PermissionFlagsBits.Administrator)) {
                        await interaction.reply({ content: 'Sem permissão.', ephemeral: true });
                        return;
                    }
                    await interaction.deferReply({ ephemeral: true });
                    await (0, tickets_service_1.sendTicketPanel)(interaction.channel, interaction.guildId);
                    await interaction.editReply({ content: 'Painel enviado!' });
                }
            }
        }
        catch (error) {
            services_1.logger.error('Erro em evento de tickets:', { error });
        }
    });
}
//# sourceMappingURL=events.js.map