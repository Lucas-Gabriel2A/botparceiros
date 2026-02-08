
import { CommandGenerator } from '@/components/forms/CommandGenerator';
import { getCustomCommands } from '@shared/services/database';
import { getCurrentUser } from '@/lib/auth-service';
import { redirect } from 'next/navigation';

interface PageProps {
    params: {
        guildId: string;
        locale: string;
    }
}

export default async function CommandsPage({ params }: PageProps) {
    const { guildId } = await params;
    const user = await getCurrentUser();

    if (!user) {
        redirect('/api/auth/signin');
    }

    const commands = await getCustomCommands(guildId);

    return (
        <div className="max-w-6xl mx-auto py-8 px-4">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-white mb-2">Comandos Personalizados</h1>
                <p className="text-zinc-400">
                    Crie comandos exclusivos para seu servidor usando Inteligência Artificial.
                </p>
            </div>

            <CommandGenerator
                guildId={guildId}
                userId={user.id}
                existingCommands={commands}
            />
        </div>
    );
}
