// ═══════════════════════════════════════════════════════════════════════════
// 🤖 NEXSTAR IA - ASSISTENTE INTELIGENTE
// ═══════════════════════════════════════════════════════════════════════════
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

// ═══════════════════════════════════════════════════════════════════════════
// 🧠 SERVIÇO DE IA (WRAPPER)
// ═══════════════════════════════════════════════════════════════════════════
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

    async gerarResposta(mensagens, systemPrompt = "Você é a IA da Nexstar, um assistente útil e amigável.") {
        if (this.mode === 'MOCK') {
            await new Promise(r => setTimeout(r, 1000)); // Simula delay
            
            // Simula uma resposta baseada no último input
            const ultimaMsg = mensagens[mensagens.length - 1].content;
            return `[MODO TESTE] Recebi sua mensagem: "${ultimaMsg}".\n\nComo não tenho API Key configurada no .env (OPENAI_API_KEY), estou respondendo automaticamente. Configure a chave para eu falar de verdade! 🧠`;
        }

        try {
            const completion = await this.client.chat.completions.create({
                messages: [
                    { role: "system", content: systemPrompt },
                    ...mensagens
                ],
                model: MODELO_IA,
            });
            return completion.choices[0].message.content;
        } catch (error) {
            console.error('Erro na API IA:', error);
            return "Desculpe, tive um problema ao processar seu pensamento. Tente novamente mais tarde.";
        }
    }
}

const llmService = new LLMService();

// ═══════════════════════════════════════════════════════════════════════════
// 🤖 CLIENTE DISCORD
// ═══════════════════════════════════════════════════════════════════════════
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ],
    partials: [Partials.Channel, Partials.Message]
});

// Variáveis de Estado
let ultimoTempoMensagemGeral = Date.now();
const conversasAtivas = new Map(); // Rastreia usuários com quem o bot falou recentemente
const TEMPO_OCIOSO_PARA_ENGAJAR = 30 * 60 * 1000; // 30 minutos

// ═══════════════════════════════════════════════════════════════════════════
// 🔔 EVENTO READY
// ═══════════════════════════════════════════════════════════════════════════
client.once('ready', async () => {
    console.log(`${EMOJIS.IA} Bot Nexstar IA está online como ${client.user.tag}!`);
    console.log(`📋 Monitorando: Canal Geral (${CANAL_CHAT_GERAL}) e Categoria Assistente (${CATEGORIA_ASSISTENTE})`);
    
    // Inicia verificação de inatividade do chat geral
    verificarInatividade();
    
    // Envia mensagem de setup no canal do assistente se não tiver
    setupCanalAssistente();
});

