import { Client, Message, PartialMessage, PermissionFlagsBits } from 'discord.js';
import { getGuildConfig, logger } from '../../shared/services';
import { checkProhibitedWords, checkCaps, checkFlood, checkLinks, checkWithAI, handleViolation, checkSpam } from './automod.service';
import { canUseFeature } from '../../shared/services/plan-features';

async function processMessage(message: Message | PartialMessage, isEdit: boolean = false) {
    // Ignorar bots e mensagens sem guild
    if (!message.author || message.author.bot || !message.guild || !message.content || !message.member) return;

    // Ignorar administradores (opcional, geralmente admins bypassam automod)
    if (message.member.permissions.has(PermissionFlagsBits.Administrator)) return;

    try {
        const config = await getGuildConfig(message.guild.id);
        if (!config) return;

        // 0. Verificar Bypass Roles
        if (config.automod_bypass_roles && config.automod_bypass_roles.length > 0) {
            const hasBypassRole = config.automod_bypass_roles.some(roleId => message.member!.roles.cache.has(roleId));
            if (hasBypassRole) return;
        }

        // 1. Verificar Palavras Proibidas
        if (config.prohibited_words && config.prohibited_words.length > 0) {
            const detectedWord = checkProhibitedWords(message.content, config.prohibited_words);
            if (detectedWord) {
                logger.info(`🚨 AutoMod: Palavra proibida "${detectedWord}" detectada de ${message.author.tag}`);
                await handleViolation(message as Message, 'Palavra Proibida', detectedWord, config);
                return; // Interrompe processamento se já violou
            }
        }

        // 2. Verificar Links (Se ativado)
        if (config.automod_links_enabled) {
            if (checkLinks(message.content)) {
                logger.info(`🚨 AutoMod: Link detectado de ${message.author.tag}`);
                await handleViolation(message as Message, 'Link Proibido', 'URL externa detectada', config);
                return;
            }
        }

        // 3. Verificar Caps Lock (Se ativado)
        if (config.automod_caps_enabled) {
            if (checkCaps(message.content)) {
                logger.info(`🚨 AutoMod: Caps Lock excessivo de ${message.author.tag}`);
                await handleViolation(message as Message, 'Caps Lock Excessivo', 'Mais de 70% de maiúsculas', config);
                return;
            }
            if (checkFlood(message.content)) {
                logger.info(`🚨 AutoMod: Flood de Letras de ${message.author.tag}`);
                await handleViolation(message as Message, 'Text Flood', 'Letras repetidas excessivamente', config);
                return;
            }
        }

        // 4. Verificar Spam (APENAS MENSAGENS NOVAS, ignoramos em edições pois não incrementa volume)
        if (!isEdit && config.automod_spam_enabled) {
            if (checkSpam(message.author.id, message.guild.id)) {
                logger.info(`🚨 AutoMod: Spam detectado de ${message.author.tag}`);
                await handleViolation(message as Message, 'Spam', 'Mensagens muito frequentes', config);
                return;
            }
        }

        // 5. AutoMod IA (Pro/Ultimate) — Verifica plano antes de usar
        if (config.automod_ai_enabled) {
            const hasAccess = await canUseFeature(message.guild.ownerId, 'automod_ia');
            if (hasAccess) {
                const aiResult = await checkWithAI(message.content, message.guild.id);
                if (aiResult) {
                    logger.info(`🤖 AutoMod IA: ${aiResult.type} detectado de ${message.author.tag}`);
                    await handleViolation(message as Message, aiResult.type, aiResult.reason, config);
                    return;
                }
            }
        }

    } catch (error) {
        logger.error('Erro no processamento do AutoMod', { error });
    }
}

export function setupAutoModEvents(client: Client) {
    logger.info('🛡️ Módulo AutoMod: Eventos inicializados');

    client.on('messageCreate', async (message: Message) => {
        await processMessage(message, false);
    });

    client.on('messageUpdate', async (_oldMessage, newMessage) => {
        if (!newMessage.partial) {
            await processMessage(newMessage, true);
        } else {
            // Se a mensagem for parcial (não cacheada), podemos tentar buscar o conteudo completo
            try {
                const fullMessage = await newMessage.fetch();
                await processMessage(fullMessage, true);
            } catch (error) {
                logger.error('Erro ao dar fetch na messageUpdate parcial do AutoMod', { error });
            }
        }
    });
}
