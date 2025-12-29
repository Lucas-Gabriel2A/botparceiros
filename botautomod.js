// Polyfill para ReadableStream (compatibilidade com Node.js < 16.5.0)
const { ReadableStream } = require('web-streams-polyfill');
global.ReadableStream = ReadableStream;

require('dotenv').config();
const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, PermissionFlagsBits, MessageFlags } = require('discord.js');
const fs = require('fs-extra');
const path = require('path');

// Configurações
const TOKEN = process.env.DISCORD_TOKEN_AUTOMOD;
const CLIENT_ID = process.env.CLIENT_ID_AUTOMOD;

// Validação das variáveis de ambiente críticas
if (!TOKEN) {
    console.error("❌ DISCORD_TOKEN_AUTOMOD não configurado no arquivo .env");
    process.exit(1);
}
if (!CLIENT_ID) {
    console.error("❌ CLIENT_ID_AUTOMOD não configurado no arquivo .env");
    process.exit(1);
}

// Cliente Discord
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
    ],
});

// Caminhos
const automodDataPath = path.join(__dirname, 'data', 'automod_data.json');

// Garantir diretório data
fs.ensureDirSync(path.dirname(automodDataPath));

// Inicializar armazenamento JSON para Railway (mais compatível)
let automodData = {};

try {
    if (fs.existsSync(automodDataPath)) {
        automodData = fs.readJsonSync(automodDataPath);
        console.log('?? Dados de automoderação carregados');
    } else {
        automodData = {
            channels: {}, // guildId -> channelId
            words: {},    // guildId -> [words]
            logs: []      // [{guildId, userId, channelId, message, violation, action, timestamp}]
        };
        fs.ensureDirSync(path.dirname(automodDataPath));
        fs.writeJsonSync(automodDataPath, automodData);
        console.log('?? Arquivo de dados automod criado');
    }
} catch (error) {
    console.error('❌ Erro ao carregar dados de automoderação:', error.message);
    automodData = { channels: {}, words: {}, logs: [] };
}

// Funções de armazenamento JSON
function saveAutomodData() {
    try {
        fs.writeJsonSync(automodDataPath, automodData);
    } catch (error) {
        console.error('❌ Erro ao salvar dados de automoderação:', error.message);
    }
}

function getModerationChannel(guildId) {
    return automodData.channels[guildId] || null;
}

function setModerationChannel(guildId, channelId) {
    automodData.channels[guildId] = channelId;
    saveAutomodData();
    return true;
}

function getProhibitedWords(guildId) {
    return automodData.words[guildId] || [];
}

function addProhibitedWord(guildId, word) {
    if (!automodData.words[guildId]) {
        automodData.words[guildId] = [];
    }

    const wordLower = word.toLowerCase();
    if (!automodData.words[guildId].includes(wordLower)) {
        automodData.words[guildId].push(wordLower);
        saveAutomodData();
        return true;
    }
    return false;
}

function removeProhibitedWord(guildId, word) {
    if (!automodData.words[guildId]) return false;

    const wordLower = word.toLowerCase();
    const index = automodData.words[guildId].indexOf(wordLower);
    if (index > -1) {
        automodData.words[guildId].splice(index, 1);
        saveAutomodData();
        return true;
    }
    return false;
}

function logModerationAction(guildId, userId, channelId, messageContent, violationType, actionTaken) {
    const logEntry = {
        guildId,
        userId,
        channelId,
        messageContent,
        violationType,
        actionTaken,
        timestamp: new Date().toISOString()
    };

    automodData.logs.push(logEntry);

    // Manter apenas os últimos 1000 logs para não crescer demais
    if (automodData.logs.length > 1000) {
        automodData.logs = automodData.logs.slice(-1000);
    }

    saveAutomodData();
}

// Função para verificar permissões
function hasModerationPermission(member) {
    if (!member) return false;
    if (member.id === member.guild.ownerId) return true;
    return member.permissions.has(PermissionFlagsBits.ManageMessages) ||
           member.permissions.has(PermissionFlagsBits.Administrator);
}

// Função para moderar mensagem
async function moderateMessage(message) {
    if (message.author.bot) return;
    if (!message.guild) return;

    const moderationChannelId = getModerationChannel(message.guild.id);
    if (!moderationChannelId || message.channel.id !== moderationChannelId) return;

    const prohibitedWords = getProhibitedWords(message.guild.id);
    if (prohibitedWords.length === 0) return;

    const messageContent = message.content.toLowerCase();

    for (const word of prohibitedWords) {
        if (messageContent.includes(word.toLowerCase())) {
            try {
                // Deletar mensagem
                await message.delete();

                // Registrar log
                logModerationAction(
                    message.guild.id,
                    message.author.id,
                    message.channel.id,
                    message.content,
                    'prohibited_word',
                    'message_deleted'
                );

                // Avisar usuário
                try {
                    await message.author.send(`🚫 Sua mensagem foi removida por conter uma palavra proibida: **${word}**\n\nCanal: ${message.channel.name}\nServidor: ${message.guild.name}`);
                } catch (dmError) {
                    // Usuário pode ter DMs desabilitados
                    console.log(`Não foi possível enviar DM para ${message.author.username}`);
                }

                // Log no console
                console.log(`🚫 Palavra proibida detectada: "${word}" por ${message.author.username} em ${message.channel.name}`);

                break; // Para após encontrar primeira palavra proibida
            } catch (error) {
                console.error('Erro ao moderar mensagem:', error);
            }
        }
    }
}

