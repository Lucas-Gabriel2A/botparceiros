"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Server, CreditCard, Settings, LogOut, LayoutDashboard } from "lucide-react";
import { useTranslations, useLocale } from "next-intl";
import { signOut } from "next-auth/react";
import Image from "next/image";

export function Sidebar() {
    const t = useTranslations("dashboard.sidebar");
    const locale = useLocale();
    const pathname = usePathname();

    const menu = [
        { name: t("servers"), icon: LayoutDashboard, href: `/${locale}/dashboard` },
        // { name: t("billing"), icon: CreditCard, href: `/${locale}/dashboard/billing` },
        // { name: t("settings"), icon: Settings, href: `/${locale}/dashboard/settings` },
    ];

    return (
        <aside className="w-72 border-r border-white/5 bg-[#060609] flex flex-col">
             <div className="p-6 border-b border-white/5 flex items-center gap-3">
                 <div className="relative w-8 h-8">
                     <Image src="/CoreBot.png" alt="Logo" fill className="object-contain" />
                 </div>
                 <span className="font-serif text-lg font-bold tracking-tight">CoreBot's</span>
             </div>
             
             <nav className="flex-1 p-6 space-y-2">
                 <div className="text-xs font-bold text-zinc-600 uppercase tracking-widest mb-4 px-2">Menu</div>
                 {menu.map((item) => {
                     // Simple active check
                     const isActive = pathname === item.href;
                     return (
                         <Link 
                            key={item.href} 
                            href={item.href} 
                            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                                isActive 
                                ? 'bg-white text-black shadow-lg shadow-white/5' 
                                : 'text-zinc-400 hover:bg-white/5 hover:text-white'
                            }`}
                         >
                             <item.icon className={`w-5 h-5 ${isActive ? 'text-black' : 'text-zinc-500'}`} />
                             {item.name}
                         </Link>
                     )
                 })}
             </nav>

             <div className="p-6 border-t border-white/5">
                 <button 
                    onClick={() => signOut({ callbackUrl: '/' })} 
                    className="flex items-center gap-3 px-4 py-3 w-full rounded-xl text-sm font-medium text-zinc-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                 >
                     <LogOut className="w-5 h-5" />
                     {t("logout")}
                 </button>
             </div>
        </aside>
    )
}
