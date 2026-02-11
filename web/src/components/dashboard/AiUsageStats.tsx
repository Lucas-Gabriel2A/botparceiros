"use client";

import { useEffect, useState } from "react";
import { Zap, Server, Loader2, Crown, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface UsageData {
    current: number;
    limit: number;
    plan: string;
    allowed: boolean;
}

interface AiUsageResponse {
    messages: UsageData;
    serverGen: UsageData;
}

export function AiUsageStats({ guildId }: { guildId: string }) {
    const [data, setData] = useState<AiUsageResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    useEffect(() => {
        fetch(`/api/guild/${guildId}/ai-usage`)
            .then((res) => {
                if (!res.ok) throw new Error("Falha ao carregar");
                return res.json();
            })
            .then((data) => setData(data))
            .catch(() => setError(true))
            .finally(() => setLoading(false));
    }, [guildId]);

    if (loading) {
        return (
            <div className="w-full h-32 flex items-center justify-center bg-[#0A0A0C] border border-white/5 rounded-3xl animate-pulse">
                <Loader2 className="w-6 h-6 text-zinc-600 animate-spin" />
            </div>
        );
    }

    if (error || !data) return null;

    const getPercentage = (current: number, limit: number) => {
        if (limit === -1) return 0; // Unlimited
        if (limit === 0) return 100;
        return Math.min(100, Math.round((current / limit) * 100));
    };

    const isUnlimited = (limit: number) => limit === -1;

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 w-full max-w-3xl">
            {/* Mensagens Diárias */}
            <div className={`p-6 rounded-3xl border relative overflow-hidden flex flex-col justify-between ${isUnlimited(data.messages.limit)
                    ? 'bg-linear-to-br from-purple-500/10 to-[#0A0A0C] border-purple-500/30'
                    : 'bg-[#0A0A0C] border-white/5'
                }`}>
                <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-xl ${isUnlimited(data.messages.limit) ? 'bg-purple-500/20 text-purple-400' : 'bg-white/5 text-zinc-400'}`}>
                            {isUnlimited(data.messages.limit) ? <Crown className="w-5 h-5" /> : <Zap className="w-5 h-5" />}
                        </div>
                        <div>
                            <h3 className="text-white font-medium">Mensagens Diárias</h3>
                            <p className="text-xs text-zinc-500">Uso pessoal no servidor</p>
                        </div>
                    </div>
                    {isUnlimited(data.messages.limit) && (
                        <span className="px-2 py-1 rounded-md bg-purple-500/20 text-purple-300 text-[10px] font-bold uppercase tracking-wider">
                            Ilimitado
                        </span>
                    )}
                </div>

                {!isUnlimited(data.messages.limit) && (
                    <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                            <span className="text-zinc-300 font-medium">{data.messages.current} <span className="text-zinc-500">/ {data.messages.limit}</span></span>
                            <span className={`${data.messages.current >= data.messages.limit ? 'text-red-400' : 'text-zinc-500'}`}>
                                {getPercentage(data.messages.current, data.messages.limit)}%
                            </span>
                        </div>
                        <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                            <div
                                className={`h-full rounded-full transition-all duration-500 ${data.messages.current >= data.messages.limit ? 'bg-red-500' : 'bg-purple-500'
                                    }`}
                                style={{ width: `${getPercentage(data.messages.current, data.messages.limit)}%` }}
                            />
                        </div>
                    </div>
                )}

                {isUnlimited(data.messages.limit) && (
                    <div className="text-sm text-purple-200/70 mt-2">
                        Você pode conversar à vontade!
                    </div>
                )}
            </div>

            {/* Criação de Servidores */}
            <div className={`p-6 rounded-3xl border relative overflow-hidden flex flex-col justify-between ${isUnlimited(data.serverGen.limit)
                    ? 'bg-linear-to-br from-amber-500/10 to-[#0A0A0C] border-amber-500/30'
                    : 'bg-[#0A0A0C] border-white/5'
                }`}>
                <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-xl ${isUnlimited(data.serverGen.limit) ? 'bg-amber-500/20 text-amber-400' : 'bg-white/5 text-zinc-400'}`}>
                            {isUnlimited(data.serverGen.limit) ? <Crown className="w-5 h-5" /> : <Server className="w-5 h-5" />}
                        </div>
                        <div>
                            <h3 className="text-white font-medium">Server Builder</h3>
                            <p className="text-xs text-zinc-500">Gerações mensais</p>
                        </div>
                    </div>
                    {isUnlimited(data.serverGen.limit) && (
                        <span className="px-2 py-1 rounded-md bg-amber-500/20 text-amber-300 text-[10px] font-bold uppercase tracking-wider">
                            Ilimitado
                        </span>
                    )}
                </div>

                {!isUnlimited(data.serverGen.limit) && (
                    <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                            <span className="text-zinc-300 font-medium">{data.serverGen.current} <span className="text-zinc-500">/ {data.serverGen.limit}</span></span>
                            <span className={`${data.serverGen.current >= data.serverGen.limit ? 'text-red-400' : 'text-zinc-500'}`}>
                                {getPercentage(data.serverGen.current, data.serverGen.limit)}%
                            </span>
                        </div>
                        <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                            <div
                                className={`h-full rounded-full transition-all duration-500 ${data.serverGen.current >= data.serverGen.limit ? 'bg-red-500' : 'bg-amber-500'
                                    }`}
                                style={{ width: `${getPercentage(data.serverGen.current, data.serverGen.limit)}%` }}
                            />
                        </div>
                    </div>
                )}

                {isUnlimited(data.serverGen.limit) && (
                    <div className="text-sm text-amber-200/70 mt-2">
                        Crie servidores sem limites!
                    </div>
                )}
            </div>

            {/* Upsell if needed */}
            {(!isUnlimited(data.messages.limit) || !isUnlimited(data.serverGen.limit)) && (
                <div className="col-span-1 md:col-span-2 flex items-center justify-between p-4 rounded-2xl bg-linear-to-r from-purple-500/10 to-amber-500/10 border border-white/10">
                    <div className="flex items-center gap-3">
                        <AlertTriangle className="w-5 h-5 text-yellow-400" />
                        <p className="text-sm text-zinc-300">
                            Aumente seus limites fazendo upgrade do servidor.
                        </p>
                    </div>
                    <Link href="/dashboard/billing">
                        <Button size="sm" variant="outline" className="bg-transparent border-white/20 text-white hover:bg-white/5 hover:text-white">
                            Ver Planos
                        </Button>
                    </Link>
                </div>
            )}
        </div>
    );
}