// Comandos Slash
const commands = [
    new SlashCommandBuilder()
        .setName('set-moderation-channel')
        .setDescription('Define o canal onde a automoderação irá atuar')
        .addChannelOption(option =>
            option.setName('canal')
                .setDescription('Canal para moderação automática')
                .setRequired(true)
                .addChannelTypes(0) // TEXT CHANNEL
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
];

// Registrar comandos
const rest = new REST({ version: '10' }).setToken(TOKEN);
(async () => {
    try {
        console.log('?? Registrando comandos slash (AutoMod)...');
        console.log(`?? CLIENT_ID: ${CLIENT_ID}`);
        console.log(`?? Número de comandos: ${commands.length}`);
        commands.forEach((cmd, i) => console.log(`   ${i+1}. ${cmd.name}`));

        await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });
        console.log('✅ Comandos registrados com sucesso (AutoMod)!');
    } catch (error) {
        console.error('❌ Erro ao registrar comandos (AutoMod):', error.message);
    }
})();

// Handler de mensagens para moderação
client.on('messageCreate', async (message) => {
    await moderateMessage(message);
});

// Handler consolidado para interações
client.on('interactionCreate', async (interaction) => {
    if (interaction.isChatInputCommand()) {
        console.log(`? Comando AutoMod: ${interaction.commandName} por ${interaction.user.username}`);

        // Verificações básicas de permissão
        if (!hasModerationPermission(interaction.member)) {
            await interaction.reply({
                content: '? Você não tem permissão para usar comandos de moderação.',
                flags: MessageFlags.Ephemeral
            });
            return;
        }

        try {
            if (interaction.commandName === 'set-moderation-channel') {
                const channel = interaction.options.getChannel('canal');

                if (setModerationChannel(interaction.guild.id, channel.id)) {
                    await interaction.reply({
                        content: `? Canal de moderação definido para ${channel}.\n\nA automoderação agora atuará neste canal.`,
                        flags: MessageFlags.Ephemeral
                    });
                } else {
                    await interaction.reply({
                        content: '? Erro ao definir canal de moderação.',
                        flags: MessageFlags.Ephemeral
                    });
                }

            } else if (interaction.commandName === 'add-prohibited-word') {
                const word = interaction.options.getString('palavra').trim();

                if (word.length < 2) {
                    await interaction.reply({
                        content: '? A palavra deve ter pelo menos 2 caracteres.',
                        flags: MessageFlags.Ephemeral
                    });
                    return;
                }

                if (addProhibitedWord(interaction.guild.id, word)) {
                    await interaction.reply({
                        content: `? Palavra "${word}" adicionada à lista de proibidas.`,
                        flags: MessageFlags.Ephemeral
                    });
                } else {
                    await interaction.reply({
                        content: `? A palavra "${word}" já está na lista ou ocorreu um erro.`,
                        flags: MessageFlags.Ephemeral
                    });
                }

            } else if (interaction.commandName === 'remove-prohibited-word') {
                const word = interaction.options.getString('palavra').trim();

                if (removeProhibitedWord(interaction.guild.id, word)) {
                    await interaction.reply({
                        content: `? Palavra "${word}" removida da lista de proibidas.`,
                        flags: MessageFlags.Ephemeral
                    });
                } else {
                    await interaction.reply({
                        content: `? Palavra "${word}" não encontrada na lista.`,
                        flags: MessageFlags.Ephemeral
                    });
                }

            } else if (interaction.commandName === 'list-prohibited-words') {
                const words = getProhibitedWords(interaction.guild.id);

                if (words.length === 0) {
                    await interaction.reply({
                        content: '? Nenhuma palavra proibida configurada.',
                        flags: MessageFlags.Ephemeral
                    });
                } else {
                    const wordList = words.map((word, index) => `${index + 1}. ${word}`).join('\n');
                    await interaction.reply({
                        content: `📋 **Palavras proibidas (${words.length}):**\n\n${wordList}`,
                        flags: MessageFlags.Ephemeral
                    });
                }

            } else if (interaction.commandName === 'clear-prohibited-words') {
                if (automodData.words[interaction.guild.id]) {
                    delete automodData.words[interaction.guild.id];
                    saveAutomodData();
                    await interaction.reply({
                        content: '? Todas as palavras proibidas foram removidas.',
                        flags: MessageFlags.Ephemeral
                    });
                } else {
                    await interaction.reply({
                        content: '? Não há palavras proibidas para remover.',
                        flags: MessageFlags.Ephemeral
                    });
                }
            }

        } catch (error) {
            console.error(`? Erro no comando ${interaction.commandName}:`, error.message);
            await interaction.reply({
                content: '? Ocorreu um erro ao executar o comando.',
                flags: MessageFlags.Ephemeral
            });
        }
    }
});

// Evento ready
client.once('ready', () => {
    console.log(`✅ Bot AutoMod ${client.user.tag} está online!`);
    console.log(`?? Servidores conectados: ${client.guilds.cache.size}`);
});

// Login
client.login(TOKEN).catch(error => {
    console.error('❌ Erro ao fazer login:', error);
    process.exit(1);
});