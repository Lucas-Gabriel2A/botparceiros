
import { Client, Message, PermissionFlagsBits } from 'discord.js';
import { getGuildConfig, logger } from '../../shared/services';
import { checkProhibitedWords, checkCaps, checkLinks, handleViolation } from './automod.service';

export function setupAutoModEvents(client: Client) {
    logger.info('🛡️ Módulo AutoMod: Eventos inicializados');

    client.on('messageCreate', async (message: Message) => {
        // Ignorar bots e mensagens sem guild
        if (message.author.bot || !message.guild) return;

        // Ignorar administradores (opcional, geralmente admins bypassam automod)
        if (message.member?.permissions.has(PermissionFlagsBits.Administrator)) return;

        try {
            const config = await getGuildConfig(message.guild.id);
            if (!config) return;

            // 0. Verificar Bypass Roles
            if (config.automod_bypass_roles && config.automod_bypass_roles.length > 0 && message.member) {
                const hasBypassRole = config.automod_bypass_roles.some(roleId => message.member!.roles.cache.has(roleId));
                if (hasBypassRole) return;
            }

            // 1. Verificar Palavras Proibidas
            if (config.prohibited_words && config.prohibited_words.length > 0) {
                const detectedWord = checkProhibitedWords(message.content, config.prohibited_words);
                if (detectedWord) {
                    logger.info(`🚨 AutoMod: Palavra proibida "${detectedWord}" detectada de ${message.author.tag}`);
                    await handleViolation(message, 'Palavra Proibida', detectedWord, config);
                    return; // Interrompe processamento se já violou
                }
            }

            // 2. Verificar Links (Se ativado)
            if (config.automod_links_enabled) {
                if (checkLinks(message.content)) {
                    logger.info(`🚨 AutoMod: Link detectado de ${message.author.tag}`);
                    await handleViolation(message, 'Link Proibido', 'URL externa detectada', config);
                    return;
                }
            }

            // 3. Verificar Caps Lock (Se ativado)
            if (config.automod_caps_enabled) {
                // Só verifica mensagens com tamanho mínimo para evitar falsos positivos em "OK" ou "OLA"
                if (checkCaps(message.content)) {
                    logger.info(`🚨 AutoMod: Caps Lock excessivo de ${message.author.tag}`);
                    await handleViolation(message, 'Caps Lock Excessivo', 'Mais de 70% de maiúsculas', config);
                    return;
                }
            }

            // 4. Verificar Spam (Futuro - requer cache de mensagens recentes)
            // if (config.automod_spam_enabled) { ... }

        } catch (error) {
            logger.error('Erro no processamento do AutoMod', { error });
        }
    });

    // TODO: Adicionar listener para messageUpdate também (caso editem a mensagem para burlar)
    client.on('messageUpdate', async (_oldMessage, newMessage) => {
        if (!newMessage.partial) {
            // Reutilizar lógica (extrair para função 'processMessage')
            // Por simplicidade, deixaremos apenas messageCreate por enquanto
        }
    });
}
