import { Message, TextChannel, EmbedBuilder } from 'discord.js';
import { logger, logAudit, GuildConfig } from '../../shared/services';
import { trackEvent } from '../../shared/services/analytics.service';

// ═══════════════════════════════════════════════════════════════════════════
// 🛡️ INTERFACES E TIPOS
// ═══════════════════════════════════════════════════════════════════════════

export interface AutoModViolation {
    type: 'prohibited_word' | 'spam' | 'caps' | 'link';
    content: string;
    detected: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// 🧠 LÓGICA DE DETECÇÃO (Stateless)
// ═══════════════════════════════════════════════════════════════════════════

export function checkProhibitedWords(content: string, prohibitedWords: string[]): string | null {
    if (!prohibitedWords || prohibitedWords.length === 0) return null;

    const lowerContent = content.toLowerCase();
    for (const word of prohibitedWords) {
        if (lowerContent.includes(word.toLowerCase())) {
            return word;
        }
    }
    return null;
}

export function checkCaps(content: string, threshold = 0.7, minLength = 10): boolean {
    if (content.length < minLength) return false;

    const capsCount = content.replace(/[^A-Z]/g, "").length;
    const ratio = capsCount / content.length;

    return ratio >= threshold;
}

export function checkLinks(content: string): boolean {
    // Regex simples para detectar http/https links
    const linkRegex = /(https?:\/\/[^\s]+)/g;
    return linkRegex.test(content);
}

// ═══════════════════════════════════════════════════════════════════════════
// 🤖 AUTOMOD IA — Detecção por Inteligência Artificial
// ═══════════════════════════════════════════════════════════════════════════

import { llmService } from '../../shared/services/llm.service';

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

interface AIModResult {
    violation: boolean;
    type?: string;
    reason?: string;
}

// Rate limiter: máx 10 checks/min por guild para não sobrecarregar API
const aiCheckCounts = new Map<string, { count: number; reset: number }>();
const AI_RATE_LIMIT = 10;
const AI_RATE_WINDOW = 60_000;

export async function checkWithAI(content: string, guildId: string): Promise<{ type: string; reason: string } | null> {
    if (!llmService.isReady()) return null;
    if (content.length < 5) return null; // Mensagens muito curtas

    // Rate limiting
    const now = Date.now();
    const rateData = aiCheckCounts.get(guildId);
    if (rateData) {
        if (now < rateData.reset) {
            if (rateData.count >= AI_RATE_LIMIT) return null; // Limite atingido
            rateData.count++;
        } else {
            aiCheckCounts.set(guildId, { count: 1, reset: now + AI_RATE_WINDOW });
        }
    } else {
        aiCheckCounts.set(guildId, { count: 1, reset: now + AI_RATE_WINDOW });
    }

    try {
        const result = await llmService.generateJson<AIModResult>(
            AI_MODERATION_PROMPT,
            content
        );

        if (result && result.violation && result.type) {
            return { type: `IA: ${result.type}`, reason: result.reason || result.type };
        }

        return null;
    } catch (error) {
        logger.error('Erro no AutoMod IA', { error });
        return null;
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// 🔧 AÇÕES DE MODERAÇÃO
// ═══════════════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════════════

export async function handleViolation(
    message: Message,
    violationType: string,
    details: string,
    config: GuildConfig
): Promise<void> {
    const { guild, author, channel, content, member } = message;
    if (!guild || !author || !channel || !member) return;

    // Analytics: rastrear ação de moderação
    trackEvent(guild.id, 'automod_action').catch(() => { });

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
            } else if (action === 'kick') {
                if (member.kickable) {
                    await member.kick(reason);
                    details += ` | Expulso`;
                }
            } else if (action === 'ban') {
                if (member.bannable) {
                    await member.ban({ reason, deleteMessageSeconds: 0 }); // Mensagem já deletada
                    details += ` | Banido`;
                }
            }
        } catch (actionError: any) {
            logger.error(`Falha ao executar ação ${action} no AutoMod`, { error: actionError.message });
            details += ` | Falha na ação: ${action}`;
        }

        // 2. Logar Auditoria (DB)
        await logAudit(
            guild.id,
            'SYSTEM',
            'message_deleted',
            author.id,
            {
                channel_id: channel.id,
                message_content: content.substring(0, 200),
                violation_type: violationType,
                details
            }
        );

        // 3. Logar no Canal de Moderação (Se configurado)
        // config já foi passado como argumento
        if (config?.automod_channel) {
            const logChannel = guild.channels.cache.get(config.automod_channel) as TextChannel;
            if (logChannel && logChannel.isTextBased()) {
                const embed = new EmbedBuilder()
                    .setTitle('🛡️ AutoModeração')
                    .setColor('#FF0000') // Red
                    .addFields(
                        { name: 'Usuário', value: `${author.tag} (<@${author.id}>)`, inline: true },
                        { name: 'Violação', value: violationType, inline: true },
                        { name: 'Canal', value: `<#${channel.id}>`, inline: true },
                        { name: 'Conteúdo', value: content.length > 1024 ? content.substring(0, 1021) + '...' : content }
                    )
                    .setFooter({ text: `ID: ${author.id}` })
                    .setTimestamp();

                await logChannel.send({ embeds: [embed] }).catch(() => { });
            }
        }

        // 4. Enviar DM (se possível)
        try {
            await author.send(
                `🚫 Sua mensagem foi removida no servidor **${guild.name}**.\n` +
                `**Motivo:** ${violationType} (${details})\n` +
                `**Mensagem:** "${content.substring(0, 50)}..."`
            );
        } catch {
            // Ignorar se DM fechada
        }

        // 5. Avisar no canal (opcional, deletar depois de 5s)
        const warning = await (channel as TextChannel).send(
            `🚫 ${author}, evite usar linguagem proibida ou spam.`
        );
        setTimeout(() => warning.delete().catch(() => { }), 5000);

    } catch (error) {
        logger.error('Erro ao executar ação de AutoMod', { error });
    }
}
