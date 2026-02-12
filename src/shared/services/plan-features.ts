/**
 * 🔒 Plan Feature Gating Service
 * 
 * Controle centralizado de funcionalidades por plano.
 * Free (sem assinatura) → Starter → Pro → Ultimate
 */

import { getSubscriptionByUser } from './database';
import { logger } from './logger.service';

// ═══════════════════════════════════════════════════════════════════════════
// 📊 TIPOS E CONSTANTES
// ═══════════════════════════════════════════════════════════════════════════

export type PlanTier = 'free' | 'starter' | 'pro' | 'ultimate';

const PLAN_HIERARCHY: Record<PlanTier, number> = {
    free: 0,
    starter: 1,
    pro: 2,
    ultimate: 3
};

/**
 * Mapa de features → plano mínimo necessário.
 * Cada feature que precisa de gating deve estar listada aqui.
 */
export const FEATURE_PLAN_MAP = {
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
} as const satisfies Record<string, PlanTier>;

export type Feature = keyof typeof FEATURE_PLAN_MAP;

// ═══════════════════════════════════════════════════════════════════════════
// 🔒 CACHE (mesmo padrão do branding.service)
// ═══════════════════════════════════════════════════════════════════════════

const planCache = new Map<string, { plan: PlanTier; expires: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 min

/**
 * Retorna o plano do owner de uma guild.
 * Se não tiver assinatura ativa, retorna 'free'.
 */
export async function getUserPlan(userId: string, ignoreCache = false): Promise<PlanTier> {
    try {
        if (!ignoreCache) {
            const cached = planCache.get(userId);
            if (cached && cached.expires > Date.now()) {
                return cached.plan;
            }
        }

        const sub = await getSubscriptionByUser(userId);
        const plan: PlanTier = (sub?.status === 'authorized' ? sub.plan : 'free') as PlanTier;

        planCache.set(userId, { plan, expires: Date.now() + CACHE_TTL });
        return plan;
    } catch (error) {
        logger.error('Erro ao verificar plano', { error });
        return 'free'; // Falha = Free (seguro)
    }
}

/**
 * Verifica se o plano do usuário tem acesso a uma feature.
 */
export function hasPlanAccess(userPlan: PlanTier, feature: Feature): boolean {
    const requiredPlan = FEATURE_PLAN_MAP[feature];
    return PLAN_HIERARCHY[userPlan] >= PLAN_HIERARCHY[requiredPlan];
}

/**
 * Verifica se o plano atinge um nível mínimo.
 */
export function isPlanAtLeast(userPlan: PlanTier, minimum: PlanTier): boolean {
    return PLAN_HIERARCHY[userPlan] >= PLAN_HIERARCHY[minimum];
}

/**
 * Shortcut: busca plano e verifica acesso em uma chamada.
 */
export async function canUseFeature(userId: string, feature: Feature): Promise<boolean> {
    const plan = await getUserPlan(userId);
    return hasPlanAccess(plan, feature);
}

/**
 * Mensagem de erro para features bloqueadas.
 */
export function getPlanUpgradeMessage(feature: Feature): string {
    const requiredPlan = FEATURE_PLAN_MAP[feature];
    const planNames: Record<PlanTier, string> = {
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
export function clearPlanCache(userId: string): void {
    planCache.delete(userId);
}
