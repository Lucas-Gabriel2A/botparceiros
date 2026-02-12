import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { query } from "@shared/services/database";
import { getUserPlan, PlanTier } from "@shared/services/plan-features";
import { PLAN_LIMITS } from "@/config/subscription";

// AI Limits (same as ai-limit.service.ts)
const AI_LIMITS: Record<PlanTier, number> = {
    free: 5,
    starter: 15,
    pro: -1,
    ultimate: -1
};

const SERVER_GEN_LIMITS: Record<PlanTier, number> = {
    free: 1,
    starter: 5,
    pro: -1,
    ultimate: -1
};

export async function GET(req: NextRequest) {
    const session = await getServerSession(authOptions);

    // @ts-ignore
    if (!session || !session.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // @ts-ignore
    const userId = session.user.id;

    const searchParams = req.nextUrl.searchParams;
    const refresh = searchParams.get('refresh') === 'true';

    try {
        const plan = await getUserPlan(userId, refresh);

        // AI Messages: sum across all guilds for today
        let aiCurrent = 0;
        try {
            const aiResult = await query<{ total: string }>(
                `SELECT COALESCE(SUM(count), 0) as total FROM ai_usage WHERE user_id = $1 AND date = CURRENT_DATE`,
                [userId]
            );
            aiCurrent = parseInt(aiResult.rows[0]?.total || '0', 10);
        } catch { }

        // Server Builds: current month
        let serverGenCurrent = 0;
        try {
            const date = new Date();
            const monthYear = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            const sgResult = await query<{ count: number }>(
                `SELECT count FROM server_generation_usage WHERE user_id = $1 AND month_year = $2`,
                [userId, monthYear]
            );
            serverGenCurrent = sgResult.rows[0]?.count || 0;
        } catch { }

        const aiLimit = AI_LIMITS[plan];
        const serverGenLimit = SERVER_GEN_LIMITS[plan];
        const limits = PLAN_LIMITS[plan];

        return NextResponse.json({
            plan,
            aiMessages: {
                current: aiCurrent,
                limit: aiLimit,
                period: 'day'
            },
            serverBuilds: {
                current: serverGenCurrent,
                limit: serverGenLimit,
                period: 'month'
            },
            features: {
                welcome_custom: limits.welcome_custom,
                private_calls: limits.private_calls,
                whitelabel: limits.whitelabel,
                transcription: limits.transcription,
                automod_level: limits.automod_level,
                ticket_categories: limits.ticket_categories,
            }
        });
    } catch (error) {
        console.error("Error fetching usage:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
