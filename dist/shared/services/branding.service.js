"use strict";
/**
 * ⚡ Branding Service
 *
 * Adiciona/remove footer "Powered by CoreBot" baseado no plano do servidor.
 * Free/Starter = com marca | Pro/Ultimate = sem marca
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getBrandingFooter = getBrandingFooter;
exports.applyBranding = applyBranding;
const database_1 = require("./database");
const logger_service_1 = require("./logger.service");
const BRANDING_FOOTER = '⚡ Powered by CoreBot';
// Cache simples para evitar queries repetidas (TTL 5 min)
const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000;
setInterval(() => {
    const now = Date.now();
    for (const [key, value] of cache.entries()) {
        if (value.expires <= now) {
            cache.delete(key);
        }
    }
}, CACHE_TTL);
/**
 * Retorna o footer de branding para uma guild.
 * Se o owner tiver plano Pro/Ultimate, retorna null (sem marca).
 */
async function getBrandingFooter(ownerId) {
    try {
        // Check cache
        const cached = cache.get(ownerId);
        if (cached && cached.expires > Date.now()) {
            return shouldShowBranding(cached.plan) ? BRANDING_FOOTER : null;
        }
        const sub = await (0, database_1.getSubscriptionByUser)(ownerId);
        const plan = sub?.status === 'authorized' ? sub.plan : null;
        // Update cache
        cache.set(ownerId, { plan, expires: Date.now() + CACHE_TTL });
        return shouldShowBranding(plan) ? BRANDING_FOOTER : null;
    }
    catch (error) {
        logger_service_1.logger.error('Erro ao verificar branding', { error });
        return BRANDING_FOOTER; // Falha = mostra marca (seguro)
    }
}
/**
 * Aplica branding a uma resposta de texto
 */
function applyBranding(text, footer) {
    if (!footer)
        return text;
    return `${text}\n\n-# ${footer}`;
}
function shouldShowBranding(plan) {
    // Pro e Ultimate não mostram marca
    return plan !== 'pro' && plan !== 'ultimate';
}
//# sourceMappingURL=branding.service.js.map