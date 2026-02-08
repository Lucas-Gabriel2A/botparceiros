import { database } from "@shared/services/database";
import { CoreBotForm } from "@/components/forms/CoreBotForm";

interface Props {
    params: Promise<{
        guildId: string;
    }>;
}

export default async function CoreBotPage({ params }: Props) {
    const { guildId } = await params;

    // Ensure config exists or get default
    let config = await database.getGuildConfig(guildId);

    // If no config found, pass default empty object to avoid errors, 
    // or database.getGuildConfig should handle creating/returning default
    if (!config) {
        config = {
            guild_id: guildId,
            ia_enabled: true,
            ia_channel_id: null,
            ia_system_prompt: null,
            ia_voice_enabled: true,
            // Required fields mock
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
                <div className="inline-block px-3 py-1 border border-purple-500/30 bg-purple-500/10 rounded text-[10px] tracking-widest uppercase text-purple-300 mb-4 font-medium">
                    CoreBot Module
                </div>
                <h1 className="text-3xl md:text-5xl font-serif font-medium text-white mb-4">
                    Configuração da IA
                </h1>
                <p className="text-zinc-500 max-w-xl mx-auto text-lg leading-relaxed">
                    Personalize a identidade e o comportamento do seu assistente virtual.
                </p>
            </header>

            <CoreBotForm config={config} guildId={guildId} />
        </div>
    );
}
