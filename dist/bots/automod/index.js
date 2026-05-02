"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const services_1 = require("../../shared/services");
// ═══════════════════════════════════════════════════════════════════════════
// 🔐 VALIDAÇÃO
// ═══════════════════════════════════════════════════════════════════════════
services_1.config.validate(['DISCORD_TOKEN_AUTOMOD', 'CLIENT_ID_AUTOMOD']);
const TOKEN = services_1.config.get('DISCORD_TOKEN_AUTOMOD');
const CLIENT_ID = services_1.config.get('CLIENT_ID_AUTOMOD');
function hasModerationPermission(member) {
    return member.permissions.has('Administrator') || member.permissions.has('ManageMessages') || member.permissions.has('KickMembers') || member.permissions.has('BanMembers');
}
// ═══════════════════════════════════════════════════════════════════════════
// 📊 CACHE LOCAL
// ═══════════════════════════════════════════════════════════════════════════
// Cache em memória para evitar queries a cada mensagem
const guildConfigCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutos
const cacheTimestamps = new Map();
async function getCachedConfig(guildId) {
    const now = Date.now();
    const cacheTime = cacheTimestamps.get(guildId);
    if (cacheTime && now - cacheTime < CACHE_TTL && guildConfigCache.has(guildId)) {
        return guildConfigCache.get(guildId);
    }
    const config = await (0, services_1.getGuildConfig)(guildId);
    if (config) {
        guildConfigCache.set(guildId, config);
        cacheTimestamps.set(guildId, now);
    }
    return config;
}
function invalidateCache(guildId) {
    guildConfigCache.delete(guildId);
    cacheTimestamps.delete(guildId);
}
// ═══════════════════════════════════════════════════════════════════════════
// 🤖 CLIENTE DISCORD
// ═══════════════════════════════════════════════════════════════════════════
const client = new discord_js_1.Client({
    intents: [
        discord_js_1.GatewayIntentBits.Guilds,
        discord_js_1.GatewayIntentBits.GuildMessages,
        discord_js_1.GatewayIntentBits.MessageContent,
        discord_js_1.GatewayIntentBits.GuildMembers,
    ],
});
// ═══════════════════════════════════════════════════════════════════════════
// 🔧 FUNÇÕES DE GERENCIAMENTO (ASYNC - PostgreSQL)
// ═══════════════════════════════════════════════════════════════════════════
async function getModerationChannel(guildId) {
    const config = await getCachedConfig(guildId);
    return config?.automod_channel || null;
}
async function setModerationChannel(guildId, channelId) {
    try {
        await (0, services_1.upsertGuildConfig)(guildId, { automod_channel: channelId });
        invalidateCache(guildId);
        return true;
    }
    catch (error) {
        services_1.logger.error('Erro ao definir canal de moderação');
        return false;
    }
}
async function getProhibitedWords(guildId) {
    const config = await getCachedConfig(guildId);
    return config?.prohibited_words || [];
}
async function addProhibitedWord(guildId, word) {
    try {
        const config = await getCachedConfig(guildId);
        const currentWords = config?.prohibited_words || [];
        const wordLower = word.toLowerCase();
        if (currentWords.includes(wordLower)) {
            return false;
        }
        const newWords = [...currentWords, wordLower];
        await (0, services_1.upsertGuildConfig)(guildId, { prohibited_words: newWords });
        invalidateCache(guildId);
        return true;
    }
    catch (error) {
        services_1.logger.error('Erro ao adicionar palavra proibida');
        return false;
    }
}
async function removeProhibitedWord(guildId, word) {
    try {
        const config = await getCachedConfig(guildId);
        const currentWords = config?.prohibited_words || [];
        const wordLower = word.toLowerCase();
        if (!currentWords.includes(wordLower)) {
            return false;
        }
        const newWords = currentWords.filter(w => w !== wordLower);
        await (0, services_1.upsertGuildConfig)(guildId, { prohibited_words: newWords });
        invalidateCache(guildId);
        return true;
    }
    catch (error) {
        services_1.logger.error('Erro ao remover palavra proibida');
        return false;
    }
}
async function clearProhibitedWords(guildId) {
    try {
        await (0, services_1.upsertGuildConfig)(guildId, { prohibited_words: [] });
        invalidateCache(guildId);
        return true;
    }
    catch (error) {
        services_1.logger.error('Erro ao limpar palavras proibidas');
        return false;
    }
}
async function logModerationAction(guildId, userId, channelId, messageContent, violationType, actionTaken) {
    try {
        await (0, services_1.logAudit)(guildId, 'SYSTEM', actionTaken, userId, {
            channel_id: channelId,
            message_content: messageContent.substring(0, 200),
            violation_type: violationType
        });
    }
    catch (error) {
        services_1.logger.error('Erro ao registrar ação de moderação');
    }
}
// ═══════════════════════════════════════════════════════════════════════════
// 🛡️ MODERAÇÃO DE MENSAGENS
// ═══════════════════════════════════════════════════════════════════════════
async function moderateMessage(message) {
    if (message.author.bot)
        return;
    if (!message.guild)
        return;
    const moderationChannelId = await getModerationChannel(message.guild.id);
    if (!moderationChannelId || message.channel.id !== moderationChannelId) {
        return;
    }
    const botMember = message.guild.members.me;
    if (!botMember)
        return;
    const botPermissions = botMember.permissionsIn(message.channel);
    if (!botPermissions.has(discord_js_1.PermissionFlagsBits.ManageMessages)) {
        services_1.logger.warn('Bot não tem permissão para deletar mensagens');
        return;
    }
    const prohibitedWords = await getProhibitedWords(message.guild.id);
    if (prohibitedWords.length === 0)
        return;
    const messageContent = message.content.toLowerCase();
    for (const word of prohibitedWords) {
        if (messageContent.includes(word.toLowerCase())) {
            services_1.logger.info(`🚨 Palavra proibida encontrada: "${word}"`);
            try {
                await message.delete();
                services_1.logger.info('✅ Mensagem deletada');
                await logModerationAction(message.guild.id, message.author.id, message.channel.id, message.content, 'prohibited_word', 'message_deleted');
                try {
                    await message.author.send(`🚫 Sua mensagem foi removida por conter uma palavra proibida: **${word}**\n\n` +
                        `Canal: ${message.channel.name}\n` +
                        `Servidor: ${message.guild.name}`);
                    services_1.logger.info(`📩 DM enviado para ${message.author.username}`);
                }
                catch {
                    services_1.logger.warn(`Não foi possível enviar DM para ${message.author.username}`);
                }
                break;
            }
            catch (error) {
                services_1.logger.error('Erro ao moderar mensagem');
            }
        }
    }
}
// ═══════════════════════════════════════════════════════════════════════════
// 📝 SLASH COMMANDS
// ═══════════════════════════════════════════════════════════════════════════
const commands = [
    new discord_js_1.SlashCommandBuilder()
        .setName('set-moderation-channel')
        .setDescription('Define o canal onde a automoderação irá atuar')
        .addChannelOption(option => option.setName('canal')
        .setDescription('Canal para moderação automática')
        .setRequired(true)
        .addChannelTypes(discord_js_1.ChannelType.GuildText)),
    new discord_js_1.SlashCommandBuilder()
        .setName('add-prohibited-word')
        .setDescription('Adiciona uma palavra à lista de proibidas')
        .addStringOption(option => option.setName('palavra')
        .setDescription('Palavra que será proibida no chat')
        .setRequired(true)),
    new discord_js_1.SlashCommandBuilder()
        .setName('remove-prohibited-word')
        .setDescription('Remove uma palavra da lista de proibidas')
        .addStringOption(option => option.setName('palavra')
        .setDescription('Palavra a ser removida da lista')
        .setRequired(true)),
    new discord_js_1.SlashCommandBuilder()
        .setName('list-prohibited-words')
        .setDescription('Lista todas as palavras proibidas'),
    new discord_js_1.SlashCommandBuilder()
        .setName('clear-prohibited-words')
        .setDescription('Remove todas as palavras proibidas'),
    new discord_js_1.SlashCommandBuilder()
        .setName('debug-moderation')
        .setDescription('Verifica o status da configuração de moderação'),
];
// Registrar comandos
const rest = new discord_js_1.REST({ version: '10' }).setToken(TOKEN);
(async () => {
    try {
        services_1.logger.info('🔄 Registrando comandos slash (AutoMod)...');
        await rest.put(discord_js_1.Routes.applicationCommands(CLIENT_ID), { body: commands.map(c => c.toJSON()) });
        services_1.logger.info('✅ Comandos registrados com sucesso!');
    }
    catch (error) {
        services_1.logger.error('Erro ao registrar comandos');
    }
})();
// ═══════════════════════════════════════════════════════════════════════════
// 📨 EVENT HANDLERS
// ═══════════════════════════════════════════════════════════════════════════
client.on('messageCreate', async (message) => {
    await moderateMessage(message);
});
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isChatInputCommand())
        return;
    const commandInteraction = interaction;
    services_1.logger.info(`⚡ Comando AutoMod: ${commandInteraction.commandName} por ${commandInteraction.user.username}`);
    if (!hasModerationPermission(commandInteraction.member)) {
        await commandInteraction.reply({
            content: '🚫 Você não tem permissão para usar comandos de moderação.',
            flags: discord_js_1.MessageFlags.Ephemeral
        });
        return;
    }
    try {
        const { commandName } = commandInteraction;
        if (commandName === 'set-moderation-channel') {
            const channel = commandInteraction.options.getChannel('canal');
            if (!channel || !commandInteraction.guild)
                return;
            await commandInteraction.deferReply({ flags: discord_js_1.MessageFlags.Ephemeral });
            if (await setModerationChannel(commandInteraction.guild.id, channel.id)) {
                await commandInteraction.editReply({
                    content: `✅ Canal de moderação definido para ${channel}.\n\nA automoderação agora atuará neste canal.`
                });
            }
            else {
                await commandInteraction.editReply({
                    content: '❌ Erro ao definir canal de moderação.'
                });
            }
        }
        else if (commandName === 'add-prohibited-word') {
            const word = commandInteraction.options.getString('palavra')?.trim();
            if (!word || !commandInteraction.guild)
                return;
            if (word.length < 2) {
                await commandInteraction.reply({
                    content: '❌ A palavra deve ter pelo menos 2 caracteres.',
                    flags: discord_js_1.MessageFlags.Ephemeral
                });
                return;
            }
            await commandInteraction.deferReply({ flags: discord_js_1.MessageFlags.Ephemeral });
            if (await addProhibitedWord(commandInteraction.guild.id, word)) {
                await commandInteraction.editReply({
                    content: `✅ Palavra "${word}" adicionada à lista de proibidas.`
                });
            }
            else {
                await commandInteraction.editReply({
                    content: `⚠️ A palavra "${word}" já está na lista.`
                });
            }
        }
        else if (commandName === 'remove-prohibited-word') {
            const word = commandInteraction.options.getString('palavra')?.trim();
            if (!word || !commandInteraction.guild)
                return;
            await commandInteraction.deferReply({ flags: discord_js_1.MessageFlags.Ephemeral });
            if (await removeProhibitedWord(commandInteraction.guild.id, word)) {
                await commandInteraction.editReply({
                    content: `✅ Palavra "${word}" removida da lista.`
                });
            }
            else {
                await commandInteraction.editReply({
                    content: `❌ Palavra "${word}" não encontrada.`
                });
            }
        }
        else if (commandName === 'list-prohibited-words') {
            if (!commandInteraction.guild)
                return;
            await commandInteraction.deferReply({ flags: discord_js_1.MessageFlags.Ephemeral });
            const words = await getProhibitedWords(commandInteraction.guild.id);
            if (words.length === 0) {
                await commandInteraction.editReply({
                    content: '📋 Nenhuma palavra proibida configurada.'
                });
            }
            else {
                const wordList = words.map((word, index) => `${index + 1}. ${word}`).join('\n');
                await commandInteraction.editReply({
                    content: `📋 **Palavras proibidas (${words.length}):**\n\n${wordList}`
                });
            }
        }
        else if (commandName === 'clear-prohibited-words') {
            if (!commandInteraction.guild)
                return;
            await commandInteraction.deferReply({ flags: discord_js_1.MessageFlags.Ephemeral });
            if (await clearProhibitedWords(commandInteraction.guild.id)) {
                await commandInteraction.editReply({
                    content: '🗑️ Todas as palavras proibidas foram removidas.'
                });
            }
            else {
                await commandInteraction.editReply({
                    content: '❌ Erro ao limpar palavras proibidas.'
                });
            }
        }
        else if (commandName === 'debug-moderation') {
            if (!commandInteraction.guild)
                return;
            await commandInteraction.deferReply({ flags: discord_js_1.MessageFlags.Ephemeral });
            const channelId = await getModerationChannel(commandInteraction.guild.id);
            const words = await getProhibitedWords(commandInteraction.guild.id);
            const channel = channelId ? commandInteraction.guild.channels.cache.get(channelId) : null;
            let debugInfo = '**🔍 Status da Moderação (PostgreSQL):**\n\n';
            debugInfo += `📋 **Canal:** ${channel ? `${channel.name} (${channelId})` : 'Nenhum'}\n`;
            debugInfo += `🚫 **Palavras:** ${words.length > 0 ? words.join(', ') : 'Nenhuma'}\n`;
            debugInfo += `💾 **Storage:** PostgreSQL Railway\n\n`;
            if (channel && commandInteraction.guild.members.me) {
                const botPermissions = commandInteraction.guild.members.me.permissionsIn(channel);
                debugInfo += '**🔐 Permissões:**\n';
                debugInfo += `✅ Ler: ${botPermissions.has(discord_js_1.PermissionFlagsBits.ViewChannel) ? 'Sim' : 'Não'}\n`;
                debugInfo += `✅ Deletar: ${botPermissions.has(discord_js_1.PermissionFlagsBits.ManageMessages) ? 'Sim' : 'Não'}\n`;
            }
            await commandInteraction.editReply({
                content: debugInfo
            });
        }
    }
    catch (error) {
        services_1.logger.error(`Erro no comando ${commandInteraction.commandName}`);
        try {
            if (commandInteraction.deferred) {
                await commandInteraction.editReply({
                    content: '❌ Ocorreu um erro ao executar o comando.'
                });
            }
            else {
                await commandInteraction.reply({
                    content: '❌ Ocorreu um erro ao executar o comando.',
                    flags: discord_js_1.MessageFlags.Ephemeral
                });
            }
        }
        catch { }
    }
});
// ═══════════════════════════════════════════════════════════════════════════
// 🚀 INICIALIZAÇÃO
// ═══════════════════════════════════════════════════════════════════════════
client.once('ready', async () => {
    services_1.logger.info(`✅ Bot AutoMod ${client.user?.tag} está online!`);
    services_1.logger.info(`📊 Servidores: ${client.guilds.cache.size}`);
    // Inicializar conexão e schema
    try {
        const connected = await (0, services_1.testConnection)();
        if (connected) {
            await (0, services_1.initializeSchema)();
            services_1.logger.info('💾 Database PostgreSQL conectado e pronto!');
        }
        else {
            services_1.logger.warn('⚠️ Database não disponível, usando cache apenas');
        }
    }
    catch (error) {
        services_1.logger.error('Erro ao conectar ao database');
    }
});
client.login(TOKEN).catch(_error => {
    services_1.logger.error('Erro ao fazer login');
    process.exit(1);
});
process.on('SIGINT', async () => {
    services_1.logger.info('Encerrando bot AutoMod...');
    await (0, services_1.closePool)();
    client.destroy();
    process.exit(0);
});
process.on('SIGTERM', async () => {
    services_1.logger.info('Encerrando bot AutoMod...');
    await (0, services_1.closePool)();
    client.destroy();
    process.exit(0);
});
process.on('unhandledRejection', (error) => {
    services_1.logger.error('Erro não tratado:', { error });
});
//# sourceMappingURL=index.js.map