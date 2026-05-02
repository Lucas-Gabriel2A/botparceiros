"use strict";
/**
 * 🔒 Plan Feature Gating Service
 *
 * Controle centralizado de funcionalidades por plano.
 * Free (sem assinatura) → Starter → Pro → Ultimate
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.FEATURE_PLAN_MAP = void 0;
exports.getUserPlan = getUserPlan;
exports.hasPlanAccess = hasPlanAccess;
exports.isPlanAtLeast = isPlanAtLeast;
exports.canUseFeature = canUseFeature;
exports.getPlanUpgradeMessage = getPlanUpgradeMessage;
exports.clearPlanCache = clearPlanCache;
const database_1 = require("./database");
const logger_service_1 = require("./logger.service");
const PLAN_HIERARCHY = {
    free: 0,
    starter: 1,
    pro: 2,
    ultimate: 3
};
/**
 * Mapa de features → plano mínimo necessário.
 * Cada feature que precisa de gating deve estar listada aqui.
 */
exports.FEATURE_PLAN_MAP = {
    // Core (Free)
    corebot_ia: 'free',
    welcome: 'free',
    automod_basic: 'free',
    // Starter
    tickets: 'starter',
    custom_commands: 'starter',
    private_calls: 'starter',
    // Pro
    automod_ia: 'pro',
    sem_marca: 'pro',
    server_builder: 'pro',
    // Ultimate
    analytics: 'ultimate',
    partnerships: 'ultimate',
    whitelabel: 'ultimate',
};
// ═══════════════════════════════════════════════════════════════════════════
// 🔒 CACHE (mesmo padrão do branding.service)
// ═══════════════════════════════════════════════════════════════════════════
const planCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 min
setInterval(() => {
    const now = Date.now();
    for (const [key, value] of planCache.entries()) {
        if (value.expires <= now) {
            planCache.delete(key);
        }
    }
}, CACHE_TTL);
/**
 * Retorna o plano do owner de uma guild.
 * Se não tiver assinatura ativa, retorna 'free'.
 */
async function getUserPlan(userId, ignoreCache = false) {
    try {
        if (!ignoreCache) {
            const cached = planCache.get(userId);
            if (cached && cached.expires > Date.now()) {
                return cached.plan;
            }
        }
        const sub = await (0, database_1.getSubscriptionByUser)(userId);
        const plan = (sub?.status === 'authorized' ? sub.plan : 'free');
        planCache.set(userId, { plan, expires: Date.now() + CACHE_TTL });
        return plan;
    }
    catch (error) {
        logger_service_1.logger.error('Erro ao verificar plano', { error });
        return 'free'; // Falha = Free (seguro)
    }
}
/**
 * Verifica se o plano do usuário tem acesso a uma feature.
 */
function hasPlanAccess(userPlan, feature) {
    const requiredPlan = exports.FEATURE_PLAN_MAP[feature];
    return PLAN_HIERARCHY[userPlan] >= PLAN_HIERARCHY[requiredPlan];
}
/**
 * Verifica se o plano atinge um nível mínimo.
 */
function isPlanAtLeast(userPlan, minimum) {
    return PLAN_HIERARCHY[userPlan] >= PLAN_HIERARCHY[minimum];
}
/**
 * Shortcut: busca plano e verifica acesso em uma chamada.
 */
async function canUseFeature(userId, feature) {
    const plan = await getUserPlan(userId);
    return hasPlanAccess(plan, feature);
}
/**
 * Mensagem de erro para features bloqueadas.
 */
function getPlanUpgradeMessage(feature) {
    const requiredPlan = exports.FEATURE_PLAN_MAP[feature];
    const planNames = {
        free: 'Free',
        starter: 'Starter',
        pro: 'Pro',
        ultimate: 'Ultimate'
    };
    return `⚠️ Esta funcionalidade requer o plano **${planNames[requiredPlan]}** ou superior. Faça upgrade em nosso painel!`;
}
/**
 * Limpa o cache de um usuário (usado quando ele faz upgrade/downgrade).
 */
function clearPlanCache(userId) {
    planCache.delete(userId);
}
//# sourceMappingURL=plan-features.js.map