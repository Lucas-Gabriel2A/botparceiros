/**
 * ╔═══════════════════════════════════════════════════════════════════════════╗
 * ║                      COREBOT IA - ASSISTENTE INTELIGENTE                  ║
 * ║                        Chat IA + Admin Commands                           ║
 * ╚═══════════════════════════════════════════════════════════════════════════╝
 * 
 * Features:
 * - LLM Service (OpenAI/Groq) para chat
 * - Comandos admin via linguagem natural
 * - Monitor de inatividade
 */

import {
    Client,
    GatewayIntentBits,
    Partials,
    EmbedBuilder,
    ChannelType,
    PermissionFlagsBits,
    Message,
    GuildMember,
    Guild,
    TextChannel,
    Role,
    GuildChannel,
    SlashCommandBuilder
} from 'discord.js';

import OpenAI from 'openai';

import {
    config,
    logger,
    query,
    testConnection,
    initializeSchema,
    logAudit,
    closePool,
    upsertGuildConfig,
    getGuildConfig,
    checkAiLimit,
    incrementAiUsage,
    getLimitMessage,
    checkServerGenLimit,
    incrementServerGenUsage,
} from '../../shared/services';
import { serverBuilder } from '../../shared/services/server-builder.service';
import { getBrandingFooter, applyBranding } from '../../shared/services/branding.service';
import { trackEvent } from '../../shared/services/analytics.service';
import { createPartnership, listPartnerships, removePartnership } from '../../shared/services/partnerships.service';
import { setupWelcomeEvents } from '../welcome/events';
import { setupAutoModEvents } from '../automod/events';
import { setupTicketEvents, TICKET_EVENTS } from '../tickets/events';
import { commandEngine } from '../custom-commands/engine';
import { customCommandService } from '../custom-commands/service';
import { setupPrivateCallsEvents, PRIVATE_CALLS_EVENTS } from '../private-calls/events';


let dbConnected = false;

// ═══════════════════════════════════════════════════════════════════════════
// 🔐 VALIDAÇÃO
// ═══════════════════════════════════════════════════════════════════════════

config.validate(['DISCORD_TOKEN_AGENTE_IA', 'OPENAI_API_KEY']);

const TOKEN = config.get('DISCORD_TOKEN_AGENTE_IA');
const OPENAI_API_KEY = config.get('OPENAI_API_KEY');
const LLM_BASE_URL = config.getOptional('LLM_BASE_URL') || 'https://api.openai.com/v1';
const MODELO_IA = config.getOptional('MODELO_IA') || 'gpt-3.5-turbo';

const CATEGORIA_ASSISTENTE = config.getOptional('CATEGORIA_ASSISTENTE');
const CANAL_CHAT_GERAL = config.getOptional('CANAL_CHAT_GERAL');
// const OWNER_ROLE_ID = config.get('OWNER_ROLE_ID'); // Removed for multi-tenancy
const STAFF_ROLE_ID = config.getOptional('STAFF_ROLE_ID');

// ═══════════════════════════════════════════════════════════════════════════
// 📊 TIPOS
// ═══════════════════════════════════════════════════════════════════════════

interface ChatMessage {
    role: 'system' | 'user' | 'assistant';
    content: string | Array<{ type: string; text?: string; image_url?: { url: string } }>;
}

interface ParsedCommand {
    action: string;
    params: Record<string, any>;
}

// ═══════════════════════════════════════════════════════════════════════════
// 🎨 CONSTANTES
// ═══════════════════════════════════════════════════════════════════════════

const TEMPO_OCIOSO_PARA_ENGAJAR = 30 * 60 * 1000; // 30 min

// ═══════════════════════════════════════════════════════════════════════════
// 🧠 SERVIÇO DE IA
// ═══════════════════════════════════════════════════════════════════════════

class LLMService {
    private client: OpenAI | null = null;
    private mode: 'API' | 'MOCK' = 'MOCK';

    constructor() {
        if (OPENAI_API_KEY) {
            this.client = new OpenAI({
                apiKey: OPENAI_API_KEY,
                baseURL: LLM_BASE_URL
            });
            this.mode = 'API';
            logger.info(`🧠 LLM Service iniciado em modo API (${LLM_BASE_URL})`);
        } else {
            logger.warn('⚠️ SEM CHAVE DE API. LLM Service em modo MOCK.');
        }
    }



    async gerarResposta(mensagens: ChatMessage[], systemPrompt = "Você é a IA do CoreBot.", imageUrl: string | null = null): Promise<string> {
        if (this.mode === 'MOCK') {
            await new Promise(r => setTimeout(r, 1000));
            return `[MOCK] Recebi texto e ${imageUrl ? 'uma imagem' : 'nenhuma imagem'}. Configure a API Key!`;
        }

        try {
            const mensagensPayload: ChatMessage[] = [
                { role: "system", content: systemPrompt },
                ...mensagens
            ];

            let modelToUse = MODELO_IA;

            if (imageUrl) {
                logger.info("👁️ Imagem detectada! Alternando para modelo Vision.");
                modelToUse = "meta-llama/llama-4-scout-17b-16e-instruct";

                const lastMsgIndex = mensagensPayload.length - 1;
                const lastMsg = mensagensPayload[lastMsgIndex];

                if (lastMsg.role === 'user' && typeof lastMsg.content === 'string') {
                    mensagensPayload[lastMsgIndex] = {
                        role: 'user',
                        content: [
                            { type: "text", text: lastMsg.content || "Analise esta imagem." },
                            { type: "image_url", image_url: { url: imageUrl } }
                        ]
                    };
                }
            }

            const completion = await this.client!.chat.completions.create({
                messages: mensagensPayload as any,
                model: modelToUse,
            });
            return completion.choices[0].message.content || '';
        } catch (error: any) {
            logger.error('Erro na API IA');
            if (error.status === 429) return "⏳ Rate limit atingido. Tente daqui a pouco.";
            if (error.status === 402) return "💸 Cota de IA esgotada!";
            if (error.status === 400 && imageUrl) return "❌ Erro ao analisar imagem.";
            return "😵‍💫 Erro na API de IA.";
        }
    }
}

const llmService = new LLMService();

// ═══════════════════════════════════════════════════════════════════════════
// 🔐 ADMIN COMMANDS VIA IA
// ═══════════════════════════════════════════════════════════════════════════

