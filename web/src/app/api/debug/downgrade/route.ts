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
        // Limpa possíveis assinaturas falsas anteriores deste user (Dá downgrade pra free)
        await query(`DELETE FROM subscriptions WHERE user_id = $1`, [userId]);

        return NextResponse.redirect(new URL('/dashboard', request.url));
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
