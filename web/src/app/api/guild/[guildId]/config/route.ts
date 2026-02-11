import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from "@/lib/auth-options";
import { database } from '@shared/services/database';

// Mapa de campos → plano mínimo necessário
const PREMIUM_FIELDS: Record<string, string> = {
    automod_ai_enabled: 'pro',
    whitelabel_name: 'ultimate',
    whitelabel_avatar_url: 'ultimate',
};

const PLAN_HIERARCHY: Record<string, number> = {
    free: 0,
    starter: 1,
    pro: 2,
    ultimate: 3,
};

export async function GET(
    request: Request,
    { params }: { params: { guildId: string } }
) {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { guildId } = params;

    try {
        const config = await database.getGuildConfig(guildId);
        return NextResponse.json(config || {});
    } catch (error) {
        console.error('Erro ao buscar config:', error);
        return NextResponse.json({ error: 'Erro ao buscar config' }, { status: 500 });
    }
}

export async function PATCH(
    request: Request,
    { params }: { params: { guildId: string } }
) {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { guildId } = params;
    const userId = (session.user as any).id;

    try {
        const body = await request.json();

        // 🔒 Validar plano do usuário para campos premium
        const sub = await database.getSubscriptionByUser(userId);
        const userPlan = sub?.status === 'authorized' ? sub.plan : 'free';
        const userLevel = PLAN_HIERARCHY[userPlan] || 0;

        const blockedFields: string[] = [];
        for (const [field, requiredPlan] of Object.entries(PREMIUM_FIELDS)) {
            if (field in body && body[field]) {
                const requiredLevel = PLAN_HIERARCHY[requiredPlan] || 0;
                if (userLevel < requiredLevel) {
                    blockedFields.push(field);
                    delete body[field]; // Remove campo que o plano não permite
                }
            }
        }

        if (Object.keys(body).length === 0) {
            return NextResponse.json(
                { error: `Seu plano (${userPlan}) não permite essa configuração. Faça upgrade!`, blockedFields },
                { status: 403 }
            );
        }

        await database.upsertGuildConfig(guildId, body);

        if (blockedFields.length > 0) {
            return NextResponse.json({
                success: true,
                warning: `Alguns campos foram ignorados (plano insuficiente): ${blockedFields.join(', ')}`
            });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Erro ao atualizar config:', error);
        return NextResponse.json({ error: 'Erro ao atualizar config' }, { status: 500 });
    }
}
