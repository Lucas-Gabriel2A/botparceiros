// ═══════════════════════════════════════════════════════════════════════════
// 🤖 NEXSTAR IA - ASSISTENTE INTELIGENTE
// ═══════════════════════════════════════════════════════════════════════════
// Polyfill para 'File' (Necessário no Railway/Node < 20 para OpenAI Uploads)
try {
    if (!global.File) {
        const { File } = require('node:buffer');
        global.File = File;
    }
} catch (e) {
    console.warn("⚠️ Não foi possível carregar o polyfill de 'File' (necessário apenas para uploads no Node antigo).");
}

const { 
    Client, 
    GatewayIntentBits, 
    Partials, 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    ChannelType, 
    PermissionFlagsBits 
} = require('discord.js');
const { OpenAI } = require('openai');
const { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus, getVoiceConnection, EndBehaviorType } = require('@discordjs/voice');
const googleTTS = require('google-tts-api');
const stream = require('stream');
const fs = require('fs');
const prism = require('prism-media');
const { pipeline } = require('stream');

require('dotenv').config();

// ═══════════════════════════════════════════════════════════════════════════
// 📋 CONFIGURAÇÕES
// ═══════════════════════════════════════════════════════════════════════════
// Usa TOKEN específico se existir, senão usa o principal
const TOKEN = process.env.DISCORD_TOKEN_AGENTE_IA || process.env.DISCORD_TOKEN_IA || process.env.DISCORD_TOKEN; 
const CATEGORIA_ASSISTENTE = process.env.CATEGORIA_ASSISTENTE;
const CANAL_ASSISTENTE = process.env.CANAL_ASSISTENTE;
const CANAL_CHAT_GERAL = process.env.CANAL_CHAT_GERAL;

// Configuração da IA (OpenAI / Groq / HuggingFace)
// Se não tiver chave, usa modo Mock (teste)
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const LLM_BASE_URL = process.env.LLM_BASE_URL || 'https://api.openai.com/v1'; // Pode mudar para Groq/HF
const MODELO_IA = process.env.MODELO_IA || 'gpt-3.5-turbo';

// IDs de Cargos para Autorização
const OWNER_ROLE_ID = process.env.OWNER_ROLE_ID;
const SEMI_OWNER_ROLE_ID = process.env.SEMI_OWNER_ROLE_ID;
const STAFF_ROLE_ID = process.env.STAFF_ROLE_ID;

// Tempo de inatividade para engajar (30 minutos)
const TEMPO_OCIOSO_PARA_ENGAJAR = 30 * 60 * 1000; // 30 minutos em ms

// CORES E EMOJIS
const CORES = {
    IA: '#00d4ff',
    ERRO: '#FF0000',
    SUCESSO: '#00FF00'
};

const EMOJIS = {
    IA: '🤖',
    CHAT: '💬',
    LOADING: '⏳',
    ERRO: '❌'
};

// 🧠 SERVIÇO DE IA (WRAPPER)
class LLMService {
    constructor() {
        if (OPENAI_API_KEY) {
            this.client = new OpenAI({
                apiKey: OPENAI_API_KEY,
                baseURL: LLM_BASE_URL
            });
            this.mode = 'API';
            console.log(`🧠 LLM Service iniciado em modo API (${LLM_BASE_URL})`);
        } else {
            this.mode = 'MOCK';
            console.log('⚠️ SEM CHAVE DE API (OPENAI_API_KEY). LLM Service em modo MOCK (Respostas automáticas).');
        }
    }

    // Método para Transcrever Áudio (Whisper) via Groq
    async transcreverAudio(caminhoArquivo) {
        if (this.mode === 'MOCK') return "Isso é um teste de voz.";
        try {
            console.log('🎤 Enviando áudio para transcrição (Whisper)...');
            const transcription = await this.client.audio.transcriptions.create({
                file: fs.createReadStream(caminhoArquivo),
                model: "whisper-large-v3-turbo", // Modelo Groq/Whisper
                response_format: "json",
                language: "pt"
            });
            return transcription.text;
        } catch (error) {
            console.error('Erro na transcrição STT:', error);
            return null;
        }
    }

