"use client";

import { Sidebar } from "@/components/Sidebar";
import { MobileSidebar } from "@/components/MobileSidebar";
import { LayoutDashboard, CreditCard, Hammer } from "lucide-react";
import { useTranslations, useLocale } from "next-intl";
import Image from "next/image";

export default function DashboardRootLayout({ children }: { children: React.ReactNode }) {
    const t = useTranslations("dashboard.sidebar");
    const locale = useLocale();

    const menu = [
        { name: t("servers"), icon: LayoutDashboard, href: `/${locale}/dashboard`, exact: true },
        { name: "Server Builder", icon: Hammer, href: `/${locale}/dashboard/server-builder` },
        { name: t("billing"), icon: CreditCard, href: `/${locale}/dashboard/billing` },
    ];

    const sidebarProps = {
        title: "CoreBot's",
        logo: "/CoreBot.png",
        items: menu
    };

    return (
        <div className="flex flex-col md:flex-row h-dvh bg-[#060609] text-white font-sans overflow-hidden">
            {/* Desktop Sidebar */}
            <Sidebar {...sidebarProps} />

            {/* Mobile Header */}
            <div className="md:hidden flex items-center p-4 border-b border-white/10 bg-zinc-900/90 backdrop-blur-md z-20 shrink-0 sticky top-0">
                <MobileSidebar {...sidebarProps} />
                <div className="ml-4 flex items-center gap-3">
                    <div className="relative w-8 h-8">
                        <Image src="/CoreBot.png" alt="CoreBot Logo" fill className="object-contain" />
                    </div>
                    <span className="font-bold text-lg">CoreBot's</span>
                </div>
            </div>

            <main className="flex-1 overflow-hidden relative">
                {/* Background noise/gradient specific to dashboard */}
                <div className="fixed inset-0 z-0 pointer-events-none opacity-20">
                    <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-purple-900/20 blur-[100px] rounded-full"></div>
                </div>

                <div className="relative z-10 h-full w-full">
                    {children}
                </div>
            </main>
        </div>
    );
}