async function setupCanalAssistente() {
    try {
        const canal = await client.channels.fetch(CANAL_ASSISTENTE);
        if (!canal) return console.error('Canal Assistente não encontrado!');

        // Verifica se já tem a mensagem do bot (simplificado, pega as ultimas 10)
        const mensagens = await canal.messages.fetch({ limit: 10 });
        const jaEnviou = mensagens.find(m => m.author.id === client.user.id && m.embeds.length > 0);

        if (!jaEnviou) {
            const embed = new EmbedBuilder()
                .setColor(CORES.IA)
                .setTitle(`${EMOJIS.IA} Nexstar Inteligência Artificial`)
                .setDescription(
                    `Olá! Eu sou a IA da Nexstar. 🧠\n\n` +
                    `Estou aqui para conversar, tirar dúvidas, ajudar com códigos ou apenas bater um papo.\n\n` +
                    `**Como funciona?**\n` +
                    `Clique no botão abaixo para abrir uma **sala privada** comigo. Nossa conversa será totalmente confidencial.`
                )
                .setFooter({ text: 'Nexstar AI' });

            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('iniciar_chat_ia')
                        .setLabel('Iniciar Conversa Privada')
                        .setStyle(ButtonStyle.Primary)
                        .setEmoji(EMOJIS.CHAT)
                );

            await canal.send({ embeds: [embed], components: [row] });
            console.log('Mensagem de setup enviada no canal assistente.');
        }
    } catch (error) {
        console.error('Erro no setup do canal assistente:', error);
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// 🎮 INTERAÇÕES (BOTÕES)
// ═══════════════════════════════════════════════════════════════════════════
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isButton()) return;

    if (interaction.customId === 'iniciar_chat_ia') {
        await interaction.deferReply({ ephemeral: true });

        // Nome do canal: chat-ia-username
        const nomeCanal = `chat-ia-${interaction.user.username}`.toLowerCase().replace(/[^a-z0-9]/g, '-');
        
        // Verifica se canal já existe na guilda
        const canalExistente = interaction.guild.channels.cache.find(c => c.name === nomeCanal);
        if (canalExistente) {
            return interaction.editReply({ 
                content: `${EMOJIS.ERRO} Você já tem uma conversa aberta em ${canalExistente}!` 
            });
        }

        try {
            // Cria canal privado
            const ticketChannel = await interaction.guild.channels.create({
                name: nomeCanal,
                type: ChannelType.GuildText,
                parent: CATEGORIA_ASSISTENTE,
                permissionOverwrites: [
                    {
                        id: interaction.guild.id,
                        deny: [PermissionFlagsBits.ViewChannel],
                    },
                    {
                        id: interaction.user.id,
                        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory],
                    },
                    {
                        id: client.user.id,
                        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory], // Importante: Bot precisa ler histórico
                    }
                ]
            });

            const embed = new EmbedBuilder()
                .setColor(CORES.IA)
                .setTitle(`${EMOJIS.IA} Conversa Iniciada`)
                .setDescription(`Olá ${interaction.user}! Eu sou a IA da Nexstar.\nComo posso te ajudar hoje?`)
                .setFooter({ text: 'Para encerrar, clique no botão abaixo.' });

            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('fechar_chat_ia')
                        .setLabel('Encerrar Conversa')
                        .setStyle(ButtonStyle.Danger)
                        .setEmoji('🔒')
                );

            await ticketChannel.send({ content: `${interaction.user}`, embeds: [embed], components: [row] });

            interaction.editReply({ content: `${EMOJIS.SUCESSO} Sua conversa foi iniciada em ${ticketChannel}!` });

        } catch (error) {
            console.error('Erro ao criar canal:', error);
            interaction.editReply({ content: 'Erro ao criar a sala de conversa. Verifique minhas permissões.' });
        }
    }

    if (interaction.customId === 'fechar_chat_ia') {
        if (!interaction.channel.name.startsWith('chat-ia-')) {
            return interaction.reply({ content: 'Este botão não pode ser usado aqui.', ephemeral: true });
        }

        await interaction.reply({ content: '🔒 Encerrando conversa em 5 segundos...' });
        setTimeout(() => {
            interaction.channel.delete().catch(console.error);
        }, 5000);
    }
});

