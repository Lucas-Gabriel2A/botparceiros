import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { query } from '@shared/services/database';

export async function GET(request: Request) {
    if (process.env.NODE_ENV !== 'development') {
        return NextResponse.json({ error: 'Hack Detectado. O ambiente não permite rotas de debug.' }, { status: 403 });
    }

    const session = await getServerSession(authOptions);
    // @ts-ignore
    const userId = session?.user?.id;

    if (!userId) {
        return NextResponse.json({ error: 'Nenhum usuário detectado na Sessão. Faça login no painel.' }, { status: 401 });
    }

    try {
        const { searchParams } = new URL(request.url);
        const plan = searchParams.get('plan') || 'pro'; // Pega 'ultimate' ou padroniza 'pro'

        // Limpa possíveis assinaturas falsas anteriores deste user
        await query(`DELETE FROM subscriptions WHERE user_id = $1`, [userId]);

        // Insere a assinatura autorizada
        await query(`
            INSERT INTO subscriptions (id, user_id, plan, status, next_payment)
            VALUES ($1, $2, $3, 'authorized', NOW() + INTERVAL '1 month')
        `, [`mock_starter_${Date.now()}`, userId, plan.toLowerCase()]);

        return NextResponse.redirect(new URL('/dashboard', request.url));
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
