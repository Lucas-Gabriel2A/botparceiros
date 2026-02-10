/**
 * ╔═══════════════════════════════════════════════════════════════════════════╗
 * ║                      COREBOT AUTOMOD - MODERAÇÃO AUTOMÁTICA               ║
 * ║                    Filtro de Palavras + Logs de Moderação                 ║
 * ╚═══════════════════════════════════════════════════════════════════════════╝
 * 
 * Features:
 * - Lista de palavras proibidas por guild (PostgreSQL)
 * - Deleção automática de mensagens
 * - DM para usuários avisando da violação
 * - Logs de moderação persistentes no banco
 * - Debug commands
 */

import {
    Client,
    GatewayIntentBits,
    REST,
    Routes,
    SlashCommandBuilder,
    PermissionFlagsBits,
    MessageFlags,
    Message,
    GuildMember,
    ChatInputCommandInteraction,
    ChannelType,
    TextChannel
} from 'discord.js';

import {
    config,
    logger,
    testConnection,
    initializeSchema,
    getGuildConfig,
    upsertGuildConfig,
    logAudit,
    closePool,
    GuildConfig
} from '../../shared/services';

// ═══════════════════════════════════════════════════════════════════════════
// 🔐 VALIDAÇÃO
// ═══════════════════════════════════════════════════════════════════════════

config.validate(['DISCORD_TOKEN_AUTOMOD', 'CLIENT_ID_AUTOMOD']);

const TOKEN = config.get('DISCORD_TOKEN_AUTOMOD');
const CLIENT_ID = config.get('CLIENT_ID_AUTOMOD');

function hasModerationPermission(member: any): boolean {
    return member.permissions.has('Administrator') || member.permissions.has('ManageMessages') || member.permissions.has('KickMembers') || member.permissions.has('BanMembers');
}

// ═══════════════════════════════════════════════════════════════════════════
// 📊 CACHE LOCAL
// ═══════════════════════════════════════════════════════════════════════════

// Cache em memória para evitar queries a cada mensagem
const guildConfigCache = new Map<string, GuildConfig>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutos
const cacheTimestamps = new Map<string, number>();

async function getCachedConfig(guildId: string): Promise<GuildConfig | null> {
    const now = Date.now();
    const cacheTime = cacheTimestamps.get(guildId);

    if (cacheTime && now - cacheTime < CACHE_TTL && guildConfigCache.has(guildId)) {
        return guildConfigCache.get(guildId)!;
    }

    const config = await getGuildConfig(guildId);
    if (config) {
        guildConfigCache.set(guildId, config);
        cacheTimestamps.set(guildId, now);
    }
    return config;
}

function invalidateCache(guildId: string): void {
    guildConfigCache.delete(guildId);
    cacheTimestamps.delete(guildId);
}

// ═══════════════════════════════════════════════════════════════════════════
// 🤖 CLIENTE DISCORD
// ═══════════════════════════════════════════════════════════════════════════

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
    ],
});

// ═══════════════════════════════════════════════════════════════════════════
// 🔧 FUNÇÕES DE GERENCIAMENTO (ASYNC - PostgreSQL)
// ═══════════════════════════════════════════════════════════════════════════

async function getModerationChannel(guildId: string): Promise<string | null> {
    const config = await getCachedConfig(guildId);
    return config?.automod_channel || null;
}

async function setModerationChannel(guildId: string, channelId: string): Promise<boolean> {
    try {
        await upsertGuildConfig(guildId, { automod_channel: channelId });
        invalidateCache(guildId);
        return true;
    } catch (error) {
        logger.error('Erro ao definir canal de moderação');
        return false;
    }
}

async function getProhibitedWords(guildId: string): Promise<string[]> {
    const config = await getCachedConfig(guildId);
    return config?.prohibited_words || [];
}

async function addProhibitedWord(guildId: string, word: string): Promise<boolean> {
    try {
        const config = await getCachedConfig(guildId);
        const currentWords = config?.prohibited_words || [];
        const wordLower = word.toLowerCase();

        if (currentWords.includes(wordLower)) {
            return false;
        }

        const newWords = [...currentWords, wordLower];
        await upsertGuildConfig(guildId, { prohibited_words: newWords });
        invalidateCache(guildId);
        return true;
    } catch (error) {
        logger.error('Erro ao adicionar palavra proibida');
        return false;
    }
}

