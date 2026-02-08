import { getCurrentUser } from '@/lib/auth-service';
import { getGuildConfig } from '@shared/services/database';
import { PrivateCallsForm } from '@/components/forms/PrivateCallsForm';
import { redirect } from 'next/navigation';

interface PageProps {
    params: Promise<{
        guildId: string;
    }>;
}

export default async function PrivateCallsPage({ params }: PageProps) {
    const { guildId } = await params;
    const user = await getCurrentUser();

    if (!user) {
        redirect('/');
    }

    const config = await getGuildConfig(guildId);

    return (
        <div className="w-full max-w-7xl mx-auto p-6 md:p-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <PrivateCallsForm config={config} guildId={guildId} />
        </div>
    );
}
