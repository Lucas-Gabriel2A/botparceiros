"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, CreditCard, Settings, LogOut } from "lucide-react";
import { useTranslations, useLocale } from "next-intl";
import { signOut } from "next-auth/react";
import Image from "next/image";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export function SidebarRail() {
    const t = useTranslations("dashboard.sidebar");
    const locale = useLocale();
    const pathname = usePathname();

    const menu = [
        { name: t("servers"), icon: LayoutDashboard, href: `/${locale}/dashboard` },
        { name: t("billing"), icon: CreditCard, href: `/${locale}/dashboard/billing` },
    ];

    return (
        <aside className="w-18 border-r border-white/5 bg-[#060609] flex flex-col items-center py-6 h-screen z-50">
            <Link href="/" className="relative w-10 h-10 mb-8 hover:opacity-80 transition-opacity">
                <Image src="/CoreBot.png" alt="Logo" fill className="object-contain" />
            </Link>

            <nav className="flex-1 flex flex-col gap-4 w-full px-2">
                <TooltipProvider delayDuration={0}>
                    {menu.map((item) => {
                        const isActive = pathname === item.href;
                        return (
                            <Tooltip key={item.href}>
                                <TooltipTrigger asChild>
                                    <Link
                                        href={item.href}
                                        className={`flex items-center justify-center w-12 h-12 rounded-2xl transition-all mx-auto ${isActive
                                                ? 'bg-white text-black shadow-lg shadow-white/5'
                                                : 'text-zinc-400 hover:bg-white/10 hover:text-white'
                                            }`}
                                    >
                                        <item.icon size={24} strokeWidth={isActive ? 2.5 : 2} />
                                    </Link>
                                </TooltipTrigger>
                                <TooltipContent side="right" className="bg-zinc-900 border-white/10 text-white font-semibold">
                                    <p>{item.name}</p>
                                </TooltipContent>
                            </Tooltip>
                        )
                    })}
                </TooltipProvider>
            </nav>

            <div className="mt-auto px-2">
                <TooltipProvider delayDuration={0}>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <button
                                onClick={() => signOut({ callbackUrl: '/' })}
                                className="flex items-center justify-center w-12 h-12 rounded-2xl text-zinc-400 hover:bg-red-500/10 hover:text-red-400 transition-all mx-auto"
                            >
                                <LogOut size={22} />
                            </button>
                        </TooltipTrigger>
                        <TooltipContent side="right" className="bg-zinc-900 border-white/10 text-red-200 font-semibold">
                            <p>{t("logout")}</p>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            </div>
        </aside>
    )
}