// ═══════════════════════════════════════════════════════════════════════════
// 📨 MENSAGENS (CHAT)
// ═══════════════════════════════════════════════════════════════════════════
client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    // 1. Monitoramento do Chat Geral (Inatividade e Contexto)
    if (message.channel.id === CANAL_CHAT_GERAL) {
        ultimoTempoMensagemGeral = Date.now();
        
        let deveResponder = false;

        // Se a IA for mencionada diretamente OU chamada pelo nome
        const conteudo = message.content.toLowerCase();
        if (message.mentions.has(client.user) || /\b(nexstar|ia|bot)\b/i.test(conteudo)) {
             deveResponder = true;
        }
        // Se a mensagem for uma resposta a uma mensagem da IA
        else if (message.reference) {
            try {
                const mensagemReferenciada = await message.channel.messages.fetch(message.reference.messageId);
                if (mensagemReferenciada.author.id === client.user.id) {
                    deveResponder = true;
                }
            } catch (e) { /* ignore erro de fetch */ }
        }
        // Se estiver em uma "Conversa Ativa" (respondeu recentemente ao usuário)
        else if (conversasAtivas.has(message.author.id)) {
            const ultimaInteracao = conversasAtivas.get(message.author.id);
            // Janela de 60 segundos para continuar conversando sem marcar
            if (Date.now() - ultimaInteracao < 60000) {
                deveResponder = true;
            } else {
                conversasAtivas.delete(message.author.id);
            }
        }

        if (deveResponder) {
             try {
                 await message.channel.sendTyping();
                 conversasAtivas.set(message.author.id, Date.now()); // Atualiza tempo da conversa

                 // Pega pequeno histórico para contexto
                 const mensagensRecentes = await message.channel.messages.fetch({ limit: 5 });
                 const historicoContexto = [];
                 mensagensRecentes.reverse().forEach(msg => {
                     if (!msg.content) return;
                     if (msg.author.id === client.user.id) historicoContexto.push({ role: 'assistant', content: msg.content });
                     else if (msg.author.id === message.author.id) historicoContexto.push({ role: 'user', content: msg.content.replace(/<@!?[0-9]+>/g, '').trim() });
                 });
                 
                 // Garante que a mensagem atual esteja no histórico se o fetch falhar
                 if (historicoContexto.length === 0 || historicoContexto[historicoContexto.length - 1].content !== message.content) {
                     historicoContexto.push({ role: 'user', content: message.content.replace(/<@!?[0-9]+>/g, '').trim() });
                 }

const OWNER_ROLE_ID = process.env.OWNER_ROLE_ID;
const SEMI_OWNER_ROLE_ID = process.env.SEMI_OWNER_ROLE_ID;
const STAFF_ROLE_ID = process.env.STAFF_ROLE_ID;

// ...

                 // Identifica Cargos
                 let contextoUsuario = "Membro Comum";
                 if (message.member.roles.cache.has(OWNER_ROLE_ID) || message.member.roles.cache.has(SEMI_OWNER_ROLE_ID)) {
                     contextoUsuario = "DONO (ou Semi-Dono) DO SERVIDOR (Supremo)";
                 }
                 else if (message.member.roles.cache.has(STAFF_ROLE_ID)) contextoUsuario = "STAFF (Moderador)";
                 
                 const promptSistema = `Você é a IA da Nexstar. 
PERSONALIDADE: Seu humor é SECO, CÍNICO e SARCÁSTICO.
REGRAS CRITICAS:
- PROIBIDO usar narração de ações (ex: *suspira*, *revira os olhos*, *explode*). Fale apenas o texto.
- Não seja histérica ou dramática. Seja fria e debochada.
- Se o usuário for DONO: Respeito absoluto.
- Se o usuário for STAFF: Respeito, mas com ar superior.
- Se for Membro Comum: Trate como se você estivesse fazendo um favor enorme em responder. Use emojis de tédio (🙄, 🥱, 💅).
- Se a pergunta for ruim, diga "Que pergunta. Melhore."
CONTEXTO ATUAL: Você está falando com um ${contextoUsuario}.`;

                 const resposta = await llmService.gerarResposta(historicoContexto, promptSistema);
                 return message.reply(resposta);
             } catch (err) {
                 console.error(err);
             }
        }
    }

    // 2. Chat Privado (Ticket IA)
    // Verifica se é um canal de IA (pelo nome E categoria)
    if (message.channel.parentId === CATEGORIA_ASSISTENTE && message.channel.name.startsWith('chat-ia-')) {
        await message.channel.sendTyping();

        // Coleta histórico recente (últimas 10 mensagens) para contexto
        try {
            const mensagensAnteriores = await message.channel.messages.fetch({ limit: 10 });
            const historicoBuild = [];
            
            // Ordena cronologicamente
            mensagensAnteriores.reverse().forEach(msg => {
                // Ignora mensagens de sistema/embeds iniciais sem conteudo relevante
                if (msg.content && !msg.author.bot) {
                    historicoBuild.push({ role: 'user', content: msg.content });
                } else if (msg.content && msg.author.id === client.user.id) {
                    historicoBuild.push({ role: 'assistant', content: msg.content });
                }
            });

            // Se for a primeira mensagem e só tiver ela mesma
            if (historicoBuild.length === 0) {
                 historicoBuild.push({ role: 'user', content: message.content });
            }

            const resposta = await llmService.gerarResposta(historicoBuild);
            
            // Discord tem limite de 2000 caracteres
            if (resposta.length > 2000) {
                const partes = resposta.match(/[\s\S]{1,1900}/g) || [];
                for (const parte of partes) {
                    await message.channel.send(parte);
                }
            } else {
                await message.channel.send(resposta);
            }

        } catch (error) {
            console.error('Erro ao processar mensagem IA:', error);
            message.reply('Desculpe, tive um erro interno ao processar sua mensagem.');
        }
    }
});

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

            await canalGeral.send(`📢 **Revivendo o chat!** @here\n\n${topico}`);
            // Reseta o timer para não mandar de novo imediatamente
            ultimoTempoMensagemGeral = Date.now(); 
        }
    }, 60000); // Checa a cada minuto
}

client.login(TOKEN);
