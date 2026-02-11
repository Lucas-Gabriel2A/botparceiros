'use client';

import { useState, useEffect } from 'react';
import { BarChart3, Users, MessageSquare, Shield, Ticket, Bot, TrendingUp, Calendar } from 'lucide-react';
import { usePlan, PlanGate } from '@/components/PlanGate';

interface AnalyticsData {
    daily: Array<{
        date: string;
        messages_count: number;
        members_joined: number;
        members_left: number;
        tickets_opened: number;
        tickets_closed: number;
        automod_actions: number;
        commands_used: number;
        ai_responses: number;
    }>;
    summary: {
        messages_count: number;
        members_joined: number;
        members_left: number;
        tickets_opened: number;
        tickets_closed: number;
        automod_actions: number;
        commands_used: number;
        ai_responses: number;
    } | null;
    period: number;
}

interface Props {
    params: Promise<{ guildId: string }>;
}

export default function AnalyticsPage({ params }: Props) {
    const { plan } = usePlan();
    const [guildId, setGuildId] = useState('');
    const [data, setData] = useState<AnalyticsData | null>(null);
    const [period, setPeriod] = useState(7);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        params.then(p => setGuildId(p.guildId));
    }, [params]);

    useEffect(() => {
        if (!guildId) return;
        setLoading(true);
        fetch(`/api/guild/${guildId}/analytics?period=${period}`)
            .then(r => r.json())
            .then(d => { setData(d); setLoading(false); })
            .catch(() => setLoading(false));
    }, [guildId, period]);

    const summary = data?.summary;

    const stats = [
        { label: 'Mensagens', value: summary?.messages_count || 0, icon: MessageSquare, color: 'emerald' },
        { label: 'Membros (+)', value: summary?.members_joined || 0, icon: Users, color: 'blue' },
        { label: 'Membros (-)', value: summary?.members_left || 0, icon: Users, color: 'red' },
        { label: 'Tickets Abertos', value: summary?.tickets_opened || 0, icon: Ticket, color: 'purple' },
        { label: 'Tickets Fechados', value: summary?.tickets_closed || 0, icon: Ticket, color: 'violet' },
        { label: 'AutoMod Ações', value: summary?.automod_actions || 0, icon: Shield, color: 'orange' },
        { label: 'Comandos Usados', value: summary?.commands_used || 0, icon: BarChart3, color: 'cyan' },
        { label: 'Respostas IA', value: summary?.ai_responses || 0, icon: Bot, color: 'pink' },
    ];

    const colorMap: Record<string, string> = {
        emerald: 'from-emerald-500/20 to-emerald-500/5 border-emerald-500/30 text-emerald-400',
        blue: 'from-blue-500/20 to-blue-500/5 border-blue-500/30 text-blue-400',
        red: 'from-red-500/20 to-red-500/5 border-red-500/30 text-red-400',
        purple: 'from-purple-500/20 to-purple-500/5 border-purple-500/30 text-purple-400',
        violet: 'from-violet-500/20 to-violet-500/5 border-violet-500/30 text-violet-400',
        orange: 'from-orange-500/20 to-orange-500/5 border-orange-500/30 text-orange-400',
        cyan: 'from-cyan-500/20 to-cyan-500/5 border-cyan-500/30 text-cyan-400',
        pink: 'from-pink-500/20 to-pink-500/5 border-pink-500/30 text-pink-400',
    };

    // Find max message count for bar chart scaling
    const maxMessages = Math.max(...(data?.daily?.map(d => d.messages_count) || [1]), 1);

    return (
        <div className="space-y-8 flex flex-col items-center w-full max-w-7xl mx-auto px-4">
            <header className="text-center mb-8 w-full">
                <div className="inline-block px-3 py-1 border border-cyan-500/30 bg-cyan-500/10 rounded text-[10px] tracking-widest uppercase text-cyan-300 mb-4 font-medium">
                    Plano Ultimate
                </div>
                <h1 className="text-4xl md:text-5xl font-serif font-medium text-white mb-4">
                    📊 Analytics
                </h1>
                <p className="text-zinc-400 text-lg max-w-2xl mx-auto">
                    Métricas detalhadas do seu servidor.
                </p>
            </header>

            <PlanGate feature="analytics" plan={plan}>
                {/* Period Selector */}
                <div className="flex gap-2 bg-white/5 rounded-xl p-1 border border-white/10">
                    {[7, 14, 30, 90].map(p => (
                        <button
                            key={p}
                            onClick={() => setPeriod(p)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${period === p
                                ? 'bg-white/10 text-white border border-white/20'
                                : 'text-zinc-400 hover:text-white'
                                }`}
                        >
                            <Calendar className="w-3 h-3 inline mr-1" />
                            {p}d
                        </button>
                    ))}
                </div>

                {loading ? (
                    <div className="flex items-center gap-2 text-zinc-400">
                        <div className="w-5 h-5 border-2 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin" />
                        Carregando analytics...
                    </div>
                ) : (
                    <>
                        {/* Stats Grid */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full">
                            {stats.map((stat, i) => {
                                const Icon = stat.icon;
                                return (
                                    <div
                                        key={i}
                                        className={`bg-linear-to-br ${colorMap[stat.color]} border rounded-2xl p-5 transition-all hover:scale-[1.02]`}
                                    >
                                        <div className="flex items-center gap-2 mb-3">
                                            <Icon className="w-4 h-4" />
                                            <span className="text-xs font-medium uppercase tracking-wider opacity-80">
                                                {stat.label}
                                            </span>
                                        </div>
                                        <p className="text-3xl font-bold text-white">
                                            {stat.value.toLocaleString('pt-BR')}
                                        </p>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Daily Messages Bar Chart */}
                        <div className="w-full bg-[#0A0A0C] border border-white/10 rounded-2xl p-6">
                            <div className="flex items-center gap-2 mb-6">
                                <TrendingUp className="w-5 h-5 text-emerald-400" />
                                <h3 className="text-lg font-medium text-white">Mensagens por Dia</h3>
                            </div>
                            <div className="flex items-end gap-1 h-40">
                                {data?.daily?.map((day, i) => {
                                    const height = Math.max((day.messages_count / maxMessages) * 100, 2);
                                    const date = new Date(day.date);
                                    return (
                                        <div key={i} className="flex-1 flex flex-col items-center gap-1 group relative">
                                            <div className="absolute -top-8 bg-black/80 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                                                {day.messages_count} msgs — {date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                                            </div>
                                            <div
                                                className="w-full bg-emerald-500/60 hover:bg-emerald-400/80 rounded-t transition-all cursor-pointer"
                                                style={{ height: `${height}%` }}
                                            />
                                            <span className="text-[9px] text-zinc-500">
                                                {date.getDate()}
                                            </span>
                                        </div>
                                    );
                                })}
                                {(!data?.daily || data.daily.length === 0) && (
                                    <div className="flex-1 flex items-center justify-center text-zinc-500 text-sm">
                                        Sem dados no período selecionado
                                    </div>
                                )}
                            </div>
                        </div>
                    </>
                )}
            </PlanGate>
        </div>
    );
}