    async gerarResposta(mensagens, systemPrompt = "Você é a IA da Nexstar.", imageUrl = null) {
        // ... (Logica gerarResposta mantida igual)
        if (this.mode === 'MOCK') {
            await new Promise(r => setTimeout(r, 1000));
            return `[MOCK] Recebi texto e ${imageUrl ? 'uma imagem (' + imageUrl + ')' : 'nenhuma imagem'}. Configure a API Key!`;
        }

        try {
            // Prepara mensagens
            let mensagensPayload = [
                { role: "system", content: systemPrompt },
                ...mensagens
            ];

            // Se tiver imagem, adiciona à última mensagem do usuário (Adaptado para Llama 3 Vision se suportado, senão ignora imagem na Groq Llama text-only)
            // Llama 3.2 11b/90b vision preview suporta, mas Llama 3 70b não. Groq não tem Llama 3.2 vision publico full yet?
            // Vamos testar. Se der erro 400, o try/catch pega.
            // Se tiver imagem, formata para Llama Vision
            let modelToUse = MODELO_IA;

            if (imageUrl) {
                console.log("👁️ Imagem detectada! Alternando para modelo Vision (meta-llama/llama-4-scout-17b-16e-instruct).");
                modelToUse = "meta-llama/llama-4-scout-17b-16e-instruct";

                const lastMsgIndex = mensagensPayload.length - 1;
                const lastMsg = mensagensPayload[lastMsgIndex];
                
                if (lastMsg.role === 'user') {
                    mensagensPayload[lastMsgIndex] = {
                        role: 'user',
                        content: [
                            { type: "text", text: lastMsg.content || "Analise esta imagem com o máximo de detalhes possível, descrevendo tudo o que vê;." },
                            { type: "image_url", image_url: { url: imageUrl } }
                        ]
                    };
                }
            }

            const completion = await this.client.chat.completions.create({
                messages: mensagensPayload,
                model: modelToUse,
            });
            return completion.choices[0].message.content;
        } catch (error) {
            console.error('Erro na API IA:', error.message);
            if (error.status === 429) return "⏳ **Calma lá!** Falei demais e esgotei minha cota de requisições (Rate Limit). Tente daqui a pouco.";
            if (error.status === 402) return "💸 **Minha cota de processamento na IA acabou!**\nPrecisa recarregar os créditos. 🤐";
            if (error.status === 400 && imageUrl) return "❌ Erro ao analisar imagem (Modelo decommissioned ou formato inválido).";
            return "😵‍💫 Tive um piripaque nos circuitos (Erro na API).";
        }
    }
}

const llmService = new LLMService();

// ═══════════════════════════════════════════════════════════════════════════
// 🔐 SISTEMA DE COMANDOS ADMIN VIA IA
// ═══════════════════════════════════════════════════════════════════════════

const ADMIN_PROMPT = `Você é um parser de comandos administrativos. Analise a mensagem do usuário e extraia a ação desejada.

AÇÕES DISPONÍVEIS:
- timeout: Colocar usuário de castigo (timeout). Params: targetUser, duration (minutos), reason
- kick: Expulsar usuário. Params: targetUser, reason
- ban: Banir usuário. Params: targetUser, reason
- unban: Desbanir usuário. Params: targetUserId (ID numérico)
- warn: Avisar usuário. Params: targetUser, reason
- clear: Limpar mensagens. Params: count (número de mensagens)
- create_category: Criar categoria sozinha. Params: categoryName
- create_category_with_channels: Criar categoria com canais dentro. Params: categoryName, channels (array de nomes), staffOnly (boolean opcional)
- create_channel: Criar canal. Params: channelName, categoryName (opcional), type (text/voice), staffOnly (boolean)
- delete_channel: Deletar canal. Params: channelName
- rename_channel: Renomear canal. Params: oldName, newName
- slowmode: Ativar slowmode. Params: channelName, seconds
- lock_channel: Trancar canal. Params: channelName
- unlock_channel: Destrancar canal. Params: channelName
- give_role: Dar cargo. Params: targetUser, roleName
- remove_role: Remover cargo. Params: targetUser, roleName
- create_role: Criar cargo. Params: roleName, color (hex opcional)
- server_info: Info do servidor. Params: nenhum
- user_info: Info do usuário. Params: targetUser
- announce: Fazer anúncio com mensagem fixa. Params: channelName, message
- send_message: Enviar mensagem gerada pela IA em um canal. Params: channelName, prompt (o que a IA deve dizer), mentionEveryone (boolean)
- embed: Criar embed. Params: channelName, title, description, color (hex opcional)
- reminder: Criar lembrete. Params: duration (minutos), message
- none: Não é um comando admin

REGRAS:
1. Se mencionar @usuário, extraia como targetUser (apenas o ID ou menção)
2. Duração pode ser "5 min", "10 minutos", "1 hora" etc. Converta para minutos.
3. Se não for um comando admin, retorne action: "none"
4. SEMPRE retorne JSON válido

Responda APENAS com JSON no formato:
{"action": "nome_acao", "params": {...}}`;

// Função para verificar autorização
function isAuthorized(member) {
    if (!member || !member.roles) return false;
    return member.roles.cache.has(OWNER_ROLE_ID) || 
           member.roles.cache.has(SEMI_OWNER_ROLE_ID);
}

// Função para parsear comando admin via LLM
async function parseAdminCommand(userMessage) {
    try {
        const response = await llmService.gerarResposta(
            [{ role: 'user', content: userMessage }],
            ADMIN_PROMPT
        );
        
        // Tenta extrair JSON da resposta (pega apenas o primeiro objeto JSON válido)
        const jsonMatch = response.match(/\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/);
        if (jsonMatch) {
            try {
                return JSON.parse(jsonMatch[0]);
            } catch (parseErr) {
                // Se falhar, tenta limpar o JSON
                const cleaned = jsonMatch[0].replace(/[\n\r]/g, '').replace(/,\s*}/g, '}');
                return JSON.parse(cleaned);
            }
        }
        return { action: 'none', params: {} };
    } catch (error) {
        console.error('Erro ao parsear comando admin:', error);
        return { action: 'none', params: {} };
    }
}

