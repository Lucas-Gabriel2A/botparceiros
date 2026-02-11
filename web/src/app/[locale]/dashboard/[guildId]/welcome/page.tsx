
import { database } from "@shared/services/database";
import { WelcomeForm } from "@/components/forms/WelcomeForm";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";

interface Props {
    params: Promise<{
        guildId: string;
    }>;
}

export default async function WelcomePage({ params }: Props) {
    const { guildId } = await params;

    let config = await database.getGuildConfig(guildId);
    const session = await getServerSession(authOptions);

    // Default config object if null
    if (!config) {
        config = {
            guild_id: guildId,
            welcome_message: "Bem-vindo ao servidor {user}!",
            leave_message: "{user} saiu do servidor.",
            autorole_id: null,
            automod_links_enabled: false,
            automod_caps_enabled: false,
            automod_spam_enabled: false,
            // Mock other required fields
            ia_enabled: false,
            ia_channel_id: null,
            ia_system_prompt: null,
            ia_voice_enabled: false,
            automod_channel: null,
            prohibited_words: [],
            vip_category_id: null,
            vip_role_id: null,
            welcome_channel_id: null,
            leave_channel_id: null,
            logs_channel_id: null,
            staff_role_id: null,
            updated_at: new Date()
        };
    }

    // Fetch user plan
    // @ts-ignore
    const userId = session?.user?.id;
    let plan = 'free';

    if (userId) {
        const sub = await database.getSubscriptionByUser(userId);
        if (sub?.status === 'authorized') {
            plan = sub.plan;
        }
    }

    return (
        <div className="space-y-8 flex flex-col items-center w-full max-w-7xl mx-auto px-4">
            <header className="text-center mb-8 w-full">
                <div className="inline-block px-3 py-1 border border-blue-500/30 bg-blue-500/10 rounded text-[10px] tracking-widest uppercase text-blue-300 mb-4 font-medium">
                    Módulo de Engajamento
                </div>
                <h1 className="text-4xl md:text-5xl font-serif font-medium text-white mb-4">
                    Boas-vindas
                </h1>
                <p className="text-zinc-400 text-lg max-w-2xl mx-auto">
                    Personalize a experiência de entrada e saída dos membros.
                </p>
            </header>

            <WelcomeForm config={config} guildId={guildId} user={session?.user} plan={plan} />
        </div>
    );
}
