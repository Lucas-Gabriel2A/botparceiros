"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkProhibitedWords = checkProhibitedWords;
exports.checkCaps = checkCaps;
exports.checkLinks = checkLinks;
exports.checkFlood = checkFlood;
exports.checkSpam = checkSpam;
exports.checkWithAI = checkWithAI;
exports.handleViolation = handleViolation;
const discord_js_1 = require("discord.js");
const services_1 = require("../../shared/services");
const analytics_service_1 = require("../../shared/services/analytics.service");
// ═══════════════════════════════════════════════════════════════════════════
// 🧠 LÓGICA DE DETECÇÃO (Stateless)
// ═══════════════════════════════════════════════════════════════════════════
function checkProhibitedWords(content, prohibitedWords) {
    if (!prohibitedWords || prohibitedWords.length === 0)
        return null;
    const lowerContent = content.toLowerCase();
    for (const word of prohibitedWords) {
        if (lowerContent.includes(word.toLowerCase())) {
            return word;
        }
    }
    return null;
}
function checkCaps(content, threshold = 0.7, minLength = 10) {
    if (content.length < minLength)
        return false;
    const capsCount = content.replace(/[^A-Z]/g, "").length;
    const ratio = capsCount / content.length;
    return ratio >= threshold;
}
function checkLinks(content) {
    // Regex simples para detectar http/https links
    const linkRegex = /(https?:\/\/[^\s]+)/g;
    return linkRegex.test(content);
}
function checkFlood(content) {
    // Detecta se a mesma letra ou caractere (ex: AAAAAA ou kkkkkkkk) se repete mais de 9 vezes seguidas
    const floodRegex = /(.)\1{9,}/i;
    return floodRegex.test(content);
}
// Map: guildId:userId -> array de timestamps (Date.now())
const userMessageLogs = new Map();
const SPAM_LIMIT = 5; // max 5 mensagens
const SPAM_WINDOW = 5000; // em 5 segundos
function checkSpam(userId, guildId) {
    const key = `${guildId}:${userId}`;
    const now = Date.now();
    let timestamps = userMessageLogs.get(key) || [];
    // Limpar timestamps antigos fora da janela temporal
    timestamps = timestamps.filter(t => now - t < SPAM_WINDOW);
    timestamps.push(now);
    userMessageLogs.set(key, timestamps);
    // Se o usuário mandou mais que o limite dentro dos 5 segundos
    return timestamps.length > SPAM_LIMIT;
}
// ═══════════════════════════════════════════════════════════════════════════
// 🤖 AUTOMOD IA — Detecção por Inteligência Artificial
// ═══════════════════════════════════════════════════════════════════════════
const llm_service_1 = require("../../shared/services/llm.service");
const AI_MODERATION_PROMPT = `Você é um moderador de Discord. Analise a mensagem e determine se viola regras.

CATEGORIAS DE VIOLAÇÃO:
- toxicity: Ofensas, xingamentos, linguagem tóxica (mesmo disfarçada com espaços/números)
- harassment: Assédio, ameaças, bullying, discriminação
- nsfw: Conteúdo sexual/adulto explícito
- evasion: Tentativa de burlar filtros (ex: p-a-l-a-v-r-a, substituir letras por números)

Responda APENAS com JSON:
- Se VIOLA: {"violation": true, "type": "toxicity|harassment|nsfw|evasion", "reason": "explicação curta"}
- Se NÃO viola: {"violation": false}

IMPORTANTE: Gírias normais de jogos/internet NÃO são violação. Seja criterioso.`;
// Rate limiter: máx 10 checks/min por guild para não sobrecarregar API
const aiCheckCounts = new Map();
const AI_RATE_LIMIT = 10;
const AI_RATE_WINDOW = 60_000;
async function checkWithAI(content, guildId) {
    if (!llm_service_1.llmService.isReady())
        return null;
    if (content.length < 5)
        return null; // Mensagens muito curtas
    // Rate limiting
    const now = Date.now();
    const rateData = aiCheckCounts.get(guildId);
    if (rateData) {
        if (now < rateData.reset) {
            if (rateData.count >= AI_RATE_LIMIT)
                return null; // Limite atingido
            rateData.count++;
        }
        else {
            aiCheckCounts.set(guildId, { count: 1, reset: now + AI_RATE_WINDOW });
        }
    }
    else {
        aiCheckCounts.set(guildId, { count: 1, reset: now + AI_RATE_WINDOW });
    }
    try {
        const result = await llm_service_1.llmService.generateJson(AI_MODERATION_PROMPT, content);
        if (result && result.violation && result.type) {
            return { type: `IA: ${result.type}`, reason: result.reason || result.type };
        }
        return null;
    }
    catch (error) {
        services_1.logger.error('Erro no AutoMod IA', { error });
        return null;
    }
}
// ═══════════════════════════════════════════════════════════════════════════
// 🔧 AÇÕES DE MODERAÇÃO
// ═══════════════════════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════════════════════
async function handleViolation(message, violationType, details, config) {
    const { guild, author, channel, content, member } = message;
    if (!guild || !author || !channel || !member)
        return;
    // Analytics: rastrear ação de moderação
    (0, analytics_service_1.trackEvent)(guild.id, 'automod_action').catch(() => { });
    try {
        // 1. Deletar mensagem (Sempre, para remover o conteúdo ofensivo)
        if (message.deletable) {
            await message.delete();
        }
        // 2. Executar Ação Punitiva
        const action = config.automod_action || 'delete';
        const reason = `AutoMod: ${violationType}`;
        try {
            if (action === 'timeout') {
                const duration = config.automod_timeout_duration || 5; // Default 5 min
                await member.timeout(duration * 60 * 1000, reason);
                details += ` | Mutado por ${duration}m`;
            }
            else if (action === 'kick') {
                if (member.kickable) {
                    await member.kick(reason);
                    details += ` | Expulso`;
                }
            }
            else if (action === 'ban') {
                if (member.bannable) {
                    await member.ban({ reason, deleteMessageSeconds: 0 }); // Mensagem já deletada
                    details += ` | Banido`;
                }
            }
        }
        catch (actionError) {
            services_1.logger.error(`Falha ao executar ação ${action} no AutoMod`, { error: actionError.message });
            details += ` | Falha na ação: ${action}`;
        }
        // 2. Logar Auditoria (DB)
        await (0, services_1.logAudit)(guild.id, 'SYSTEM', 'message_deleted', author.id, {
            channel_id: channel.id,
            message_content: content.substring(0, 200),
            violation_type: violationType,
            details
        });
        // 3. Logar no Canal de Moderação (Se configurado)
        // config já foi passado como argumento
        if (config?.automod_channel) {
            const logChannel = guild.channels.cache.get(config.automod_channel);
            if (logChannel && logChannel.isTextBased()) {
                const embed = new discord_js_1.EmbedBuilder()
                    .setTitle('🛡️ AutoModeração')
                    .setColor('#FF0000') // Red
                    .addFields({ name: 'Usuário', value: `${author.tag} (<@${author.id}>)`, inline: true }, { name: 'Violação', value: violationType, inline: true }, { name: 'Canal', value: `<#${channel.id}>`, inline: true }, { name: 'Conteúdo', value: content.length > 1024 ? content.substring(0, 1021) + '...' : content })
                    .setFooter({ text: `ID: ${author.id}` })
                    .setTimestamp();
                await logChannel.send({ embeds: [embed] }).catch(() => { });
            }
        }
        // 4. Enviar DM (se possível)
        try {
            await author.send(`🚫 Sua mensagem foi removida no servidor **${guild.name}**.\n` +
                `**Motivo:** ${violationType} (${details})\n` +
                `**Mensagem:** "${content.substring(0, 50)}..."`);
        }
        catch {
            // Ignorar se DM fechada
        }
        // 5. Avisar no canal (opcional, deletar depois de 5s)
        const warning = await channel.send(`🚫 ${author}, evite usar linguagem proibida ou spam.`);
        setTimeout(() => warning.delete().catch(() => { }), 5000);
    }
    catch (error) {
        services_1.logger.error('Erro ao executar ação de AutoMod', { error });
    }
}
//# sourceMappingURL=automod.service.js.map