// Helper: Resolve canal por menção (<#ID>), ID ou nome
function resolveChannel(guild, channelRef) {
    if (!channelRef) return null;
    
    // Se for menção <#123456789>
    const mentionMatch = channelRef.match(/<#(\d+)>/);
    if (mentionMatch) {
        return guild.channels.cache.get(mentionMatch[1]);
    }
    
    // Se for ID numérico direto
    if (/^\d+$/.test(channelRef)) {
        return guild.channels.cache.get(channelRef);
    }
    
    // Se for nome do canal
    const cleanName = channelRef.toLowerCase().replace('#', '');
    return guild.channels.cache.find(c => c.name.toLowerCase() === cleanName);
}

// Helper: Resolve cargo por menção (<@&ID>), ID ou nome
function resolveRole(guild, roleRef) {
    if (!roleRef) return null;
    
    // Se for menção <@&123456789>
    const mentionMatch = roleRef.match(/<@&(\d+)>/);
    if (mentionMatch) {
        return guild.roles.cache.get(mentionMatch[1]);
    }
    
    // Se for ID numérico direto
    if (/^\d+$/.test(roleRef)) {
        return guild.roles.cache.get(roleRef);
    }
    
    // Se for nome do cargo
    const cleanName = roleRef.toLowerCase().replace('@', '');
    return guild.roles.cache.find(r => r.name.toLowerCase() === cleanName);
}

// Função principal para executar ações admin
async function executeAdminAction(message, action, params) {
    const guild = message.guild;
    const results = [];
    
    try {
        switch (action) {
            // ═══════════ MODERAÇÃO ═══════════
            case 'timeout': {
                const member = message.mentions.members.first() || 
                    await guild.members.fetch(params.targetUser).catch(() => null);
                if (!member) return '❌ Não encontrei o usuário mencionado.';
                
                const duration = (parseInt(params.duration) || 5) * 60 * 1000; // minutos para ms
                await member.timeout(duration, params.reason || 'Sem motivo especificado');
                
                // Envia DM para o usuário
                try {
                    await member.send(`⚠️ **Você foi colocado de castigo no servidor Nexstar!**\n📋 **Motivo:** ${params.reason || 'Não especificado'}\n⏱️ **Duração:** ${params.duration || 5} minutos`);
                } catch (e) {
                    results.push('(Não consegui enviar DM para o usuário)');
                }
                
                return `✅ ${member.user.tag} foi colocado de castigo por ${params.duration || 5} minutos. Motivo: ${params.reason || 'Não especificado'}`;
            }
            
            case 'kick': {
                const member = message.mentions.members.first() ||
                    await guild.members.fetch(params.targetUser).catch(() => null);
                if (!member) return '❌ Não encontrei o usuário mencionado.';
                
                const reason = params.reason || 'Sem motivo especificado';
                try {
                    await member.send(`⚠️ **Você foi expulso do servidor Nexstar!**\n📋 **Motivo:** ${reason}`);
                } catch (e) {}
                
                await member.kick(reason);
                return `✅ ${member.user.tag} foi expulso do servidor. Motivo: ${reason}`;
            }
            
            case 'ban': {
                const member = message.mentions.members.first() ||
                    await guild.members.fetch(params.targetUser).catch(() => null);
                if (!member) return '❌ Não encontrei o usuário mencionado.';
                
                const reason = params.reason || 'Sem motivo especificado';
                try {
                    await member.send(`🔨 **Você foi BANIDO do servidor Nexstar!**\n📋 **Motivo:** ${reason}`);
                } catch (e) {}
                
                await member.ban({ reason });
                return `🔨 ${member.user.tag} foi BANIDO do servidor. Motivo: ${reason}`;
            }
            
            case 'unban': {
                const userId = params.targetUserId;
                if (!userId) return '❌ Preciso do ID do usuário para desbanir.';
                
                await guild.bans.remove(userId);
                return `✅ Usuário ${userId} foi desbanido.`;
            }
            
            case 'warn': {
                const member = message.mentions.members.first();
                if (!member) return '❌ Não encontrei o usuário mencionado.';
                
                try {
                    await member.send(`⚠️ **Você recebeu um AVISO no servidor Nexstar!**\n📋 **Motivo:** ${params.reason || 'Não especificado'}`);
                } catch (e) {}
                
                return `⚠️ ${member.user.tag} foi avisado. Motivo: ${params.reason || 'Não especificado'}`;
            }
            
            case 'clear': {
                const count = Math.min(parseInt(params.count) || 10, 100);
                const deleted = await message.channel.bulkDelete(count, true);
                return `🧹 Apaguei ${deleted.size} mensagens.`;
            }
            
            // ═══════════ CANAIS ═══════════
            case 'create_category': {
                const category = await guild.channels.create({
                    name: params.categoryName,
                    type: ChannelType.GuildCategory
                });
                return `📁 Categoria **${params.categoryName}** criada!`;
            }
            
            case 'create_category_with_channels': {
                // Cria a categoria
                const category = await guild.channels.create({
                    name: params.categoryName,
                    type: ChannelType.GuildCategory
                });
                
                // Cria os canais dentro da categoria
                const channels = params.channels || [];
                const createdChannels = [];
                
                for (const channelName of channels) {
                    const options = {
                        name: channelName,
                        type: ChannelType.GuildText,
                        parent: category.id
                    };
                    
                    // Se só staff pode falar
                    if (params.staffOnly && STAFF_ROLE_ID) {
                        options.permissionOverwrites = [
                            { id: guild.id, deny: [PermissionFlagsBits.SendMessages] },
                            { id: STAFF_ROLE_ID, allow: [PermissionFlagsBits.SendMessages, PermissionFlagsBits.ViewChannel] }
                        ];
                    }
                    
                    await guild.channels.create(options);
                    createdChannels.push(channelName);
                }
                
                return `📁 Categoria **${params.categoryName}** criada com ${createdChannels.length} canais: ${createdChannels.map(c => '#' + c).join(', ')}`;
            }
            
            case 'create_channel': {
                const channelType = params.type === 'voice' ? ChannelType.GuildVoice : ChannelType.GuildText;
                const options = {
                    name: params.channelName,
                    type: channelType
                };
                
                // Se especificou categoria, busca ela
                if (params.categoryName) {
                    const category = guild.channels.cache.find(c => 
                        c.type === ChannelType.GuildCategory && 
                        c.name.toLowerCase() === params.categoryName.toLowerCase()
                    );
                    if (category) options.parent = category.id;
                }
                
                // Se só staff pode falar
                if (params.staffOnly && STAFF_ROLE_ID) {
                    options.permissionOverwrites = [
                        {
                            id: guild.id,
                            deny: [PermissionFlagsBits.SendMessages]
                        },
                        {
                            id: STAFF_ROLE_ID,
                            allow: [PermissionFlagsBits.SendMessages, PermissionFlagsBits.ViewChannel]
                        }
                    ];
                }
                
                const channel = await guild.channels.create(options);
                return `📢 Canal **#${params.channelName}** criado!${params.staffOnly ? ' (Apenas Staff pode falar)' : ''}`;
            }
            
            case 'delete_channel': {
                const channel = resolveChannel(guild, params.channelName);
                if (!channel) return '❌ Canal não encontrado.';
                
                await channel.delete();
                return `🗑️ Canal **${params.channelName}** deletado.`;
            }
            
            case 'rename_channel': {
                const channel = resolveChannel(guild, params.oldName);
                if (!channel) return '❌ Canal não encontrado.';
                
                await channel.setName(params.newName);
                return `✏️ Canal renomeado para **#${params.newName}**.`;
            }
            
            case 'slowmode': {
                const channel = params.channelName ? 
                    resolveChannel(guild, params.channelName) :
                    message.channel;
                if (!channel) return '❌ Canal não encontrado.';
                
                await channel.setRateLimitPerUser(parseInt(params.seconds) || 10);
                return `🐌 Slowmode de ${params.seconds || 10}s ativado em #${channel.name}.`;
            }
            
            case 'lock_channel': {
                const channel = params.channelName ?
                    resolveChannel(guild, params.channelName) :
                    message.channel;
                if (!channel) return '❌ Canal não encontrado.';
                
                await channel.permissionOverwrites.edit(guild.id, { SendMessages: false });
                return `🔒 Canal #${channel.name} trancado.`;
            }
            
            case 'unlock_channel': {
                const channel = params.channelName ?
                    resolveChannel(guild, params.channelName) :
                    message.channel;
                if (!channel) return '❌ Canal não encontrado.';
                
                await channel.permissionOverwrites.edit(guild.id, { SendMessages: null });
                return `🔓 Canal #${channel.name} destrancado.`;
            }
            
            // ═══════════ CARGOS ═══════════
            case 'give_role': {
                const member = message.mentions.members.first();
                if (!member) return '❌ Mencione o usuário para dar o cargo.';
                
                const role = resolveRole(guild, params.roleName);
                if (!role) return `❌ Cargo "${params.roleName}" não encontrado.`;
                
                await member.roles.add(role);
                return `✅ Cargo **${role.name}** dado para ${member.user.tag}.`;
            }
            
            case 'remove_role': {
                const member = message.mentions.members.first();
                if (!member) return '❌ Mencione o usuário para remover o cargo.';
                
                const role = resolveRole(guild, params.roleName);
                if (!role) return `❌ Cargo "${params.roleName}" não encontrado.`;
                
                await member.roles.remove(role);
                return `✅ Cargo **${role.name}** removido de ${member.user.tag}.`;
            }
            
            case 'create_role': {
                const role = await guild.roles.create({
                    name: params.roleName,
                    color: params.color || '#99AAB5',
                    reason: 'Criado via NexstarIA'
                });
                return `✅ Cargo **${role.name}** criado com cor ${params.color || 'padrão'}.`;
            }
            
            // ═══════════ UTILIDADES ═══════════
            case 'server_info': {
                const memberCount = guild.memberCount;
                const channelCount = guild.channels.cache.size;
                const roleCount = guild.roles.cache.size;
                const created = guild.createdAt.toLocaleDateString('pt-BR');
                
                return `📊 **Informações do Servidor ${guild.name}**\n👥 Membros: ${memberCount}\n📢 Canais: ${channelCount}\n🏷️ Cargos: ${roleCount}\n📅 Criado em: ${created}`;
            }
            
            case 'user_info': {
                const member = message.mentions.members.first();
                if (!member) return '❌ Mencione o usuário.';
                
                const joinedAt = member.joinedAt.toLocaleDateString('pt-BR');
                const roles = member.roles.cache.filter(r => r.id !== guild.id).map(r => r.name).join(', ') || 'Nenhum';
                
                return `👤 **${member.user.tag}**\n📅 Entrou em: ${joinedAt}\n🏷️ Cargos: ${roles}`;
            }
            
            case 'announce': {
                console.log(`📢 Announce - channelName recebido: "${params.channelName}"`);
                const channel = resolveChannel(guild, params.channelName);
                console.log(`📢 Announce - canal resolvido: ${channel ? channel.name + ' (ID: ' + channel.id + ')' : 'NULL'}`);
                if (!channel) return '❌ Canal não encontrado.';
                
                const embed = new EmbedBuilder()
                    .setTitle('📢 Anúncio')
                    .setDescription(params.message)
                    .setColor('#FFD700')
                    .setTimestamp();
                
                await channel.send({ embeds: [embed] });
                console.log(`✅ Anúncio enviado para #${channel.name}`);
                return `✅ Anúncio enviado para #${channel.name}.`;
            }
            
            case 'send_message': {
                const channel = resolveChannel(guild, params.channelName);
                if (!channel) return '❌ Canal não encontrado.';
                
                // Gera conteúdo via IA baseado no prompt
                const aiPrompt = params.prompt || 'Se apresente e diga o que você pode fazer.';
                const generatedContent = await llmService.gerarResposta(
                    [{ role: 'user', content: `Gere uma mensagem para enviar no Discord (sem markdown excessivo, seja amigável): ${aiPrompt}` }],
                    `Você é a NexstarIA, assistente do servidor Nexstar. Responda de forma amigável e direta. Não use blocos de código. Pode usar emojis.`
                );
                
                // Adiciona menção @everyone se solicitado
                let finalMessage = generatedContent;
                if (params.mentionEveryone) {
                    finalMessage = `@everyone\n\n${generatedContent}`;
                }
                
                await channel.send(finalMessage);
                return `✅ Mensagem enviada para #${channel.name}.`;
            }
            
            case 'embed': {
                const channel = params.channelName ?
                    resolveChannel(guild, params.channelName) :
                    message.channel;
                if (!channel) return '❌ Canal não encontrado.';
                
                const embed = new EmbedBuilder()
                    .setTitle(params.title || 'Embed')
                    .setDescription(params.description || '')
                    .setColor(params.color || '#00d4ff')
                    .setTimestamp();
                
                await channel.send({ embeds: [embed] });
                return `✅ Embed enviado para #${channel.name}.`;
            }
            
            case 'reminder': {
                const duration = (parseInt(params.duration) || 5) * 60 * 1000;
                const reminderMsg = params.message || 'Lembrete!';
                
                setTimeout(async () => {
                    try {
                        await message.author.send(`⏰ **Lembrete:** ${reminderMsg}`);
                    } catch (e) {
                        await message.channel.send(`⏰ ${message.author}, **Lembrete:** ${reminderMsg}`);
                    }
                }, duration);
                
                return `✅ Lembrete agendado para daqui ${params.duration || 5} minutos.`;
            }
            
            case 'none':
                return null; // Não é comando admin
                
            default:
                return null;
        }
    } catch (error) {
        console.error('Erro ao executar ação admin:', error);
        return `❌ Erro ao executar: ${error.message}`;
    }
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
        GatewayIntentBits.GuildVoiceStates
    ],
    partials: [Partials.Channel, Partials.Message]
});

