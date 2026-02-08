import { database } from "@shared/services/database";

interface Props {
    params: Promise<{
        guildId: string;
    }>;
}

export default async function ServerOverviewPage({ params }: Props) {
    const { guildId } = await params;

    // Buscar configurações atuais do banco
    const config = await database.getGuildConfig(guildId);

    return (
        <div className="space-y-6">
            <header>
                <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-zinc-500">
                    Visão Geral
                </h1>
                <p className="text-zinc-400 mt-2">
                    Resumo do status e configurações do bot neste servidor.
                </p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">

                {/* Card: Status CoreBot AI */}
                <div className="p-6 rounded-xl bg-zinc-900 border border-white/5 hover:border-purple-500/50 transition-colors">
                    <div className="flex justify-between items-start mb-4">
                        <h3 className="font-bold text-lg">CoreBot AI</h3>
                        <div className={`px-2 py-1 rounded text-xs font-bold ${config?.ia_enabled ? 'bg-purple-500/20 text-purple-400' : 'bg-red-500/20 text-red-400'}`}>
                            {config?.ia_enabled ? 'ATIVO' : 'INATIVO'}
                        </div>
                    </div>
                    <p className="text-sm text-zinc-400">
                        {config?.ia_channel_id
                            ? 'Respondendo no canal configurado.'
                            : 'Nenhum canal selecionado.'}
                    </p>
                </div>

                {/* Card: AutoMod */}
                <div className="p-6 rounded-xl bg-zinc-900 border border-white/5 hover:border-blue-500/50 transition-colors">
                    <div className="flex justify-between items-start mb-4">
                        <h3 className="font-bold text-lg">AutoMod</h3>
                        <div className="px-2 py-1 rounded text-xs font-bold bg-zinc-800 text-zinc-400">
                            {config?.prohibited_words?.length || 0} PALAVRAS
                        </div>
                    </div>
                    <p className="text-sm text-zinc-400">
                        Monitorando chat em busca de palavras proibidas.
                    </p>
                </div>

                {/* Card: Tickets */}
                <div className="p-6 rounded-xl bg-zinc-900 border border-white/5 hover:border-green-500/50 transition-colors">
                    <div className="flex justify-between items-start mb-4">
                        <h3 className="font-bold text-lg">Tickets</h3>
                        <div className="px-2 py-1 rounded text-xs font-bold bg-zinc-800 text-zinc-400">
                            CONFIG
                        </div>
                    </div>
                    <p className="text-sm text-zinc-400">
                        Categoria VIP: {config?.vip_category_id ? 'Definida' : 'Não definida'}
                    </p>
                </div>

            </div>
        </div>
    );
}
