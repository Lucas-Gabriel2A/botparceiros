import { query } from './database';
import { getUserPlan, PlanTier } from './plan-features';
import { logger } from './logger.service';

const AI_LIMITS: Record<PlanTier, number> = {
    free: 5,
    starter: 15,
    pro: 50, // 50 mensagens diárias
    ultimate: -1 // Unlimited
};

export async function checkAiLimit(userId: string, guildId: string, ownerId: string, ignoreCache: boolean = false): Promise<{ allowed: boolean; limit: number; current: number; plan: PlanTier }> {
    try {
        const plan = await getUserPlan(ownerId, ignoreCache);
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

export function getLimitMessage(plan: PlanTier, limit: number): { title: string; description: string; color: number; footer: string } {
    const planNames: Record<PlanTier, string> = { free: 'Free', starter: 'Starter', pro: 'Pro', ultimate: 'Ultimate' };

    if (plan === 'free') {
        return {
            title: '⚠️ Limite de Mensagens Atingido',
            description: `Você utilizou todas as **${limit} mensagens diárias** disponíveis no plano **${planNames[plan]}** deste servidor.\n\nPara liberar mais interações, o **dono do servidor** pode fazer upgrade de plano no painel.`,
            color: 0xFFA500,
            footer: `Plano atual do servidor: ${planNames[plan]} • Limite: ${limit}/dia`
        };
    }
    return {
        title: '⚠️ Limite Diário Atingido',
        description: `Você atingiu o limite de **${limit} mensagens diárias** com o plano **${planNames[plan]}**.\n\nO dono do servidor pode ampliar os limites fazendo upgrade no painel.`,
        color: 0xFFA500,
        footer: `Plano: ${planNames[plan]} • Limite: ${limit}/dia`
    };
}

// Server Generation Limits (Monthly)
const SERVER_GEN_LIMITS: Record<PlanTier, number> = {
    free: 1,
    starter: 5,
    pro: 15, // 15 gerações mensais
    ultimate: -1 // Unlimited
};

export async function checkServerGenLimit(userId: string, ignoreCache: boolean = false): Promise<{ allowed: boolean; limit: number; current: number; plan: PlanTier }> {
    try {
        const plan = await getUserPlan(userId, ignoreCache);
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
            // return { allowed: false, limit, current, plan }; // Bypassed for testing
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
