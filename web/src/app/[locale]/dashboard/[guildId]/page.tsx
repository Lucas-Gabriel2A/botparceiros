import { database } from "@shared/services/database";
import { Bot, ShieldAlert, Ticket, Hand, Phone, ArrowRight, Settings, Activity } from "lucide-react";
import Link from "next/link";

interface Props {
    params: Promise<{
        guildId: string;
        locale: string;
    }>;
}

export default async function ServerOverviewPage({ params }: Props) {
    const { guildId, locale } = await params;

    // Buscar dados do banco em paralelo
    const [config, ticketCategories, privateCalls] = await Promise.all([
        database.getGuildConfig(guildId),
        database.getTicketCategories(guildId),
        database.getAllPrivateCalls(guildId)
    ]);

    // Helpers para status
    const getStatusColor = (isActive: boolean) => isActive ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-zinc-800 text-zinc-400 border-white/5";
    const getStatusText = (isActive: boolean) => isActive ? "ATIVO" : "INATIVO";

    const modules = [
        {
            title: "CoreBot AI",
            icon: Bot,
            href: `/${locale}/dashboard/${guildId}/corebot`,
            isActive: !!config?.ia_enabled,
            stats: [
                { label: "Canal", value: config?.ia_channel_id ? `<#${config.ia_channel_id}>` : "Não definido" },
                { label: "Ignorados", value: `${(config?.ia_ignored_channels?.length || 0) + (config?.ia_ignored_roles?.length || 0)}` }
            ]
        },
        {
            title: "AutoMod",
            icon: ShieldAlert,
            href: `/${locale}/dashboard/${guildId}/automod`,
            isActive: (config?.prohibited_words?.length || 0) > 0 || !!config?.automod_links_enabled || !!config?.automod_caps_enabled || !!config?.automod_spam_enabled || !!config?.automod_ai_enabled,
            stats: [
                { label: "Palavras", value: config?.prohibited_words?.length || 0 },
                { label: "Ação", value: config?.automod_action?.toUpperCase() || "DELETE" }
            ]
        },
        {
            title: "Tickets",
            icon: Ticket,
            href: `/${locale}/dashboard/${guildId}/tickets`,
            isActive: !!config?.ticket_panel_title, // Considera ativo se tiver título configurado (ou poderia checar categorias)
            stats: [
                { label: "Categorias", value: ticketCategories.length },
                { label: "Painel", value: config?.ticket_panel_title ? "Configurado" : "Pendente" }
            ]
        },
        {
            title: "Boas-vindas",
            icon: Hand,
            href: `/${locale}/dashboard/${guildId}/welcome`,
            isActive: !!config?.welcome_channel_id,
            stats: [
                { label: "Canal", value: config?.welcome_channel_id ? `<#${config.welcome_channel_id}>` : "Não definido" },
                { label: "Autorole", value: config?.autorole_id ? "Sim" : "Não" }
            ]
        },
        {
            title: "Calls Privadas",
            icon: Phone,
            href: `/${locale}/dashboard/${guildId}/private-calls`,
            isActive: !!config?.private_calls_enabled,
            stats: [
                { label: "Categoria", value: config?.private_calls_category_id ? "Definida" : "Pendente" },
                { label: "Canais Ativos", value: privateCalls.length }
            ]
        }
    ];

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <header className="flex justify-between items-end">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-2">
                        <Activity className="w-8 h-8 text-purple-500" />
                        Visão Geral
                    </h1>
                    <p className="text-zinc-400">
                        Resumo em tempo real dos módulos do seu servidor.
                    </p>
                </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {modules.map((module) => (
                    <Link
                        key={module.title}
                        href={module.href}
                        className="group relative flex flex-col p-6 rounded-2xl bg-[#0A0A0C] border border-white/5 hover:border-purple-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-purple-500/10 hover:-translate-y-1"
                    >
                        <div className="absolute inset-0 bg-linear-to-br from-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl" />

                        <div className="relative z-10">
                            <div className="flex justify-between items-start mb-6">
                                <div className={`p-3 rounded-xl bg-zinc-900 border border-white/5 group-hover:bg-purple-500/20 group-hover:text-purple-400 transition-colors`}>
                                    <module.icon size={24} />
                                </div>
                                <div className={`px-3 py-1 rounded-full text-xs font-bold border ${getStatusColor(module.isActive)}`}>
                                    {getStatusText(module.isActive)}
                                </div>
                            </div>

                            <h3 className="font-bold text-xl text-white mb-4 group-hover:text-purple-400 transition-colors">
                                {module.title}
                            </h3>

                            <div className="grid grid-cols-2 gap-4 mb-6">
                                {module.stats.map((stat, i) => (
                                    <div key={i} className="bg-zinc-900/50 p-3 rounded-lg border border-white/5">
                                        <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">{stat.label}</p>
                                        <p className="font-mono text-sm text-zinc-300 truncate" title={String(stat.value)}>
                                            {stat.value}
                                        </p>
                                    </div>
                                ))}
                            </div>

                            <div className="flex items-center text-sm text-zinc-500 group-hover:text-white transition-colors mt-auto pt-4 border-t border-white/5">
                                <span>Configurar</span>
                                <ArrowRight size={16} className="ml-2 group-hover:translate-x-1 transition-transform" />
                            </div>
                        </div>
                    </Link>
                ))}
            </div>
        </div>
    );
}