const ADMIN_PROMPT = `Você é um parser de comandos administrativos. Analise a mensagem e extraia a ação.

AÇÕES DISPONÍVEIS:
- timeout: Colocar usuário de castigo. Params: targetUser, duration (minutos), reason
- kick: Expulsar usuário. Params: targetUser, reason
- ban: Banir usuário. Params: targetUser, reason
- unban: Desbanir usuário. Params: targetUserId
- warn: Avisar usuário. Params: targetUser, reason
- clear: Limpar mensagens. Params: count
- create_category: Criar categoria. Params: categoryName
- create_channel: Criar canal. Params: channelName, categoryName?, type (text/voice), staffOnly?
- delete_channel: Deletar canal. Params: channelName
- rename_channel: Renomear canal. Params: oldName, newName
- slowmode: Ativar slowmode. Params: channelName, seconds
- lock_channel: Trancar canal. Params: channelName
- unlock_channel: Destrancar canal. Params: channelName
- give_role: Dar cargo. Params: targetUser, roleName
- remove_role: Remover cargo. Params: targetUser, roleName
- create_role: Criar cargo. Params: roleName, color?
- server_info: Info do servidor
- user_info: Info do usuário. Params: targetUser
- announce: Fazer anúncio. Params: channelName, message
- send_message: Enviar mensagem IA. Params: channelName, prompt, mentionEveryone?
- embed: Criar embed. Params: channelName, title, description, color?
- reminder: Criar lembrete. Params: duration (min), message
- partnership_add: Adicionar parceria. Params: partnerGuildId, partnerGuildName, invite?, description?
- partnership_list: Listar parcerias
- partnership_remove: Remover parceria. Params: partnerGuildId
- none: Não é comando admin

REGRAS:
1. Converta duração para minutos (5 min, 1 hora, etc.)
2. Se não for comando admin, action: "none"
3. SEMPRE retorne JSON válido

Responda APENAS com JSON: {"action": "nome_acao", "params": {...}}`;

async function isAuthorized(member: GuildMember | null): Promise<boolean> {
    if (!member) return false;

    // 1. Check Native Administrator Permission (Owner always has this)
    if (member.permissions.has(PermissionFlagsBits.Administrator)) return true;

    // 2. Check Database Configured Roles
    try {
        const config = await getGuildConfig(member.guild.id);
        if (config?.ia_admin_roles && config.ia_admin_roles.length > 0) {
            // Check if user has any of the allowed roles
            return member.roles.cache.some(role => config.ia_admin_roles!.includes(role.id));
        }
    } catch (error) {
        logger.warn(`Error checking auth for guild ${member.guild.id}`, { error });
    }

    return false;
}

async function parseAdminCommand(userMessage: string): Promise<ParsedCommand> {
    try {
        const response = await llmService.gerarResposta(
            [{ role: 'user', content: userMessage }],
            ADMIN_PROMPT
        );

        const jsonMatch = response.match(/\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/);
        if (jsonMatch) {
            try {
                return JSON.parse(jsonMatch[0]);
            } catch {
                const cleaned = jsonMatch[0].replace(/[\n\r]/g, '').replace(/,\s*}/g, '}');
                return JSON.parse(cleaned);
            }
        }
        return { action: 'none', params: {} };
    } catch (error) {
        logger.error('Erro ao parsear comando admin');
        return { action: 'none', params: {} };
    }
}

