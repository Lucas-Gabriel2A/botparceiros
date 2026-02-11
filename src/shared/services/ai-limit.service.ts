import { query } from './database';
import { getUserPlan, PlanTier } from './plan-features';
import { logger } from './logger.service';

const AI_LIMITS: Record<PlanTier, number> = {
    free: 5,
    starter: 15,
    pro: -1, // Unlimited
    ultimate: -1 // Unlimited
};

export async function checkAiLimit(userId: string, guildId: string, ownerId: string): Promise<{ allowed: boolean; limit: number; current: number; plan: PlanTier }> {
    try {
        const plan = await getUserPlan(ownerId);
        const limit = AI_LIMITS[plan];

        // Unlimited plans
        if (limit === -1) {
            return { allowed: true, limit, current: 0, plan };
        }

        // Check usage
        const result = await query<{ count: number }>(
            `SELECT count FROM ai_usage WHERE user_id = $1 AND guild_id = $2 AND date = CURRENT_DATE`,
            [userId, guildId]
        );

        const current = result.rows[0]?.count || 0;

        if (current >= limit) {
            return { allowed: false, limit, current, plan };
        }

        return { allowed: true, limit, current, plan };

    } catch (error) {
        logger.error('Erro ao verificar limite de IA', { error, userId, guildId });
        // Fallback: allow to avoid blocking on error, but log it
        return { allowed: true, limit: 5, current: 0, plan: 'free' };
    }
}

export async function incrementAiUsage(userId: string, guildId: string): Promise<void> {
    try {
        await query(
            `INSERT INTO ai_usage (user_id, guild_id, date, count)
             VALUES ($1, $2, CURRENT_DATE, 1)
             ON CONFLICT (user_id, guild_id, date)
             DO UPDATE SET count = ai_usage.count + 1`,
            [userId, guildId]
        );
    } catch (error) {
        logger.error('Erro ao incrementar uso de IA', { error, userId, guildId });
    }
}

export function getLimitMessage(plan: PlanTier, limit: number): string {
    const dashboardUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const upgradeLink = `[Fazer Upgrade](${dashboardUrl}/dashboard/billing)`;

    if (plan === 'free') {
        return `⚠️ Você atingiu o limite gratuito de **${limit} mensagens diárias** neste servidor.\nPeça ao dono do servidor para fazer upgrade para o plano **Pro** para conversas ilimitadas!\n🔗 ${upgradeLink}`;
    }
    return `⚠️ Você atingiu o limite de **${limit} mensagens diárias**.\nO servidor precisa de um plano superior para liberar mais interações.\n🔗 ${upgradeLink}`;
}

// Server Generation Limits (Monthly)
const SERVER_GEN_LIMITS: Record<PlanTier, number> = {
    free: 1,
    starter: 5,
    pro: -1, // Unlimited
    ultimate: -1 // Unlimited
};

export async function checkServerGenLimit(userId: string): Promise<{ allowed: boolean; limit: number; current: number; plan: PlanTier }> {
    try {
        const plan = await getUserPlan(userId);
        const limit = SERVER_GEN_LIMITS[plan];

        if (limit === -1) {
            return { allowed: true, limit: -1, current: 0, plan };
        }

        const date = new Date();
        const monthYear = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

        const result = await query<{ count: number }>(
            `SELECT count FROM server_generation_usage WHERE user_id = $1 AND month_year = $2`,
            [userId, monthYear]
        );

        const current = result.rows[0]?.count || 0;

        if (current >= limit) {
            return { allowed: false, limit, current, plan };
        }

        return { allowed: true, limit, current, plan };

    } catch (error) {
        logger.error('Erro ao verificar limite de geração de servidor', { error, userId });
        return { allowed: true, limit: 1, current: 0, plan: 'free' };
    }
}

export async function incrementServerGenUsage(userId: string): Promise<void> {
    try {
        const date = new Date();
        const monthYear = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

        await query(
            `INSERT INTO server_generation_usage (user_id, month_year, count)
             VALUES ($1, $2, 1)
             ON CONFLICT (user_id, month_year)
             DO UPDATE SET count = server_generation_usage.count + 1`,
            [userId, monthYear]
        );
    } catch (error) {
        logger.error('Erro ao incrementar uso de geração de servidor', { error, userId });
    }
}