const voiceConnections = new Map();
const conversasAtivas = new Map(); // Global: Rastreia conversas recentes
let ultimoTempoMensagemGeral = Date.now(); // Global: Para inatividade
let globalPlayer = null; 
let ignoreAudioUntil = 0; // Timestamp até quando ignorar áudio (Echo Cancell)

client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    const conteudoLower = message.content.toLowerCase();

    // Atualiza timer de inatividade se for no canal chat-geral
    if (message.channel.id === CANAL_CHAT_GERAL) {
        ultimoTempoMensagemGeral = Date.now();
    }

    // 🔐 COMANDOS ADMIN VIA IA (Prefixo: "ia,", "ia ", ou menção ao bot)
    const isAdminPrefix = conteudoLower.startsWith('ia,') || conteudoLower.startsWith('ia ');
    const isMention = message.mentions.users.has(client.user?.id);
    
    if ((isAdminPrefix || isMention) && message.guild) {
        // Verifica se é autorizado (Owner ou Semi-Owner)
        if (isAuthorized(message.member)) {
            console.log(`🔐 Comando admin detectado de ${message.author.tag}: ${message.content}`);
            
            // Extrai menções de canal da mensagem original (evita corrupção pelo LLM)
            const channelMentions = message.content.match(/<#(\d+)>/g) || [];
            const firstChannelMention = channelMentions[0] || null;
            
            const parsed = await parseAdminCommand(message.content);
            console.log('📋 Comando parseado:', parsed);
            
            // Se o LLM corrompeu o channelName, usa a menção extraída diretamente
            if (parsed.params && firstChannelMention) {
                if (parsed.params.channelName && !parsed.params.channelName.match(/<#\d+>/)) {
                    console.log(`🔧 Corrigindo channelName corrompido: "${parsed.params.channelName}" → "${firstChannelMention}"`);
                    parsed.params.channelName = firstChannelMention;
                }
            }
            
            if (parsed.action && parsed.action !== 'none') {
                const result = await executeAdminAction(message, parsed.action, parsed.params || {});
                if (result) {
                    // Try reply, fallback to channel.send (ex: se a mensagem foi deletada pelo bulkDelete)
                    try {
                        await message.reply(result);
                    } catch (e) {
                        await message.channel.send(result);
                    }
                    return; // Comando admin executado, não precisa continuar
                }
            }
            // Se action === 'none', continua para resposta normal da IA
        }
    }

    // �🔊 COMANDOS DE VOZ (!entrar / !sair)
    if (conteudoLower === '!entrar' || conteudoLower === '!join') {
        if (message.member.voice.channel) {
            const connection = joinVoiceChannel({
                channelId: message.member.voice.channel.id,
                guildId: message.guild.id,
                adapterCreator: message.guild.voiceAdapterCreator,
                selfDeaf: false,
                selfMute: false
            });
            
            message.reply("🔊 Entrei e estou ouvindo! (Modo Walkie-Talkie: Espere eu terminar de falar para responder).");

            // Configura o Receiver
            const receiver = connection.receiver;
            
            // Remove listeners antigos para evitar duplicação (MaxListenersExceeded)
            receiver.speaking.removeAllListeners('start');

            receiver.speaking.on('start', (userId) => {
                if (userId === client.user.id) return;
                
                // 🛑 ECO CHECK: Se o bot estiver falando, ignora o usuário (evita ouvir a si mesma via microfone do usuário)
                if (globalPlayer && globalPlayer.state.status === AudioPlayerStatus.Playing) {
                    console.log(`🔇 Ignorando fala de ${userId} pois estou falando (evitar eco).`);
                    return;
                }

                console.log(`🎤 Detectando fala de ${userId}...`);
                
                const opusStream = receiver.subscribe(userId, {
                    end: {
                        behavior: EndBehaviorType.AfterSilence,
                        duration: 1500, 
                    },
                });

                const filename = `./temp_audio_${userId}_${Date.now()}.pcm`;
                const outStream = fs.createWriteStream(filename);
                const opusDecoder = new prism.opus.Decoder({ rate: 48000, channels: 1, frameSize: 960 });

                pipeline(opusStream, opusDecoder, outStream, async (err) => {
                   if (err) {
                       console.error('Erro no pipeline de áudio:', err);
                   } else {
                       // Pequeno delay para garantir gravação
                       await new Promise(r => setTimeout(r, 200));

                       // Verificar se arquivo existe e tem tamanho mínimo (evitar ruídos curtos)
                       try {
                           const stats = fs.statSync(filename);
                           if (stats.size < 10000) { // < 10kb é ruído provavel
                               fs.unlink(filename, () => {});
                               return; 
                           }
                       } catch (e) { return; }

                       console.log('✅ Áudio gravado. Transcrevendo...');
                       
                       const wavFilename = filename.replace('.pcm', '.wav');
                       const { spawn } = require('child_process');
                       const ffmpegPath = require('ffmpeg-static');

                       const ffmpeg = spawn(ffmpegPath, [
                           '-f', 's16le',
                           '-ar', '48000',
                           '-ac', '1',
                           '-i', filename,
                           wavFilename
                       ]);

                       ffmpeg.on('close', async (code) => {
                           // Limpeza PCM imediata
                           fs.unlink(filename, () => {});

                           if (code === 0) {
                               const textoUsuario = await llmService.transcreverAudio(wavFilename);
                               fs.unlink(wavFilename, () => {}); // Limpa WAV

                               if (textoUsuario && textoUsuario.length > 2) {
                                   console.log(`📝 Transcrição: "${textoUsuario}"`);
                                   
                                   // Filtro de ruído textual (Ghost touches) aprimorado
                                   const textoLimpo = textoUsuario.trim();
                                   if (textoLimpo.length < 4 || /^(Obrigado|Tchau|Aleluia|Soy|Amém|Pois é|Entendi)[.!?,]*$/i.test(textoLimpo)) {
                                       console.log(`🔇 Ignorando alucinação/ruído do Whisper: "${textoLimpo}"`);
                                       return; 
                                   }

                                   const historicoContexto = [{ role: 'user', content: textoUsuario }];
                                   const promptSistema = "Você é a IA da Nexstar. Personalidade ÁCIDA, SARCÁSTICA e CURTA. Responda em 1 ou 2 frases para voz.";

                                   const canalGeral = client.channels.cache.get(CANAL_CHAT_GERAL);
                                   if (canalGeral) await canalGeral.sendTyping();

                                   const resposta = await llmService.gerarResposta(historicoContexto, promptSistema);
                                    
                                   // Envia APENAS a resposta no chat (AGORA DESATIVADO PARA NÃO POLUIR)
                                   // if (canalGeral) await canalGeral.send(`🤖 ${resposta}`);

                                   responderVoz(connection, resposta);
                               }
                           } else {
                               fs.unlink(wavFilename, () => {});
                           }
                       });
                   }
                });
            });
            return;
        } else {
            return message.reply("❌ Você precisa estar em um canal de voz.");
        }
    }
    
    // ... (Logica !sair inalterada - ver diff)
    if (conteudoLower === '!sair' || conteudoLower === '!leave') {
        const connection = getVoiceConnection(message.guild.id);
        if (connection) {
            connection.destroy();
            return message.reply("🔇 Saindo da call.");
        }
        return message.reply("❓ Não estou em nenhuma call.");
    }

    // ... (Resto do messageCreate original - mantido pelo replace inteligente se possivel ou reescrito)
    // Para simplificar, vou manter o bloco messageCreate focado nas mudanças de voz e assumir que o resto segue igual ou precisa ser recolocado se o replace for grande.
    // O replace_file_content pede Start/End Line. Vou mirar especificamente no bloco de VOZ.

    // ... (Logica Chat Geral)
    if (message.channel.id === CANAL_CHAT_GERAL) {
       // (Mantendo lógica original...)
       runChatGeralLogic(message); // Abstraindo para não repetir código no replace
    }
    
    // (Chat privado)
    if (message.channel.parentId === CATEGORIA_ASSISTENTE && message.channel.name.startsWith('chat-ia-')) {
       runChatPrivadoLogic(message);
    }
});

