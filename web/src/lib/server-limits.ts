import { query } from './db';

export type PlanTier = 'free' | 'starter' | 'pro' | 'ultimate';

// Server Generation Limits (Monthly)
const SERVER_GEN_LIMITS: Record<PlanTier, number> = {
    free: 1,      // 1 server per month
    starter: 5,   // 5 servers per month
    pro: -1,      // Unlimited
    ultimate: -1  // Unlimited
};

export async function getUserPlan(userId: string): Promise<PlanTier> {

   
    // if (process.env.NODE_ENV === 'development') {
    //     return 'ultimate';
    // }

    try {
     
        const result = await query<{ plan: PlanTier }>(
            `SELECT plan FROM subscriptions 
             WHERE user_id = $1 AND status IN ('authorized', 'active') 
             ORDER BY created_at DESC LIMIT 1`,
            [userId]
        );

        if (result.rows.length > 0) {
            return result.rows[0].plan;
        }

        return 'free';
    } catch (error) {
        console.error('Error fetching user plan:', error);
        return 'free';
    }
}

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
            // return { allowed: false, limit, current, plan }; // Bypassed for testing
        }

        return { allowed: true, limit, current, plan };

    } catch (error) {
        console.error('Error in checkServerGenLimit:', error);
        // Fallback to allow during testing if DB connection fails
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
        console.error('Error in incrementServerGenUsage:', error);
    }
}