async function removeProhibitedWord(guildId: string, word: string): Promise<boolean> {
    try {
        const config = await getCachedConfig(guildId);
        const currentWords = config?.prohibited_words || [];
        const wordLower = word.toLowerCase();

        if (!currentWords.includes(wordLower)) {
            return false;
        }

        const newWords = currentWords.filter(w => w !== wordLower);
        await upsertGuildConfig(guildId, { prohibited_words: newWords });
        invalidateCache(guildId);
        return true;
    } catch (error) {
        logger.error('Erro ao remover palavra proibida');
        return false;
    }
}

async function clearProhibitedWords(guildId: string): Promise<boolean> {
    try {
        await upsertGuildConfig(guildId, { prohibited_words: [] });
        invalidateCache(guildId);
        return true;
    } catch (error) {
        logger.error('Erro ao limpar palavras proibidas');
        return false;
    }
}

async function logModerationAction(
    guildId: string,
    userId: string,
    channelId: string,
    messageContent: string,
    violationType: string,
    actionTaken: string
): Promise<void> {
    try {
        await logAudit(guildId, 'SYSTEM', actionTaken, userId, {
            channel_id: channelId,
            message_content: messageContent.substring(0, 200),
            violation_type: violationType
        });
    } catch (error) {
        logger.error('Erro ao registrar ação de moderação');
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// 🛡️ MODERAÇÃO DE MENSAGENS
// ═══════════════════════════════════════════════════════════════════════════


async function moderateMessage(message: Message): Promise<void> {
    if (message.author.bot) return;
    if (!message.guild) return;

    const moderationChannelId = await getModerationChannel(message.guild.id);

    if (!moderationChannelId || message.channel.id !== moderationChannelId) {
        return;
    }

    const botMember = message.guild.members.me;
    if (!botMember) return;

    const botPermissions = botMember.permissionsIn(message.channel as TextChannel);
    if (!botPermissions.has(PermissionFlagsBits.ManageMessages)) {
        logger.warn('Bot não tem permissão para deletar mensagens');
        return;
    }

    const prohibitedWords = await getProhibitedWords(message.guild.id);
    if (prohibitedWords.length === 0) return;

    const messageContent = message.content.toLowerCase();

    for (const word of prohibitedWords) {
        if (messageContent.includes(word.toLowerCase())) {
            logger.info(`🚨 Palavra proibida encontrada: "${word}"`);
            try {
                await message.delete();
                logger.info('✅ Mensagem deletada');

                await logModerationAction(
                    message.guild.id,
                    message.author.id,
                    message.channel.id,
                    message.content,
                    'prohibited_word',
                    'message_deleted'
                );

                try {
                    await message.author.send(
                        `🚫 Sua mensagem foi removida por conter uma palavra proibida: **${word}**\n\n` +
                        `Canal: ${(message.channel as TextChannel).name}\n` +
                        `Servidor: ${message.guild.name}`
                    );
                    logger.info(`📩 DM enviado para ${message.author.username}`);
                } catch {
                    logger.warn(`Não foi possível enviar DM para ${message.author.username}`);
                }

                break;
            } catch (error) {
                logger.error('Erro ao moderar mensagem');
            }
        }
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// 📝 SLASH COMMANDS
// ═══════════════════════════════════════════════════════════════════════════

const commands = [
    new SlashCommandBuilder()
        .setName('set-moderation-channel')
        .setDescription('Define o canal onde a automoderação irá atuar')
        .addChannelOption(option =>
            option.setName('canal')
                .setDescription('Canal para moderação automática')
                .setRequired(true)
                .addChannelTypes(ChannelType.GuildText)
        ),

    new SlashCommandBuilder()
        .setName('add-prohibited-word')
        .setDescription('Adiciona uma palavra à lista de proibidas')
        .addStringOption(option =>
            option.setName('palavra')
                .setDescription('Palavra que será proibida no chat')
                .setRequired(true)
        ),

    new SlashCommandBuilder()
        .setName('remove-prohibited-word')
        .setDescription('Remove uma palavra da lista de proibidas')
        .addStringOption(option =>
            option.setName('palavra')
                .setDescription('Palavra a ser removida da lista')
                .setRequired(true)
        ),

    new SlashCommandBuilder()
        .setName('list-prohibited-words')
        .setDescription('Lista todas as palavras proibidas'),

    new SlashCommandBuilder()
        .setName('clear-prohibited-words')
        .setDescription('Remove todas as palavras proibidas'),

    new SlashCommandBuilder()
        .setName('debug-moderation')
        .setDescription('Verifica o status da configuração de moderação'),
];

// Registrar comandos
const rest = new REST({ version: '10' }).setToken(TOKEN);

(async () => {
    try {
        logger.info('🔄 Registrando comandos slash (AutoMod)...');
        await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands.map(c => c.toJSON()) });
        logger.info('✅ Comandos registrados com sucesso!');
    } catch (error) {
        logger.error('Erro ao registrar comandos');
    }
})();

// ═══════════════════════════════════════════════════════════════════════════
// 📨 EVENT HANDLERS
// ═══════════════════════════════════════════════════════════════════════════

client.on('messageCreate', async (message: Message) => {
    await moderateMessage(message);
});

client.on('interactionCreate', async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    const commandInteraction = interaction as ChatInputCommandInteraction;
    logger.info(`⚡ Comando AutoMod: ${commandInteraction.commandName} por ${commandInteraction.user.username}`);

    if (!hasModerationPermission(commandInteraction.member as GuildMember)) {
        await commandInteraction.reply({
            content: '🚫 Você não tem permissão para usar comandos de moderação.',
            flags: MessageFlags.Ephemeral
        });
        return;
    }

    try {
        const { commandName } = commandInteraction;

        if (commandName === 'set-moderation-channel') {
            const channel = commandInteraction.options.getChannel('canal');
            if (!channel || !commandInteraction.guild) return;

            await commandInteraction.deferReply({ flags: MessageFlags.Ephemeral });

            if (await setModerationChannel(commandInteraction.guild.id, channel.id)) {
                await commandInteraction.editReply({
                    content: `✅ Canal de moderação definido para ${channel}.\n\nA automoderação agora atuará neste canal.`
                });
            } else {
                await commandInteraction.editReply({
                    content: '❌ Erro ao definir canal de moderação.'
                });
            }
        }
        else if (commandName === 'add-prohibited-word') {
            const word = commandInteraction.options.getString('palavra')?.trim();
            if (!word || !commandInteraction.guild) return;

            if (word.length < 2) {
                await commandInteraction.reply({
                    content: '❌ A palavra deve ter pelo menos 2 caracteres.',
                    flags: MessageFlags.Ephemeral
                });
                return;
            }

            await commandInteraction.deferReply({ flags: MessageFlags.Ephemeral });

            if (await addProhibitedWord(commandInteraction.guild.id, word)) {
                await commandInteraction.editReply({
                    content: `✅ Palavra "${word}" adicionada à lista de proibidas.`
                });
            } else {
                await commandInteraction.editReply({
                    content: `⚠️ A palavra "${word}" já está na lista.`
                });
            }
        }
        else if (commandName === 'remove-prohibited-word') {
            const word = commandInteraction.options.getString('palavra')?.trim();
            if (!word || !commandInteraction.guild) return;

            await commandInteraction.deferReply({ flags: MessageFlags.Ephemeral });

            if (await removeProhibitedWord(commandInteraction.guild.id, word)) {
                await commandInteraction.editReply({
                    content: `✅ Palavra "${word}" removida da lista.`
                });
            } else {
                await commandInteraction.editReply({
                    content: `❌ Palavra "${word}" não encontrada.`
                });
            }
        }
        else if (commandName === 'list-prohibited-words') {
            if (!commandInteraction.guild) return;

            await commandInteraction.deferReply({ flags: MessageFlags.Ephemeral });
            const words = await getProhibitedWords(commandInteraction.guild.id);

            if (words.length === 0) {
                await commandInteraction.editReply({
                    content: '📋 Nenhuma palavra proibida configurada.'
                });
            } else {
                const wordList = words.map((word, index) => `${index + 1}. ${word}`).join('\n');
                await commandInteraction.editReply({
                    content: `📋 **Palavras proibidas (${words.length}):**\n\n${wordList}`
                });
            }
        }
        else if (commandName === 'clear-prohibited-words') {
            if (!commandInteraction.guild) return;

            await commandInteraction.deferReply({ flags: MessageFlags.Ephemeral });

            if (await clearProhibitedWords(commandInteraction.guild.id)) {
                await commandInteraction.editReply({
                    content: '🗑️ Todas as palavras proibidas foram removidas.'
                });
            } else {
                await commandInteraction.editReply({
                    content: '❌ Erro ao limpar palavras proibidas.'
                });
            }
        }
        else if (commandName === 'debug-moderation') {
            if (!commandInteraction.guild) return;

            await commandInteraction.deferReply({ flags: MessageFlags.Ephemeral });

            const channelId = await getModerationChannel(commandInteraction.guild.id);
            const words = await getProhibitedWords(commandInteraction.guild.id);
            const channel = channelId ? commandInteraction.guild.channels.cache.get(channelId) : null;

            let debugInfo = '**🔍 Status da Moderação (PostgreSQL):**\n\n';
            debugInfo += `📋 **Canal:** ${channel ? `${channel.name} (${channelId})` : 'Nenhum'}\n`;
            debugInfo += `🚫 **Palavras:** ${words.length > 0 ? words.join(', ') : 'Nenhuma'}\n`;
            debugInfo += `💾 **Storage:** PostgreSQL Railway\n\n`;

            if (channel && commandInteraction.guild.members.me) {
                const botPermissions = commandInteraction.guild.members.me.permissionsIn(channel as TextChannel);
                debugInfo += '**🔐 Permissões:**\n';
                debugInfo += `✅ Ler: ${botPermissions.has(PermissionFlagsBits.ViewChannel) ? 'Sim' : 'Não'}\n`;
                debugInfo += `✅ Deletar: ${botPermissions.has(PermissionFlagsBits.ManageMessages) ? 'Sim' : 'Não'}\n`;
            }

            await commandInteraction.editReply({
                content: debugInfo
            });
        }
    } catch (error) {
        logger.error(`Erro no comando ${commandInteraction.commandName}`);
        try {
            if (commandInteraction.deferred) {
                await commandInteraction.editReply({
                    content: '❌ Ocorreu um erro ao executar o comando.'
                });
            } else {
                await commandInteraction.reply({
                    content: '❌ Ocorreu um erro ao executar o comando.',
                    flags: MessageFlags.Ephemeral
                });
            }
        } catch { }
    }
});

// ═══════════════════════════════════════════════════════════════════════════
// 🚀 INICIALIZAÇÃO
// ═══════════════════════════════════════════════════════════════════════════

client.once('ready', async () => {
    logger.info(`✅ Bot AutoMod ${client.user?.tag} está online!`);
    logger.info(`📊 Servidores: ${client.guilds.cache.size}`);

    // Inicializar conexão e schema
    try {
        const connected = await testConnection();
        if (connected) {
            await initializeSchema();
            logger.info('💾 Database PostgreSQL conectado e pronto!');
        } else {
            logger.warn('⚠️ Database não disponível, usando cache apenas');
        }
    } catch (error) {
        logger.error('Erro ao conectar ao database');
    }
});

client.login(TOKEN).catch(_error => {
    logger.error('Erro ao fazer login');
    process.exit(1);
});

process.on('SIGINT', async () => {
    logger.info('Encerrando bot AutoMod...');
    await closePool();
    client.destroy();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    logger.info('Encerrando bot AutoMod...');
    await closePool();
    client.destroy();
    process.exit(0);
});

process.on('unhandledRejection', (error) => {
    logger.error('Erro não tratado:', { error });
});