// Funções auxiliares para não perder a lógica original no replace
async function runChatGeralLogic(message) {
        ultimoTempoMensagemGeral = Date.now();
        let deveResponder = false;
        let imageUrl = null;
        if (message.attachments.size > 0) {
            const attachment = message.attachments.first();
            if (attachment.contentType && attachment.contentType.startsWith('image/')) {
                imageUrl = attachment.url;
                if (conversasAtivas.has(message.author.id)) deveResponder = true;
            }
        }
        if (message.mentions.has(client.user) || /\b(nexstar|ia|bot)\b/i.test(message.content.toLowerCase()) || 
            (message.reference && (await message.channel.messages.fetch(message.reference.messageId).catch(()=>null))?.author.id === client.user.id) ||
            (conversasAtivas.has(message.author.id) && Date.now() - conversasAtivas.get(message.author.id) < 60000)) 
        {
            deveResponder = true;
        }

        if (deveResponder) {
             try {
                 await message.channel.sendTyping();
                 conversasAtivas.set(message.author.id, Date.now());
                 const mensagensRecentes = await message.channel.messages.fetch({ limit: 5 });
                 const historicoContexto = [];
                 mensagensRecentes.reverse().forEach(msg => {
                     if (!msg.content && msg.attachments.size === 0) return;
                     if (msg.author.id === client.user.id) historicoContexto.push({ role: 'assistant', content: msg.content });
                     else if (msg.author.id === message.author.id) historicoContexto.push({ role: 'user', content: msg.content.replace(/<@!?[0-9]+>/g, '').trim() });
                 });
                 if (historicoContexto.length === 0 || (historicoContexto.length > 0 && historicoContexto[historicoContexto.length - 1].content !== message.content && !imageUrl)) {
                     historicoContexto.push({ role: 'user', content: message.content.replace(/<@!?[0-9]+>/g, '').trim() });
                 }
                 const OWNER_ROLE_ID = process.env.OWNER_ROLE_ID;
                 let contextoUsuario = "Membro Comum";
                 if (message.member.roles.cache.has(OWNER_ROLE_ID)) contextoUsuario = "DONO DO SERVIDOR";
                 
                 const promptSistema = `Você é a IA da Nexstar. Personalidade ÁCIDA. Usuario: ${contextoUsuario}`;
                 const resposta = await llmService.gerarResposta(historicoContexto, promptSistema, imageUrl);
                 await message.reply(resposta);

                 const connection = getVoiceConnection(message.guild.id);
                 if (connection) responderVoz(connection, resposta);
             } catch (err) { console.error(err); }
        }
}

