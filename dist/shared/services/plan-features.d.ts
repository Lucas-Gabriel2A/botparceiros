/**
 * 🔒 Plan Feature Gating Service
 *
 * Controle centralizado de funcionalidades por plano.
 * Free (sem assinatura) → Starter → Pro → Ultimate
 */
export type PlanTier = 'free' | 'starter' | 'pro' | 'ultimate';
/**
 * Mapa de features → plano mínimo necessário.
 * Cada feature que precisa de gating deve estar listada aqui.
 */
export declare const FEATURE_PLAN_MAP: {
    readonly corebot_ia: "free";
    readonly welcome: "free";
    readonly automod_basic: "free";
    readonly tickets: "starter";
    readonly custom_commands: "starter";
    readonly private_calls: "starter";
    readonly automod_ia: "pro";
    readonly sem_marca: "pro";
    readonly server_builder: "pro";
    readonly analytics: "ultimate";
    readonly partnerships: "ultimate";
    readonly whitelabel: "ultimate";
};
export type Feature = keyof typeof FEATURE_PLAN_MAP;
/**
 * Retorna o plano do owner de uma guild.
 * Se não tiver assinatura ativa, retorna 'free'.
 */
export declare function getUserPlan(userId: string, ignoreCache?: boolean): Promise<PlanTier>;
/**
 * Verifica se o plano do usuário tem acesso a uma feature.
 */
export declare function hasPlanAccess(userPlan: PlanTier, feature: Feature): boolean;
/**
 * Verifica se o plano atinge um nível mínimo.
 */
export declare function isPlanAtLeast(userPlan: PlanTier, minimum: PlanTier): boolean;
/**
 * Shortcut: busca plano e verifica acesso em uma chamada.
 */
export declare function canUseFeature(userId: string, feature: Feature): Promise<boolean>;
/**
 * Mensagem de erro para features bloqueadas.
 */
export declare function getPlanUpgradeMessage(feature: Feature): string;
/**
 * Limpa o cache de um usuário (usado quando ele faz upgrade/downgrade).
 */
export declare function clearPlanCache(userId: string): void;
//# sourceMappingURL=plan-features.d.ts.map