function resolveChannel(guild: Guild, channelRef: string): GuildChannel | null {
    if (!channelRef) return null;

    const mentionMatch = channelRef.match(/<#(\d+)>/);
    if (mentionMatch) {
        return guild.channels.cache.get(mentionMatch[1]) as GuildChannel || null;
    }

    if (/^\d+$/.test(channelRef)) {
        return guild.channels.cache.get(channelRef) as GuildChannel || null;
    }

    const cleanName = channelRef.toLowerCase().replace('#', '');
    return guild.channels.cache.find(c => c.name.toLowerCase() === cleanName) as GuildChannel || null;
}

function resolveRole(guild: Guild, roleRef: string): Role | null {
    if (!roleRef) return null;

    const mentionMatch = roleRef.match(/<@&(\d+)>/);
    if (mentionMatch) {
        return guild.roles.cache.get(mentionMatch[1]) || null;
    }

    if (/^\d+$/.test(roleRef)) {
        return guild.roles.cache.get(roleRef) || null;
    }

    const cleanName = roleRef.toLowerCase().replace('@', '');
    return guild.roles.cache.find(r => r.name.toLowerCase() === cleanName) || null;
}

async function executeAdminAction(message: Message, action: string, params: Record<string, any>): Promise<string | null> {
    const guild = message.guild!;

    // Logar ação administrativa no banco
    if (dbConnected && action !== 'none' && action !== 'server_info' && action !== 'user_info') {
        try {
            await logAudit(guild.id, message.author.id, `AI_ADMIN_${action.toUpperCase()}`, undefined, params);
        } catch (error) {
            logger.warn('Erro ao logar ação admin no DB');
        }
    }

    try {
        switch (action) {
            case 'timeout': {
                const member = message.mentions.members?.first() ||
                    await guild.members.fetch(params.targetUser).catch(() => null);
                if (!member) return '❌ Usuário não encontrado.';

                const duration = (parseInt(params.duration) || 5) * 60 * 1000;
                await member.timeout(duration, params.reason || 'Sem motivo');

                try {
                    await member.send(`⚠️ **Timeout no CoreBot!**\nMotivo: ${params.reason || 'Não especificado'}\nDuração: ${params.duration || 5} min`);
                } catch { }

                return `✅ ${member.user.tag} em timeout por ${params.duration || 5} min.`;
            }

            case 'kick': {
                const member = message.mentions.members?.first() ||
                    await guild.members.fetch(params.targetUser).catch(() => null);
                if (!member) return '❌ Usuário não encontrado.';

                try { await member.send(`⚠️ **Expulso do CoreBot!**\nMotivo: ${params.reason || 'Não especificado'}`); } catch { }
                await member.kick(params.reason);
                return `✅ ${member.user.tag} foi expulso.`;
            }

            case 'ban': {
                const member = message.mentions.members?.first() ||
                    await guild.members.fetch(params.targetUser).catch(() => null);
                if (!member) return '❌ Usuário não encontrado.';

                try { await member.send(`🔨 **Banido do CoreBot!**\nMotivo: ${params.reason || 'Não especificado'}`); } catch { }
                await member.ban({ reason: params.reason });
                return `🔨 ${member.user.tag} foi BANIDO.`;
            }

            case 'unban': {
                if (!params.targetUserId) return '❌ Preciso do ID do usuário.';
                await guild.bans.remove(params.targetUserId);
                return `✅ Usuário ${params.targetUserId} desbanido.`;
            }

            case 'warn': {
                const member = message.mentions.members?.first();
                if (!member) return '❌ Mencione o usuário.';
                try { await member.send(`⚠️ **Aviso no CoreBot!**\nMotivo: ${params.reason || 'Não especificado'}`); } catch { }
                return `⚠️ ${member.user.tag} foi avisado.`;
            }

            case 'clear': {
                const count = Math.min(parseInt(params.count) || 10, 100);
                const deleted = await (message.channel as TextChannel).bulkDelete(count, true);
                return `🧹 Apaguei ${deleted.size} mensagens.`;
            }

            case 'create_category': {
                await guild.channels.create({
                    name: params.categoryName,
                    type: ChannelType.GuildCategory
                });
                return `📁 Categoria **${params.categoryName}** criada!`;
            }

            case 'create_channel': {
                const channelType = params.type === 'voice' ? ChannelType.GuildVoice : ChannelType.GuildText;
                const options: any = {
                    name: params.channelName,
                    type: channelType
                };

                if (params.categoryName) {
                    const category = guild.channels.cache.find(c =>
                        c.type === ChannelType.GuildCategory &&
                        c.name.toLowerCase() === params.categoryName.toLowerCase()
                    );
                    if (category) options.parent = category.id;
                }

                if (params.staffOnly && STAFF_ROLE_ID) {
                    options.permissionOverwrites = [
                        { id: guild.id, deny: [PermissionFlagsBits.SendMessages] },
                        { id: STAFF_ROLE_ID, allow: [PermissionFlagsBits.SendMessages, PermissionFlagsBits.ViewChannel] }
                    ];
                }

                await guild.channels.create(options);
                return `📢 Canal **#${params.channelName}** criado!`;
            }

            case 'delete_channel': {
                const channel = resolveChannel(guild, params.channelName);
                if (!channel) return '❌ Canal não encontrado.';
                await channel.delete();
                return `🗑️ Canal deletado.`;
            }

            case 'rename_channel': {
                const channel = resolveChannel(guild, params.oldName) as TextChannel;
                if (!channel) return '❌ Canal não encontrado.';
                await channel.setName(params.newName);
                return `✏️ Canal renomeado para **#${params.newName}**.`;
            }

            case 'slowmode': {
                const channel = (params.channelName ? resolveChannel(guild, params.channelName) : message.channel) as TextChannel;
                if (!channel) return '❌ Canal não encontrado.';
                await channel.setRateLimitPerUser(parseInt(params.seconds) || 10);
                return `🐌 Slowmode de ${params.seconds || 10}s ativado.`;
            }

            case 'lock_channel': {
                const channel = (params.channelName ? resolveChannel(guild, params.channelName) : message.channel) as TextChannel;
                if (!channel) return '❌ Canal não encontrado.';
                await channel.permissionOverwrites.edit(guild.id, { SendMessages: false });
                return `🔒 Canal trancado.`;
            }

            case 'unlock_channel': {
                const channel = (params.channelName ? resolveChannel(guild, params.channelName) : message.channel) as TextChannel;
                if (!channel) return '❌ Canal não encontrado.';
                await channel.permissionOverwrites.edit(guild.id, { SendMessages: null });
                return `🔓 Canal destrancado.`;
            }

            case 'give_role': {
                const member = message.mentions.members?.first();
                if (!member) return '❌ Mencione o usuário.';
                const role = resolveRole(guild, params.roleName);
                if (!role) return `❌ Cargo "${params.roleName}" não encontrado.`;
                await member.roles.add(role);
                return `✅ Cargo **${role.name}** dado para ${member.user.tag}.`;
            }

            case 'remove_role': {
                const member = message.mentions.members?.first();
                if (!member) return '❌ Mencione o usuário.';
                const role = resolveRole(guild, params.roleName);
                if (!role) return `❌ Cargo "${params.roleName}" não encontrado.`;
                await member.roles.remove(role);
                return `✅ Cargo **${role.name}** removido de ${member.user.tag}.`;
            }

            case 'create_role': {
                const role = await guild.roles.create({
                    name: params.roleName,
                    color: params.color || '#99AAB5',
                    reason: 'Criado via CoreBotIA'
                });
                return `✅ Cargo **${role.name}** criado.`;
            }

            case 'server_info': {
                return `📊 **${guild.name}**\n👥 Membros: ${guild.memberCount}\n📢 Canais: ${guild.channels.cache.size}\n🏷️ Cargos: ${guild.roles.cache.size}`;
            }

            case 'user_info': {
                const member = message.mentions.members?.first();
                if (!member) return '❌ Mencione o usuário.';
                const roles = member.roles.cache.filter(r => r.id !== guild.id).map(r => r.name).join(', ') || 'Nenhum';
                return `👤 **${member.user.tag}**\n🏷️ Cargos: ${roles}`;
            }

            case 'announce': {
                const channel = resolveChannel(guild, params.channelName) as TextChannel;
                if (!channel) return '❌ Canal não encontrado.';

                const embed = new EmbedBuilder()
                    .setTitle('📢 Anúncio')
                    .setDescription(params.message)
                    .setColor('#FFD700' as any)
                    .setTimestamp();

                await channel.send({ embeds: [embed] });
                return `✅ Anúncio enviado para #${channel.name}.`;
            }

            case 'send_message': {
                const channel = resolveChannel(guild, params.channelName) as TextChannel;
                if (!channel) return '❌ Canal não encontrado.';

                const content = await llmService.gerarResposta(
                    [{ role: 'user', content: `Gere uma mensagem: ${params.prompt || 'Se apresente'}` }],
                    'Você é a CoreBotIA. Responda de forma amigável. Pode usar emojis.'
                );

                let finalMessage = content;
                if (params.mentionEveryone) finalMessage = `@everyone\n\n${content}`;

                await channel.send(finalMessage);
                return `✅ Mensagem enviada para #${channel.name}.`;
            }

            case 'embed': {
                const channel = (params.channelName ? resolveChannel(guild, params.channelName) : message.channel) as TextChannel;
                if (!channel) return '❌ Canal não encontrado.';

                const embed = new EmbedBuilder()
                    .setTitle(params.title || 'Embed')
                    .setDescription(params.description || '')
                    .setColor((params.color || '#00d4ff') as any)
                    .setTimestamp();

                await channel.send({ embeds: [embed] });
                return `✅ Embed enviado.`;
            }

            case 'reminder': {
                const duration = (parseInt(params.duration) || 5) * 60 * 1000;
                setTimeout(async () => {
                    try {
                        await message.author.send(`⏰ **Lembrete:** ${params.message || 'Lembrete!'}`);
                    } catch {
                        await (message.channel as TextChannel).send(`⏰ ${message.author}, **Lembrete:** ${params.message || 'Lembrete!'}`);
                    }
                }, duration);
                return `✅ Lembrete agendado para ${params.duration || 5} min.`;
            }

            case 'none':
                return null;

            case 'partnership_add': {
                if (!params.partnerGuildId || !params.partnerGuildName) {
                    return '❌ Preciso do ID e nome do servidor parceiro.';
                }
                await createPartnership(
                    guild.id,
                    params.partnerGuildId,
                    params.partnerGuildName,
                    message.author.id,
                    { invite: params.invite, description: params.description }
                );
                return `🤝 Parceria com **${params.partnerGuildName}** adicionada!`;
            }

            case 'partnership_list': {
                const partnerships = await listPartnerships(guild.id);
                if (partnerships.length === 0) return '📋 Nenhuma parceria ativa.';
                const list = partnerships.map((p, i) =>
                    `${i + 1}. **${p.partner_guild_name}**${p.partner_invite ? ` — ${p.partner_invite}` : ''}`
                ).join('\n');
                return `🤝 **Parcerias Ativas (${partnerships.length}):**\n${list}`;
            }

            case 'partnership_remove': {
                if (!params.partnerGuildId) return '❌ Preciso do ID do servidor parceiro.';
                const removed = await removePartnership(guild.id, params.partnerGuildId);
                return removed ? '✅ Parceria removida.' : '❌ Parceria não encontrada.';
            }

            default:
                return null;
        }
    } catch (error: any) {
        logger.error('Erro ao executar ação admin');
        return `❌ Erro: ${error.message}`;
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

const conversasAtivas = new Map<string, number>();
let ultimoTempoMensagemGeral = Date.now();

// ═══════════════════════════════════════════════════════════════════════════
//  CHAT LOGIC
// ═══════════════════════════════════════════════════════════════════════════

async function runChatGeralLogic(message: Message): Promise<void> {
    if (!dbConnected) return;

    // SaaS: Carregar configuração do servidor
    const guildId = message.guild!.id;
    const config = await getGuildConfig(guildId);

    // Se não tiver canal configurado, ignora
    if (!config?.ia_channel_id) return;

    // Verifica se é o canal correto
    if (message.channel.id !== config.ia_channel_id) {
        // Se mencionou o bot fora do canal oficial, avisa
        if (message.mentions.has(client.user!)) {
            await message.reply(`Please talk to me in <#${config.ia_channel_id}>`);
        }
        return;
    }

    ultimoTempoMensagemGeral = Date.now();
    let deveResponder = false;
    let imageUrl: string | null = null;

    if (message.attachments.size > 0) {
        const attachment = message.attachments.first();
        if (attachment?.contentType?.startsWith('image/')) {
            imageUrl = attachment.url;
            if (conversasAtivas.has(message.author.id)) deveResponder = true;
        }
    }

    if (message.mentions.has(client.user!) ||
        /\b(nexstar|ia|bot)\b/i.test(message.content.toLowerCase()) ||
        (message.reference && (await message.channel.messages.fetch(message.reference.messageId!).catch(() => null))?.author.id === client.user?.id) ||
        (conversasAtivas.has(message.author.id) && Date.now() - conversasAtivas.get(message.author.id)! < 60000)) {
        deveResponder = true;
    }

    if (deveResponder) {
        try {
            // 🛑 Check AI Limit
            const limitCheck = await checkAiLimit(message.author.id, guildId, message.guild!.ownerId);
            if (!limitCheck.allowed) {
                const limitMsg = getLimitMessage(limitCheck.plan, limitCheck.limit);
                const embed = new EmbedBuilder()
                    .setTitle(limitMsg.title)
                    .setDescription(limitMsg.description)
                    .setColor(limitMsg.color)
                    .setFooter({ text: limitMsg.footer })
                    .setTimestamp();
                await message.reply({ embeds: [embed] });
                return;
            }

            await (message.channel as TextChannel).sendTyping();
            conversasAtivas.set(message.author.id, Date.now());

            const mensagensRecentes = await message.channel.messages.fetch({ limit: 5 });
            const historicoContexto: ChatMessage[] = [];

            mensagensRecentes.reverse().forEach(msg => {
                if (!msg.content && msg.attachments.size === 0) return;
                if (msg.author.id === client.user?.id) {
                    historicoContexto.push({ role: 'assistant', content: msg.content });
                } else if (msg.author.id === message.author.id) {
                    historicoContexto.push({ role: 'user', content: msg.content.replace(/<@!?[0-9]+>/g, '').trim() });
                }
            });

            if (historicoContexto.length === 0 || (historicoContexto.length > 0 && historicoContexto[historicoContexto.length - 1].content !== message.content && !imageUrl)) {
                historicoContexto.push({ role: 'user', content: message.content.replace(/<@!?[0-9]+>/g, '').trim() });
            }

            const member = message.member as GuildMember;
            let contextoUsuario = "Membro Comum";
            // Check roles dynamically if needed, for now keep logic simple
            if (config.ia_admin_roles && config.ia_admin_roles.some(roleId => member.roles.cache.has(roleId))) {
                contextoUsuario = "ADMINISTRADOR";
            }

            // SaaS: Personalidade Dinâmica
            const promptSistema = config.ia_system_prompt || `Você é a IA do CoreBot. Personalidade ÁCIDA. Usuario: ${contextoUsuario}`;

            const resposta = await llmService.gerarResposta(historicoContexto, promptSistema, imageUrl);

            // ✅ Increment Usage
            await incrementAiUsage(message.author.id, guildId);

            // Analytics: rastrear resposta IA
            trackEvent(guildId, 'ai_response').catch(() => { });

            // Branding: Free/Starter = com marca d'água
            const brandingFooter = await getBrandingFooter(message.guild!.ownerId);
            const respostaFinal = applyBranding(resposta, brandingFooter);

            // Whitelabel: Se configurado, usar webhook com nome/avatar customizado
            if (config.whitelabel_name) {
                try {
                    const channel = message.channel as TextChannel;
                    const webhooks = await channel.fetchWebhooks();
                    let webhook = webhooks.find(wh => wh.name === 'CoreBot-Whitelabel');
                    if (!webhook) {
                        webhook = await channel.createWebhook({ name: 'CoreBot-Whitelabel' });
                    }
                    await webhook.send({
                        content: respostaFinal,
                        username: config.whitelabel_name,
                        avatarURL: config.whitelabel_avatar_url || undefined
                    });
                } catch {
                    // Fallback: responder normalmente se webhook falhar
                    await message.reply(respostaFinal);
                }
            } else {
                await message.reply(respostaFinal);
            }
        } catch (err) {
            logger.error('Erro no chat geral');
        }
    }
}

async function runChatPrivadoLogic(message: Message): Promise<void> {

    // 🛑 Check AI Limit
    const limitCheck = await checkAiLimit(message.author.id, message.guild!.id, message.guild!.ownerId);
    if (!limitCheck.allowed) {
        const limitMsg = getLimitMessage(limitCheck.plan, limitCheck.limit);
        const embed = new EmbedBuilder()
            .setTitle(limitMsg.title)
            .setDescription(limitMsg.description)
            .setColor(limitMsg.color)
            .setFooter({ text: limitMsg.footer })
            .setTimestamp();
        await message.reply({ embeds: [embed] });
        return;
    }

    await (message.channel as TextChannel).sendTyping();
    try {
        const mensagensAnteriores = await message.channel.messages.fetch({ limit: 10 });
        const historicoBuild: ChatMessage[] = [];

        mensagensAnteriores.reverse().forEach(msg => {
            if (msg.content && !msg.author.bot) {
                historicoBuild.push({ role: 'user', content: msg.content });
            } else if (msg.content && msg.author.id === client.user?.id) {
                historicoBuild.push({ role: 'assistant', content: msg.content });
            }
        });

        if (historicoBuild.length === 0) {
            historicoBuild.push({ role: 'user', content: message.content });
        }

        let imgUrl: string | null = null;
        if (message.attachments.size > 0 && message.attachments.first()?.contentType?.startsWith('image/')) {
            imgUrl = message.attachments.first()!.url;
        }

        const resposta = await llmService.gerarResposta(historicoBuild, "Você é a IA do CoreBot.", imgUrl);

        // ✅ Increment Usage
        await incrementAiUsage(message.author.id, message.guild!.id);

        if (resposta.length > 2000) {
            const partes = resposta.match(/[\s\S]{1,1900}/g) || [];
            for (const parte of partes) await (message.channel as TextChannel).send(parte);
        } else {
            await (message.channel as TextChannel).send(resposta);
        }
    } catch (error) {
        logger.error('Erro no chat privado');
        await message.reply('Erro interno.');
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// 📨 MESSAGE HANDLER
// ═══════════════════════════════════════════════════════════════════════════

client.on('messageCreate', async (message: Message) => {
    if (message.author.bot) return;

    const conteudoLower = message.content.toLowerCase();

    if (message.channel.id === CANAL_CHAT_GERAL) {
        ultimoTempoMensagemGeral = Date.now();
    }

    // Admin commands
    const isAdminPrefix = conteudoLower.startsWith('ia,') || conteudoLower.startsWith('ia ');
    const isMention = message.mentions.users.has(client.user!.id);

    if ((isAdminPrefix || isMention) && message.guild) {
        if (await isAuthorized(message.member)) {
            logger.info(`🔐 Comando admin: ${message.content}`);

            const channelMentions = message.content.match(/<#(\d+)>/g) || [];
            const firstChannelMention = channelMentions[0] || null;

            const parsed = await parseAdminCommand(message.content);

            if (parsed.params && firstChannelMention) {
                if (parsed.params.channelName && !parsed.params.channelName.match(/<#\d+>/)) {
                    parsed.params.channelName = firstChannelMention;
                }
            }

            if (parsed.action && parsed.action !== 'none') {
                const result = await executeAdminAction(message, parsed.action, parsed.params || {});
                if (result) {
                    try {
                        await message.reply(result);
                    } catch {
                        await (message.channel as TextChannel).send(result);
                    }
                    return;
                }
            }
        }
    }

    // Chat geral (SaaS - check inside function)
    await runChatGeralLogic(message);

    // Chat privado
    if (CATEGORIA_ASSISTENTE && message.channel.isTextBased() && 'parentId' in message.channel &&
        message.channel.parentId === CATEGORIA_ASSISTENTE && message.channel.name.startsWith('chat-ia-')) {
        await runChatPrivadoLogic(message);
    }
});


// ═══════════════════════════════════════════════════════════════
// 🎮 Handler de Botões (Interações Sociais GIF)
// ═══════════════════════════════════════════════════════════════
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isButton()) return;

    const customId = interaction.customId;

    // Handle GIF interaction buttons: gif_retribuir:category:originalUserId or gif_action:category:originalUserId
    if (!customId.startsWith('gif_retribuir:') && !customId.startsWith('gif_action:')) return;

    try {
        await interaction.deferReply();

        const parts = customId.split(':');
        const actionType = parts[0]; // gif_retribuir or gif_action
        const category = parts[1]; // kiss, slap, hug, etc.
        const originalUserId = parts[2]; // who triggered the original command

        // For "Retribuir", only the target can click it
        if (actionType === 'gif_retribuir') {
            // The target is the person who was mentioned, not the original sender
            // Only they should retribuir
            if (interaction.user.id === originalUserId) {
                await interaction.editReply({ content: '❌ Você não pode retribuir a si mesmo!' });
                return;
            }
        }

        const { gifService } = await import('../../shared/services/gif.service');
        const url = await gifService.get(category);

        if (!url) {
            await interaction.editReply({ content: '❌ Não consegui encontrar um GIF. Tente novamente!' });
            return;
        }

        // Category theming (matching engine.ts themes)
        const categoryThemes: Record<string, { emoji: string; color: number; label: string }> = {
            kiss: { emoji: '💋', color: 0xFF69B4, label: 'Beijo' },
            hug: { emoji: '🤗', color: 0xFFD700, label: 'Abraço' },
            slap: { emoji: '👋', color: 0xFF4444, label: 'Tapa' },
            pat: { emoji: '💆', color: 0x87CEEB, label: 'Carinho' },
            cuddle: { emoji: '🥰', color: 0xFF8FAE, label: 'Conchinha' },
            dance: { emoji: '💃', color: 0x9B59B6, label: 'Dança' },
            bite: { emoji: '😈', color: 0xE74C3C, label: 'Mordida' },
            poke: { emoji: '👉', color: 0x3498DB, label: 'Cutucão' },
            tickle: { emoji: '🤭', color: 0xF1C40F, label: 'Cócegas' },
            wave: { emoji: '👋', color: 0x2ECC71, label: 'Tchau' },
            wink: { emoji: '😉', color: 0xE91E63, label: 'Piscadinha' },
            highfive: { emoji: '🙌', color: 0xFF9800, label: 'High Five' },
            yeet: { emoji: '🚀', color: 0xF44336, label: 'Yeet' },
        };

        const theme = categoryThemes[category] || { emoji: '✨', color: 0x99AAB5, label: category };

        // Build description based on action type
        let description: string;
        if (actionType === 'gif_retribuir') {
            description = `${theme.emoji} **${interaction.user.displayName}** retribuiu o ${theme.label.toLowerCase()} para <@${originalUserId}>!`;
        } else {
            description = `${theme.emoji} **${interaction.user.displayName}** deu um ${theme.label.toLowerCase()} em <@${originalUserId}>!`;
        }

        const embed = new EmbedBuilder()
            .setAuthor({
                name: interaction.user.displayName,
                iconURL: interaction.user.displayAvatarURL({ size: 32 })
            })
            .setDescription(description)
            .setImage(url)
            .setColor(theme.color)
            .setFooter({ text: `${theme.label} • Interações Sociais` })
            .setTimestamp();

        await interaction.editReply({ embeds: [embed] });

    } catch (error) {
        logger.error('Erro ao processar botão GIF:', { error });
        try {
            if (interaction.deferred) {
                await interaction.editReply({ content: '❌ Ocorreu um erro ao processar a interação.' });
            }
        } catch { }
    }
});

// Handler de Interações (Slash Commands)
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    if (interaction.commandName === 'config-ia') {
        if (!verificationCheck(interaction.guildId)) return;

        await interaction.deferReply({ ephemeral: true });
        const sub = interaction.options.getSubcommand();
        const guildId = interaction.guildId!;

        try {
            if (sub === 'canal') {
                const channel = interaction.options.getChannel('canal', true);
                if (channel.type !== ChannelType.GuildText) {
                    await interaction.editReply('❌ O canal deve ser de texto.');
                    return;
                }

                await upsertGuildConfig(guildId, { ia_channel_id: channel.id });
                await interaction.editReply(`✅ Canal da IA definido para ${channel}`);
                logger.info(`Config IA (Canal) atualizada para guild ${guildId}`);
            }

            else if (sub === 'personalidade') {
                const prompt = interaction.options.getString('prompt', true);
                await upsertGuildConfig(guildId, { ia_system_prompt: prompt });
                await interaction.editReply(`✅ Personalidade atualizada!\nPrompt: **"${prompt}"**`);
                logger.info(`Config IA (Personalidade) atualizada para guild ${guildId}`);
            }

            else if (sub === 'cargos') {
                const role1 = interaction.options.getRole('cargo1', true);
                const role2 = interaction.options.getRole('cargo2');

                const roles = [role1.id];
                if (role2) roles.push(role2.id);

                // Convert array to string format that PG expects if needed, or update DB type handler
                // Assuming upsertGuildConfig handles string[] for ia_admin_roles
                // Note: The schema defines text[], so passing string[] is fine in node-postgres

                await upsertGuildConfig(guildId, { ia_admin_roles: roles as any });
                await interaction.editReply(`✅ Cargos de Admin da IA definidos: ${roles.map(r => `<@&${r}>`).join(', ')}`);
            }

            else if (sub === 'status') {
                const config = await getGuildConfig(guildId);
                const statusEmbed = new EmbedBuilder()
                    .setTitle('⚙️ Configurações da IA')
                    .setColor('#0099ff')
                    .addFields(
                        { name: 'Canal', value: config?.ia_channel_id ? `<#${config.ia_channel_id}>` : 'Não definido', inline: true },
                        { name: 'Personalidade', value: config?.ia_system_prompt ? `"${config.ia_system_prompt.substring(0, 50)}..."` : 'Padrão', inline: true },
                        { name: 'Cargos Admin', value: config?.ia_admin_roles && config.ia_admin_roles.length > 0 ? config.ia_admin_roles.map(r => `<@&${r}>`).join(', ') : 'Nenhum', inline: false }
                    );
                await interaction.editReply({ embeds: [statusEmbed] });
            }
        } catch (error) {
            logger.error('Erro ao salvar config IA', { error: error as any });
            await interaction.editReply('❌ Erro ao salvar configuração no banco de dados.');
        }

    }

    if (interaction.commandName === 'construir-servidor') {
        logger.info('🏗️ Comando /construir-servidor recebido');
        try {
            const theme = interaction.options.getString('tema', true);
            const guildId = interaction.guildId!;

            // ⚡ DEFER FIRST (Prevent 3s timeout)
            await interaction.deferReply({ ephemeral: false });
            logger.info('🏗️ DeferReply enviado');

            // 🛑 Check Server Generation Limit
            const limitCheck = await checkServerGenLimit(interaction.user.id);
            if (!limitCheck.allowed) {
                const planNames: Record<string, string> = { free: 'Free', starter: 'Starter', pro: 'Pro', ultimate: 'Ultimate' };
                const limitEmbed = new EmbedBuilder()
                    .setTitle('⚠️ Limite de Gerações Atingido')
                    .setDescription(`Você utilizou todas as **${limitCheck.limit} geração(ões) de servidor** disponíveis este mês no plano **${planNames[limitCheck.plan] || limitCheck.plan}**.\n\nPara gerar mais servidores, o **dono do servidor** pode fazer upgrade no painel.`)
                    .setColor(0xFFA500)
                    .setFooter({ text: `Plano: ${planNames[limitCheck.plan] || limitCheck.plan} • Limite: ${limitCheck.limit}/mês` })
                    .setTimestamp();
                await interaction.editReply({ embeds: [limitEmbed] });
                return;
            }

            logger.info(`🏗️ Tema: ${theme}`);

            // 1. Gerar Arquitetura
            const schema = await serverBuilder.generateServerPlan(theme);

            if (!schema) {
                await interaction.editReply('❌ Falha ao projetar o servidor. A IA não retornou um plano válido. Tente novamente.');
                return;
            }

            const guild = interaction.guild || await client.guilds.fetch(guildId);
            await interaction.editReply(`📐 Plano gerado! Criando ${schema.roles.length} cargos e ${schema.categories.length} categorias...`);

            // 2. Construir
            await serverBuilder.buildServer(guild, schema, async (msg) => {
                logger.info(msg);
            });

            // ✅ Increment Usage
            await incrementServerGenUsage(interaction.user.id);

            await interaction.followUp({
                content: `✅ **Servidor Construído com Sucesso!** 🚀\nTema: ${theme.substring(0, 100)}${theme.length > 100 ? '...' : ''}\n\n*Nota: Ajuste as permissões de canais se necessário.*`,
                ephemeral: false
            });

        } catch (error) {
            const errorMsg = String((error as any).message || 'Erro desconhecido').substring(0, 1800);
            logger.error('Erro ao construir servidor:', { error: error as any });
            try {
                // Tenta responder se ainda não tiver respondido, ou editar se já tiver diferido
                if (interaction.deferred || interaction.replied) {
                    await interaction.followUp({ content: `❌ Ocorreu um erro: ${errorMsg}`, ephemeral: true });
                } else {
                    await interaction.reply({ content: `❌ Ocorreu um erro: ${errorMsg}`, ephemeral: true });
                }
            } catch (err) {
                // Se falhar até em reportar o erro (ex: Unknown Interaction), apenas loga
                console.error('Erro crítico na interação (possível timeout/duplicação):', err);
            }
        }
    }

    else if (interaction.commandName === 'ajustar-servidor') {
        logger.info('🔧 Comando /ajustar-servidor recebido');
        try {
            const acao = interaction.options.getString('acao', true);
            await interaction.deferReply({ ephemeral: false });

            const guildId = interaction.guildId;
            if (!guildId) {
                await interaction.editReply('❌ Este comando só funciona em servidores.');
                return;
            }

            const guild = interaction.guild || await client.guilds.fetch(guildId);

            await interaction.editReply(`🔧 Analisando pedido: **${acao.substring(0, 100)}${acao.length > 100 ? '...' : ''}**`);

            // 1. Gerar Plano de Ajustes
            const schema = await serverBuilder.generateAdjustmentPlan(acao);

            if (!schema || !schema.actions || schema.actions.length === 0) {
                await interaction.editReply('❌ Não consegui entender o pedido. Tente ser mais específico.');
                return;
            }

            await interaction.editReply(`📋 Plano gerado: ${schema.actions.length} ações. Aplicando...`);

            // 2. Aplicar Ajustes
            await serverBuilder.applyAdjustments(guild, schema, async (msg) => {
                logger.info(msg);
            });

            await interaction.followUp({
                content: `✅ **Ajustes Concluídos!**\n${schema.message || 'Todas as modificações foram aplicadas.'}`,
                ephemeral: false
            });

        } catch (error) {
            const errorMsg = String((error as any).message || 'Erro desconhecido').substring(0, 1800);
            logger.error('Erro ao ajustar servidor:', { error: error as any });
            try {
                if (interaction.deferred || interaction.replied) {
                    await interaction.followUp({ content: `❌ Ocorreu um erro: ${errorMsg}`, ephemeral: true });
                } else {
                    await interaction.reply({ content: `❌ Ocorreu um erro: ${errorMsg}`, ephemeral: true });
                }
            } catch (err) {
                console.error('Erro crítico na interação:', err);
            }
        }
    }

    else if (interaction.commandName === 'ajuda-ia') {
        await interaction.reply({
            content: 'Use `/config-ia` para configurar o bot!\n\n**Comandos Disponíveis:**\n`/config-ia canal` - Define onde eu falo\n`/config-ia personalidade` - Define quem eu sou\n`/config-ia cargos` - Define quem manda em mim\n`/construir-servidor` - Cria estrutura completa\n`/ajustar-servidor` - Modifica servidor existente',
            ephemeral: true
        });
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // 🤖 EXECUÇÃO DE COMANDOS PERSONALIZADOS
    // ═══════════════════════════════════════════════════════════════════════════
    else {
        // Ignorar comandos de outros módulos para evitar conflito/dupla resposta
        const MODULE_COMMANDS = [
            'ticket-painel', 'ticket-categoria',
            'entrar-call', 'sair-call', 'painel-call', 'config-call'
        ];

        if (MODULE_COMMANDS.includes(interaction.commandName)) return;

        try {
            const guildId = interaction.guildId;
            if (guildId) {
                // ⚡ DEFER IMMEDIATELLY to prevent timeout (DB query can take >3s)
                // We assume public visibility (ephemeral: false) by default for custom commands.
                // Ideally we would check the command config first, but we can't wait for DB.
                if (!interaction.deferred && !interaction.replied) {
                    await interaction.deferReply({ ephemeral: false });
                }

                logger.info(`🔍 Buscando comando personalizado: ${interaction.commandName} para guild ${guildId}`);
                const customCommand = await customCommandService.get(guildId, interaction.commandName);

                if (customCommand && customCommand.enabled) {
                    logger.info(`✅ Comando encontrado: ${customCommand.name}. Executando...`);
                    await commandEngine.execute(interaction, customCommand.actions);
                } else {
                    logger.warn(`⚠️ Comando personalizado não encontrado ou desativado: ${interaction.commandName}`);

                    // Cleanup the deferred reply if command not found
                    if (interaction.deferred) {
                        await interaction.deleteReply().catch(() => { });
                        if (!interaction.replied) { // Double check
                            await interaction.followUp({ content: '❌ Comando desconhecido ou indisponível.', ephemeral: true }).catch(() => { });
                        }
                    } else if (!interaction.replied) {
                        await interaction.reply({ content: '❌ Este comando não está mais disponível ou foi desativado.', ephemeral: true });
                    }
                }
            }
        } catch (error) {
            logger.error(`❌ Erro crítico ao processar comando personalizado ${interaction.commandName}:`, { error });
            if (interaction.deferred) {
                await interaction.followUp({ content: '❌ Erro interno ao processar comando.', ephemeral: true }).catch(() => { });
            } else if (!interaction.replied) {
                await interaction.reply({ content: '❌ Erro interno ao processar comando.', ephemeral: true });
            }
        }
    }
});

function verificationCheck(_guildId: string | null): boolean {
    if (!dbConnected) {
        try { return false; } catch { }
    }
    return true;
}

// ═══════════════════════════════════════════════════════════════════════════
// ⏳ INACTIVITY MONITORrrr
// ═══════════════════════════════════════════════════════════════════════════

function verificarInatividade(): void {
    logger.info(`⏳ Monitor de inatividade iniciado (${TEMPO_OCIOSO_PARA_ENGAJAR / 60000} min)`);

    setInterval(async () => {
        const tempoPassado = Date.now() - ultimoTempoMensagemGeral;

        if (tempoPassado > TEMPO_OCIOSO_PARA_ENGAJAR) {
            /* 
            // SaaS: Inactivity monitor needs to be per-guild. 
            // Disabling global check to prevent errors.
            const canalGeral = client.channels.cache.get(CANAL_CHAT_GERAL) as TextChannel;
            if (!canalGeral) return;

            try {
                const ultimas = await canalGeral.messages.fetch({ limit: 1 });
                if (ultimas.first()?.author.id === client.user?.id) {
                    ultimoTempoMensagemGeral = Date.now();
                    return;
                }
            } catch {}

            try {
                const topico = await llmService.gerarResposta(
                    [{ role: 'user', content: 'O chat morreu. Gere uma frase sarcástica reclamando do silêncio e lance um tópico polêmico.' }],
                    "Você é uma IA sarcástica. Lance uma provocação ácida."
                );

                await canalGeral.send(`📢 **Revivendo o chat!** @everyone\n\n${topico}`);
                logger.info('✅ Mensagem de engajamento enviada!');
            } catch (e) {
                logger.error('Erro ao enviar engajamento');
            }
            
            ultimoTempoMensagemGeral = Date.now();
            */
        }
    }, 60000);
}

// ═══════════════════════════════════════════════════════════════════════════
// 🚀 START
// ═══════════════════════════════════════════════════════════════════════════
// 📋 SLASH COMMANDS
// ═══════════════════════════════════════════════════════════════════════════

const commands = [
    new SlashCommandBuilder()
        .setName('config-ia')
        .setDescription('⚙️ Configura a IA no seu servidor')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addSubcommand(sub =>
            sub.setName('canal')
                .setDescription('Define o canal onde a IA irá conversar')
                .addChannelOption(opt =>
                    opt.setName('canal')
                        .setDescription('Canal de texto')
                        .addChannelTypes(ChannelType.GuildText)
                        .setRequired(true)
                )
        )
        .addSubcommand(sub =>
            sub.setName('personalidade')
                .setDescription('Define a personalidade da IA')
                .addStringOption(opt =>
                    opt.setName('prompt')
                        .setDescription('Ex: Você é um pirata espacial bravo')
                        .setRequired(true)
                )
        )
        .addSubcommand(sub =>
            sub.setName('cargos')
                .setDescription('Define cargos que podem usar comandos admin da IA')
                .addRoleOption(opt => opt.setName('cargo1').setDescription('Cargo Admin 1').setRequired(true))
                .addRoleOption(opt => opt.setName('cargo2').setDescription('Cargo Admin 2'))
        )
        .addSubcommand(sub =>
            sub.setName('status')
                .setDescription('Verifica as configurações atuais')
        ),
    new SlashCommandBuilder().setName('ajuda-ia').setDescription('💡 Mostra comandos da IA'),
    new SlashCommandBuilder()
        .setName('construir-servidor')
        .setDescription('🏗️ Cria canais e cargos baseado na sua descrição')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addStringOption(opt =>
            opt.setName('tema')
                .setDescription('Ex: RPG Medieval com economia e 3 classes')
                .setRequired(true)
        ),
    new SlashCommandBuilder()
        .setName('ajustar-servidor')
        .setDescription('🔧 Modifica canais/cargos usando linguagem natural')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addStringOption(opt =>
            opt.setName('acao')
                .setDescription('Ex: Adicionar canal de voz na categoria Gaming')
                .setRequired(true)
        ),
    ...PRIVATE_CALLS_EVENTS.commands,
    ...TICKET_EVENTS.commands
];

import { REST } from 'discord.js';
import { Routes } from 'discord.js';

async function registerCommands(clientId: string) {
    const rest = new REST({ version: '10' }).setToken(TOKEN);
    try {
        const commandNames = commands.map(c => c.name).join(', ');
        logger.info(`Registrando ${commands.length} slash commands: [${commandNames}]...`);

        await rest.put(Routes.applicationCommands(clientId), { body: commands });

        logger.info('✅ Slash commands registrados com sucesso no Discord!');
        logger.info('⚠️ Nota: Comandos globais podem levar até 1 hora para atualizar em todos os servidores. Se precisar urgente, reinicie o cliente Discord (Ctrl+R).');
    } catch (error) {
        logger.error('❌ Erro ao registrar comandos:', { error });
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// 🚀 INICIALIZAÇÃO
// ═══════════════════════════════════════════════════════════════════════════

client.once('clientReady', async () => {
    logger.info(`🤖 NEXSTAR CORE BOT (Multifuncional) - ONLINE`);

    // Iniciar verificação de inatividade
    verificarInatividade();

    // Registrar comandos SEMPRE (independente do database)
    if (client.user) {
        await registerCommands(client.user.id);
    }

    try {
        const connected = await testConnection();
        if (connected) {
            await initializeSchema();
            dbConnected = true;
            logger.info('💾 Database PostgreSQL conectado!');

            // 🔄 Sincronizar guilds ausentes no banco
            try {
                const dbGuildsResult = await query<{ guild_id: string }>('SELECT guild_id FROM guild_configs');
                const dbGuildIds = new Set(dbGuildsResult.rows.map(r => r.guild_id));

                const missingGuilds = client.guilds.cache.filter(g => !dbGuildIds.has(g.id));

                if (missingGuilds.size > 0) {
                    logger.info(`🔄 Sincronizando ${missingGuilds.size} servidores ausentes no banco...`);
                    for (const guild of missingGuilds.values()) {
                        await upsertGuildConfig(guild.id, { ia_enabled: true });
                        logger.info(`✅ [Sync] Config criada para ${guild.name}`);
                    }
                } else {
                    logger.info('✅ Todos os servidores estão sincronizados no banco.');
                }
            } catch (error) {
                logger.error('❌ Erro na sincronização de guilds:', { error });
            }
        }
    } catch (error) {
        logger.warn('⚠️ Database não disponível, usando apenas memória');
    }
});

// ═══════════════════════════════════════════════════════════════════════════
// 🌌 MÓDULOS INTEGRADOS
// ═══════════════════════════════════════════════════════════════════════════
setupWelcomeEvents(client);
setupAutoModEvents(client);
setupTicketEvents(client);
setupPrivateCallsEvents(client);

// ═══════════════════════════════════════════════════════════════════════════
// 🆕 GUILD EVENTS
// ═══════════════════════════════════════════════════════════════════════════

client.on('guildCreate', async (guild) => {
    logger.info(`📥 Entrei em um novo servidor: ${guild.name} (${guild.id})`);
    try {
        // Inicializar configuração no banco de dados
        await upsertGuildConfig(guild.id, { ia_enabled: true });
        logger.info(`✅ Configuração inicial criada para ${guild.name}`);

        // Log analytics
        trackEvent(guild.id, 'guild_join').catch(() => { });
    } catch (error) {
        logger.error(`❌ Erro ao criar config para ${guild.name}:`, { error });
    }
});

client.on('guildDelete', async (guild) => {
    logger.info(`📤 Removido do servidor: ${guild.name} (${guild.id})`);
    try {
        // Opcional: Limpar dados ou marcar como inativo
        // Por enquanto mantemos a config para caso o bot volte
        trackEvent(guild.id, 'guild_leave').catch(() => { });
    } catch (error) {
        logger.error(`❌ Erro ao processar saída de ${guild.name}:`, { error });
    }
});

client.login(TOKEN).catch(error => {
    logger.error('Falha no login:', error);
    process.exit(1);
});

process.on('SIGINT', async () => {
    logger.info('Encerrando NexstarIA...');
    await closePool();
    client.destroy();
    process.exit(0);
});

process.on('unhandledRejection', (error) => {
    logger.error('Erro não tratado:', { error });
});

export { LLMService, llmService };
