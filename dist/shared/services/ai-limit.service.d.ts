import { PlanTier } from './plan-features';
export declare function checkAiLimit(userId: string, guildId: string, ownerId: string, ignoreCache?: boolean): Promise<{
    allowed: boolean;
    limit: number;
    current: number;
    plan: PlanTier;
}>;
export declare function incrementAiUsage(userId: string, guildId: string): Promise<void>;
export declare function syncRedisLimitsToDatabase(): Promise<void>;
export declare function getLimitMessage(plan: PlanTier, limit: number): {
    title: string;
    description: string;
    color: number;
    footer: string;
};
export declare function checkServerGenLimit(userId: string, ignoreCache?: boolean): Promise<{
    allowed: boolean;
    limit: number;
    current: number;
    plan: PlanTier;
}>;
export declare function incrementServerGenUsage(userId: string): Promise<void>;
//# sourceMappingURL=ai-limit.service.d.ts.map