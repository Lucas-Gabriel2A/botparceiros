import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from "@/lib/auth-options";
import { getAnalytics, getAnalyticsSummary } from '@shared/services/analytics.service';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ guildId: string }> }
) {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const resolvedParams = await params;
    const { guildId } = resolvedParams;
    const { searchParams } = new URL(request.url);
    const period = parseInt(searchParams.get('period') || '7');

    try {
        const [daily, summary] = await Promise.all([
            getAnalytics(guildId, period),
            getAnalyticsSummary(guildId, period)
        ]);

        return NextResponse.json({ daily, summary, period });
    } catch (error) {
        console.error('Erro ao buscar analytics:', error);
        return NextResponse.json({ error: 'Erro ao buscar analytics' }, { status: 500 });
    }
}