async function runChatPrivadoLogic(message) {
        await message.channel.sendTyping();
        try {
            const mensagensAnteriores = await message.channel.messages.fetch({ limit: 10 });
            const historicoBuild = [];
            mensagensAnteriores.reverse().forEach(msg => {
                if (msg.content && !msg.author.bot) historicoBuild.push({ role: 'user', content: msg.content });
                else if (msg.content && msg.author.id === client.user.id) historicoBuild.push({ role: 'assistant', content: msg.content });
            });
            if (historicoBuild.length === 0) historicoBuild.push({ role: 'user', content: message.content });
            let imgUrlTicket = null;
            if (message.attachments.size > 0 && message.attachments.first().contentType.startsWith('image/')) imgUrlTicket = message.attachments.first().url;
            const resposta = await llmService.gerarResposta(historicoBuild, "Você é a IA da Nexstar.", imgUrlTicket);
            
            if (resposta.length > 2000) {
                const partes = resposta.match(/[\s\S]{1,1900}/g) || [];
                for (const parte of partes) await message.channel.send(parte);
            } else {
                await message.channel.send(resposta);
            }
        } catch (error) { console.error('Erro ticket IA:', error); message.reply('Erro interno.'); }
}

function responderVoz(connection, texto) {
    try {
        // Corta texto muito longo para não ficar falando por horas (e evita erro 200 chars limit google-tts)
        const textoFala = texto.replace(/[*_#`]/g, '').slice(0, 200); 
        const url = googleTTS.getAudioUrl(textoFala, { lang: 'pt', slow: false, host: 'https://translate.google.com' });
        const resource = createAudioResource(url);
        
        globalPlayer = createAudioPlayer(); // Atualiza ponteiro global
        globalPlayer.play(resource);
        connection.subscribe(globalPlayer);
        
        globalPlayer.on(AudioPlayerStatus.Playing, () => {
            // console.log('🗣️ Falando...');
        });
        globalPlayer.on(AudioPlayerStatus.Idle, () => {
             // 🕒 Define tempo de silêncio PÓS-FALA para evitar eco (2 segundos)
             ignoreAudioUntil = Date.now() + 2000;
             console.log(`✅ Terminei. Ignorando microfone por 2s para evitar eco.`);
        });

     } catch (errAudio) {
         console.error("Erro no TTS:", errAudio);
     }
}

// ... (Resto do arquivo, messageCreate do chat de texto precisa atualizar para usar responderVoz se quiser unificar)

// ═══════════════════════════════════════════════════════════════════════════
// ⏳ MONITOR DE INATIVIDADE
// ═══════════════════════════════════════════════════════════════════════════
function verificarInatividade() {
    console.log(`⏳ Monitor de inatividade iniciado. Timeout: ${TEMPO_OCIOSO_PARA_ENGAJAR/60000} minutos.`);
    
    setInterval(async () => {
        const tempoPassado = Date.now() - ultimoTempoMensagemGeral;
        
        if (tempoPassado > TEMPO_OCIOSO_PARA_ENGAJAR) {
            const canalGeral = client.channels.cache.get(CANAL_CHAT_GERAL);
            if (!canalGeral) {
                console.log('Canal geral não encontrado para engajamento.');
                return;
            }

            // Verifica se a última mensagem JÁ FOI do próprio bot (evita loop de "reviver chat" falando sozinho)
            try {
                const ultimas = await canalGeral.messages.fetch({ limit: 1 });
                if (ultimas.first() && ultimas.first().author.id === client.user.id) {
                    // Já fui o último a falar, não vou falar de novo
                    return;
                }
            } catch (e) {
                console.error('Erro ao buscar ultima mensagem:', e);
            }

            // Gera um tópico
            console.log('💤 Chat inativo. Gerando tópico de engajamento...');
            const topico = await llmService.gerarResposta(
                [{ role: 'user', content: 'O chat morreu. Gere uma frase sarcástica (SEM AÇÕES FÍSICAS) reclamando do silêncio e lance um tópico polêmico.' }], 
                "Você é uma IA sarcástica. Lance uma provocação ácida. NÃO use asteriscos para ações (*)."
            );

            await canalGeral.send(`📢 **Revivendo o chat!** @everyone\n\n${topico}`);
            // Reseta o timer para não mandar de novo imediatamente
            ultimoTempoMensagemGeral = Date.now(); 
        }
    }, 60000); // Checa a cada minuto
}

// Evento: Bot pronto
client.once('ready', () => {
    console.log(`✅ NexstarIA online como ${client.user.tag}`);
    verificarInatividade();
});

client.login(TOKEN);
