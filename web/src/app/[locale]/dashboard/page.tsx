"use client";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { Settings, ShieldAlert } from "lucide-react";

interface Guild {
    id: string;
    name: string;
    icon: string;
    permissions: string;
}

export default function DashboardPage() {
    const t = useTranslations("dashboard");
    const [guilds, setGuilds] = useState<Guild[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    useEffect(() => {
        fetch("/api/user/guilds")
            .then((res) => {
                if (!res.ok) throw new Error();
                return res.json();
            })
            .then((data) => {
                setGuilds(data);
                setLoading(false);
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
        <div>
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
                    {guilds.map((guild) => (
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
                                     <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold bg-white/5 px-2 py-1 rounded">{t("guild_card.owner")}</span>
                                 </div>
                             </div>
                             
                             <div className="flex gap-3">
                                 <button className="flex-1 py-3 bg-white text-black text-xs font-bold uppercase tracking-wider rounded-xl hover:bg-zinc-200 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-white/5">
                                     <Settings className="w-4 h-4" />
                                     {t("guild_card.manage")}
                                 </button>
                             </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
