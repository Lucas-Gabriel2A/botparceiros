import { database } from "@shared/services/database";
import { AutoModForm } from "@/components/forms/AutoModForm";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";

interface Props {
    params: Promise<{
        guildId: string;
    }>;
}

export default async function AutoModPage({ params }: Props) {
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

    return (
        <div className="space-y-8 flex flex-col items-center w-full max-w-7xl mx-auto px-4">
            <header className="text-center mb-8 w-full">
                <div className="inline-block px-3 py-1 border border-red-500/30 bg-red-500/10 rounded text-[10px] tracking-widest uppercase text-red-300 mb-4 font-medium">
                    Módulo de Segurança
                </div>
                <h1 className="text-4xl md:text-5xl font-serif font-medium text-white mb-4">
                    AutoModeração
                </h1>
                <p className="text-zinc-400 text-lg max-w-2xl mx-auto">
                    Proteja seu servidor contra spam e links maliciosos.
                </p>
            </header>

            <AutoModForm config={config} guildId={guildId} user={session?.user} />
        </div>
    );
}
