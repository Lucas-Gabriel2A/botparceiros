"use client";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import Image from "next/image";
import { Settings, ShieldAlert, Plus, ExternalLink } from "lucide-react";

interface Guild {
    id: string;
    name: string;
    icon: string;
    permissions: string;
}

const BOT_CLIENT_ID = process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID || "1468000179339919455";

function getBotInviteUrl(guildId: string) {
    return `https://discord.com/oauth2/authorize?client_id=${BOT_CLIENT_ID}&permissions=8&scope=bot%20applications.commands&guild_id=${guildId}&disable_guild_select=true`;
}

export default function DashboardPage() {
    const t = useTranslations("dashboard");
    const [guilds, setGuilds] = useState<Guild[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [botStatus, setBotStatus] = useState<Record<string, boolean>>({});

    useEffect(() => {
        fetch("/api/user/guilds")
            .then((res) => {
                if (!res.ok) throw new Error();
                return res.json();
            })
            .then(async (data) => {
                setGuilds(data);
                setLoading(false);

                // Buscar status do bot para cada servidor
                if (data.length > 0) {
                    try {
                        const statusRes = await fetch("/api/user/guilds/bot-status", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ guildIds: data.map((g: Guild) => g.id) })
                        });
                        if (statusRes.ok) {
                            const statusData = await statusRes.json();
                            setBotStatus(statusData);
                        }
                    } catch (e) {
                        console.error("Failed to fetch bot status:", e);
                    }
                }
            })
            .catch(() => {
                setError(true);
                setLoading(false);
            });
    }, []);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-64 text-zinc-500 animate-pulse">
                <div className="w-8 h-8 rounded-full border-2 border-zinc-700 border-t-white animate-spin mb-4"></div>
                {t("loading")}
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center h-64 text-red-400">
                <ShieldAlert className="w-12 h-12 mb-4 opacity-50" />
                {t("error")}
            </div>
        );
    }

    return (
        <div className="h-full overflow-y-auto p-8 md:p-12 max-w-7xl mx-auto">
            <header className="mb-12">
                <h1 className="text-3xl font-serif font-medium mb-2">{t("title")}</h1>
                <p className="text-zinc-500">{t("subtitle")}</p>
            </header>

            {guilds.length === 0 ? (
                <div className="text-center py-20 bg-white/5 rounded-2xl border border-white/5">
                    <p className="text-zinc-500">{t("empty")}</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {guilds.map((guild) => {
                        const hasBot = botStatus[guild.id] === true;

                        return (
                            <div key={guild.id} className="bg-[#0A0A0C] border border-white/5 rounded-2xl p-6 hover:border-white/10 transition-all group">
                                <div className="flex items-center gap-4 mb-6">
                                    {guild.icon ? (
                                        <div className="relative w-16 h-16">
                                            <Image
                                                src={`https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png`}
                                                alt={guild.name}
                                                fill
                                                className="rounded-xl object-cover"
                                            />
                                        </div>
                                    ) : (
                                        <div className="w-16 h-16 bg-white/5 rounded-xl flex items-center justify-center text-xl font-bold text-zinc-500">
                                            {guild.name.substring(0, 1)}
                                        </div>
                                    )}
                                    <div>
                                        <h3 className="font-bold text-white group-hover:text-primary transition-colors truncate max-w-[150px]">{guild.name}</h3>
                                        <span className={`text-[10px] uppercase tracking-wider font-bold px-2 py-1 rounded ${hasBot ? 'text-emerald-400 bg-emerald-500/10' : 'text-zinc-500 bg-white/5'}`}>
                                            {hasBot ? "Bot Ativo" : "Sem Bot"}
                                        </span>
                                    </div>
                                </div>

                                <div className="flex gap-3">
                                    {hasBot ? (
                                        <Link
                                            href={`/dashboard/${guild.id}`}
                                            className="flex-1 py-3 bg-white text-black text-xs font-bold uppercase tracking-wider rounded-xl hover:bg-zinc-200 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-white/5"
                                        >
                                            <Settings className="w-4 h-4" />
                                            {t("guild_card.manage")}
                                        </Link>
                                    ) : (
                                        <a
                                            href={getBotInviteUrl(guild.id)}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex-1 py-3 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-colors flex items-center justify-center gap-2 shadow-lg shadow-purple-500/20"
                                        >
                                            <Plus className="w-4 h-4" />
                                            Adicionar Bot
                                            <ExternalLink className="w-3 h-3 opacity-60" />
                                        </a>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
