"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupAutoModEvents = setupAutoModEvents;
const discord_js_1 = require("discord.js");
const services_1 = require("../../shared/services");
const automod_service_1 = require("./automod.service");
const plan_features_1 = require("../../shared/services/plan-features");
async function processMessage(message, isEdit = false) {
    // Ignorar bots e mensagens sem guild
    if (!message.author || message.author.bot || !message.guild || !message.content || !message.member)
        return;
    // Ignorar administradores (opcional, geralmente admins bypassam automod)
    if (message.member.permissions.has(discord_js_1.PermissionFlagsBits.Administrator))
        return;
    try {
        const config = await (0, services_1.getGuildConfig)(message.guild.id);
        if (!config)
            return;
        // 0. Verificar Bypass Roles
        if (config.automod_bypass_roles && config.automod_bypass_roles.length > 0) {
            const hasBypassRole = config.automod_bypass_roles.some(roleId => message.member.roles.cache.has(roleId));
            if (hasBypassRole)
                return;
        }
        // 1. Verificar Palavras Proibidas
        if (config.prohibited_words && config.prohibited_words.length > 0) {
            const detectedWord = (0, automod_service_1.checkProhibitedWords)(message.content, config.prohibited_words);
            if (detectedWord) {
                services_1.logger.info(`🚨 AutoMod: Palavra proibida "${detectedWord}" detectada de ${message.author.tag}`);
                await (0, automod_service_1.handleViolation)(message, 'Palavra Proibida', detectedWord, config);
                return; // Interrompe processamento se já violou
            }
        }
        // 2. Verificar Links (Se ativado)
        if (config.automod_links_enabled) {
            if ((0, automod_service_1.checkLinks)(message.content)) {
                services_1.logger.info(`🚨 AutoMod: Link detectado de ${message.author.tag}`);
                await (0, automod_service_1.handleViolation)(message, 'Link Proibido', 'URL externa detectada', config);
                return;
            }
        }
        // 3. Verificar Caps Lock (Se ativado)
        if (config.automod_caps_enabled) {
            if ((0, automod_service_1.checkCaps)(message.content)) {
                services_1.logger.info(`🚨 AutoMod: Caps Lock excessivo de ${message.author.tag}`);
                await (0, automod_service_1.handleViolation)(message, 'Caps Lock Excessivo', 'Mais de 70% de maiúsculas', config);
                return;
            }
            if ((0, automod_service_1.checkFlood)(message.content)) {
                services_1.logger.info(`🚨 AutoMod: Flood de Letras de ${message.author.tag}`);
                await (0, automod_service_1.handleViolation)(message, 'Text Flood', 'Letras repetidas excessivamente', config);
                return;
            }
        }
        // 4. Verificar Spam (APENAS MENSAGENS NOVAS, ignoramos em edições pois não incrementa volume)
        if (!isEdit && config.automod_spam_enabled) {
            if ((0, automod_service_1.checkSpam)(message.author.id, message.guild.id)) {
                services_1.logger.info(`🚨 AutoMod: Spam detectado de ${message.author.tag}`);
                await (0, automod_service_1.handleViolation)(message, 'Spam', 'Mensagens muito frequentes', config);
                return;
            }
        }
        // 5. AutoMod IA (Pro/Ultimate) — Verifica plano antes de usar
        if (config.automod_ai_enabled) {
            const hasAccess = await (0, plan_features_1.canUseFeature)(message.guild.ownerId, 'automod_ia');
            if (hasAccess) {
                const aiResult = await (0, automod_service_1.checkWithAI)(message.content, message.guild.id);
                if (aiResult) {
                    services_1.logger.info(`🤖 AutoMod IA: ${aiResult.type} detectado de ${message.author.tag}`);
                    await (0, automod_service_1.handleViolation)(message, aiResult.type, aiResult.reason, config);
                    return;
                }
            }
        }
    }
    catch (error) {
        services_1.logger.error('Erro no processamento do AutoMod', { error });
    }
}
function setupAutoModEvents(client) {
    services_1.logger.info('🛡️ Módulo AutoMod: Eventos inicializados');
    client.on('messageCreate', async (message) => {
        await processMessage(message, false);
    });
    client.on('messageUpdate', async (_oldMessage, newMessage) => {
        if (!newMessage.partial) {
            await processMessage(newMessage, true);
        }
        else {
            // Se a mensagem for parcial (não cacheada), podemos tentar buscar o conteudo completo
            try {
                const fullMessage = await newMessage.fetch();
                await processMessage(fullMessage, true);
            }
            catch (error) {
                services_1.logger.error('Erro ao dar fetch na messageUpdate parcial do AutoMod', { error });
            }
        }
    });
}
//# sourceMappingURL=events.js.map