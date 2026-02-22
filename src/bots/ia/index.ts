
import { 
    Client, 
    GatewayIntentBits, 
    Partials,
    Message
} from 'discord.js';
import * as path from 'path';

// Services & Handlers
import { config, logger, llmService } from '../../shared/services';
import { commandHandler } from '../../shared/handlers';

// ═══════════════════════════════════════════════════════════════════════════
// 🔐 VALIDAÇÃO DE AMBIENTE
// ═══════════════════════════════════════════════════════════════════════════

config.validate([
    'DISCORD_TOKEN_AGENTE_IA',
    'OPENAI_API_KEY',
    'OWNER_ROLE_ID'
]);

const iaConfig = config.getIAConfig();

if (!config.isValidDiscordToken(iaConfig.token)) {
    logger.error('Token Discord inválido!');
    process.exit(1);
}

// ═══════════════════════════════════════════════════════════════════════════
// 🤖 INICIALIZAÇÃO DO CLIENT
// ═══════════════════════════════════════════════════════════════════════════

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.DirectMessages
    ],
    partials: [Partials.Channel, Partials.Message]
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

function isAuthorized(member: import('discord.js').GuildMember | null): boolean {
    if (!member) return false;
    
    const ownerRoleId = iaConfig.ownerRoleId;
    const semiOwnerRoleId = iaConfig.semiOwnerRoleId;
    
    return (
        member.roles.cache.has(ownerRoleId || '') ||
        member.roles.cache.has(semiOwnerRoleId || '') ||
        member.permissions.has('Administrator')
    );
}

// ═══════════════════════════════════════════════════════════════════════════
// 📨 MESSAGE HANDLER
// ═══════════════════════════════════════════════════════════════════════════

client.on('messageCreate', async (message: Message) => {
    if (message.author.bot) return;

    const content = message.content.toLowerCase();
    
    // Comandos admin via IA
    const isAdminPrefix = content.startsWith('ia,') || content.startsWith('ia ');
    const isMention = message.mentions.users.has(client.user?.id || '');

    if ((isAdminPrefix || isMention) && message.guild) {
        if (!isAuthorized(message.member)) {
            await message.reply('❌ Você não tem permissão para comandos admin.');
            return;
        }

        logger.info(`Comando admin: ${message.content}`, {
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
            const parsed = await llmService.parseAdminCommand(cleanMessage, ADMIN_PROMPT);
            
            logger.debug('Comando parseado:', { parsed });

            // TODO: Executar ação (implementar executeAdminAction)
            await message.reply(`✅ Comando reconhecido: \`${parsed.action}\`\n📋 Params: \`${JSON.stringify(parsed.params)}\``);

        } catch (error) {
            logger.error('Erro no comando admin:', { error });
            await message.reply('❌ Erro ao processar comando.');
        }
    }
});

// ═══════════════════════════════════════════════════════════════════════════
// ✅ READY EVENT
// ═══════════════════════════════════════════════════════════════════════════

client.once('ready', async () => {
    logger.info(`✅ NexstarIA online como ${client.user?.tag}`);
    logger.info(`📊 Servindo ${client.guilds.cache.size} servidores`);
    
    // Carrega comandos
    const commandsDir = path.join(__dirname, 'commands');
    await commandHandler.loadCommands(commandsDir);
});

// ═══════════════════════════════════════════════════════════════════════════
// 🚀 INICIAR BOT
// ═══════════════════════════════════════════════════════════════════════════

client.login(iaConfig.token).catch(error => {
    logger.error('Falha ao conectar:', { error });
    process.exit(1);
});

// Graceful shutdown
process.on('SIGINT', () => {
    logger.info('Desligando bot...');
    client.destroy();
    process.exit(0);
});

process.on('unhandledRejection', (error) => {
    logger.error('Unhandled rejection:', { error });
});
