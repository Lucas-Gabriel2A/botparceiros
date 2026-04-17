import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from "@/lib/auth-options";
import { database } from '@shared/services/database';
import { verifyUserGuildAccess } from '@/lib/discord-api';

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
    { params }: { params: Promise<{ guildId: string }> } // Corrigido a tipagem do Next.js 15
) {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { guildId } = await params;

    // 🔒 Security/IDOR Check: Validar MANAGE_GUILD respectivo
    const hasAccess = await verifyUserGuildAccess(guildId);
    if (!hasAccess) {
        return NextResponse.json({ error: 'Acesso Negado: Você não gerencia esta guilda.' }, { status: 403 });
    }

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
    { params }: { params: Promise<{ guildId: string }> }
) {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { guildId } = await params;
    const userId = (session.user as any).id;

    // 🔒 Security/IDOR Check: Validar MANAGE_GUILD respectivo
    const hasAccess = await verifyUserGuildAccess(guildId);
    if (!hasAccess) {
        return NextResponse.json({ error: 'Acesso Negado: Você não gerencia esta guilda.' }, { status: 403 });
    }

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

        // 🤖 Bônus: Sincronizar o Nickname (Apelido) físico do Bot na lista de Membros do Servidor (se alterado)
        if ('whitelabel_name' in body) {
            try {
                // PATCH https://discord.com/api/v10/guilds/{guildId}/members/@me
                await fetch(`https://discord.com/api/v10/guilds/${guildId}/members/@me`, {
                    method: 'PATCH',
                    headers: {
                        'Authorization': `Bot ${process.env.DISCORD_BOT_TOKEN}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        nick: body.whitelabel_name || "" // Vazio remove o apelido (reseta pro padrão)
                    })
                });
            } catch (err) {
                console.error("Falha ao sincronizar nickname do whitelabel:", err);
            }
        }

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
