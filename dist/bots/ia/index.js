"use strict";
/**
 * 🤖 NEXSTAR IA - BOT PRINCIPAL (TypeScript)
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Versão modularizada e tipada do bot de IA.
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
const path = __importStar(require("path"));
// Services & Handlers
const services_1 = require("../../shared/services");
const handlers_1 = require("../../shared/handlers");
// ═══════════════════════════════════════════════════════════════════════════
// 🔐 VALIDAÇÃO DE AMBIENTE
// ═══════════════════════════════════════════════════════════════════════════
services_1.config.validate([
    'DISCORD_TOKEN_AGENTE_IA',
    'OPENAI_API_KEY',
    'OWNER_ROLE_ID'
]);
const iaConfig = services_1.config.getIAConfig();
if (!services_1.config.isValidDiscordToken(iaConfig.token)) {
    services_1.logger.error('Token Discord inválido!');
    process.exit(1);
}
// ═══════════════════════════════════════════════════════════════════════════
// 🤖 INICIALIZAÇÃO DO CLIENT
// ═══════════════════════════════════════════════════════════════════════════
const client = new discord_js_1.Client({
    intents: [
        discord_js_1.GatewayIntentBits.Guilds,
        discord_js_1.GatewayIntentBits.GuildMessages,
        discord_js_1.GatewayIntentBits.GuildMembers,
        discord_js_1.GatewayIntentBits.MessageContent,
        discord_js_1.GatewayIntentBits.GuildVoiceStates,
        discord_js_1.GatewayIntentBits.DirectMessages
    ],
    partials: [discord_js_1.Partials.Channel, discord_js_1.Partials.Message]
});
// ═══════════════════════════════════════════════════════════════════════════
// 📋 ADMIN PROMPT
// ═══════════════════════════════════════════════════════════════════════════
const ADMIN_PROMPT = `Você é um parser de comandos do Discord. Extraia ação e parâmetros do comando.

AÇÕES DISPONÍVEIS:
- timeout, kick, ban, unban, warn, clear
- create_category, create_channel, delete_channel, rename_channel
- slowmode, lock_channel, unlock_channel
- give_role, remove_role, create_role
- server_info, user_info, announce, embed

Retorne JSON: {"action": "nome_acao", "params": {...}}

EXEMPLOS:
"limpe 10 mensagens" → {"action":"clear","params":{"count":10}}
"dê timeout de 5min em @user" → {"action":"timeout","params":{"duration":5,"targetUser":"@user"}}
"anuncie em #geral: teste" → {"action":"announce","params":{"channelName":"geral","message":"teste"}}`;
// ═══════════════════════════════════════════════════════════════════════════
// 🔐 VERIFICAÇÃO DE PERMISSÃO
// ═══════════════════════════════════════════════════════════════════════════
function isAuthorized(member) {
    if (!member)
        return false;
    const ownerRoleId = iaConfig.ownerRoleId;
    const semiOwnerRoleId = iaConfig.semiOwnerRoleId;
    return (member.roles.cache.has(ownerRoleId || '') ||
        member.roles.cache.has(semiOwnerRoleId || '') ||
        member.permissions.has('Administrator'));
}
// ═══════════════════════════════════════════════════════════════════════════
// 📨 MESSAGE HANDLER
// ═══════════════════════════════════════════════════════════════════════════
client.on('messageCreate', async (message) => {
    if (message.author.bot)
        return;
    const content = message.content.toLowerCase();
    // Comandos admin via IA
    const isAdminPrefix = content.startsWith('ia,') || content.startsWith('ia ');
    const isMention = message.mentions.users.has(client.user?.id || '');
    if ((isAdminPrefix || isMention) && message.guild) {
        if (!isAuthorized(message.member)) {
            await message.reply('❌ Você não tem permissão para comandos admin.');
            return;
        }
        services_1.logger.info(`Comando admin: ${message.content}`, {
            user: message.author.tag,
            guild: message.guild.name
        });
        try {
            // Remove prefixo
            const cleanMessage = message.content
                .replace(/^ia[,\s]/i, '')
                .replace(new RegExp(`<@!?${client.user?.id}>`), '')
                .trim();
            // Parseia com LLM
            if ('sendTyping' in message.channel) {
                await message.channel.sendTyping();
            }
            const parsed = await services_1.llmService.parseAdminCommand(cleanMessage, ADMIN_PROMPT);
            services_1.logger.debug('Comando parseado:', { parsed });
            // TODO: Executar ação (implementar executeAdminAction)
            await message.reply(`✅ Comando reconhecido: \`${parsed.action}\`\n📋 Params: \`${JSON.stringify(parsed.params)}\``);
        }
        catch (error) {
            services_1.logger.error('Erro no comando admin:', { error });
            await message.reply('❌ Erro ao processar comando.');
        }
    }
});
// ═══════════════════════════════════════════════════════════════════════════
// ✅ READY EVENT
// ═══════════════════════════════════════════════════════════════════════════
client.once('ready', async () => {
    services_1.logger.info(`✅ NexstarIA online como ${client.user?.tag}`);
    services_1.logger.info(`📊 Servindo ${client.guilds.cache.size} servidores`);
    // Carrega comandos
    const commandsDir = path.join(__dirname, 'commands');
    await handlers_1.commandHandler.loadCommands(commandsDir);
});
// ═══════════════════════════════════════════════════════════════════════════
// 🚀 INICIAR BOT
// ═══════════════════════════════════════════════════════════════════════════
client.login(iaConfig.token).catch(error => {
    services_1.logger.error('Falha ao conectar:', { error });
    process.exit(1);
});
// Graceful shutdown
process.on('SIGINT', () => {
    services_1.logger.info('Desligando bot...');
    client.destroy();
    process.exit(0);
});
process.on('unhandledRejection', (error) => {
    services_1.logger.error('Unhandled rejection:', { error });
});
//# sourceMappingURL=index.js.map