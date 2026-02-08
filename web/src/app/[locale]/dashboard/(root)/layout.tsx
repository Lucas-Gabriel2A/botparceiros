"use client";

import { Sidebar } from "@/components/Sidebar";
import { LayoutDashboard, CreditCard } from "lucide-react";
import { useTranslations, useLocale } from "next-intl";

export default function DashboardRootLayout({ children }: { children: React.ReactNode }) {
    const t = useTranslations("dashboard.sidebar");
    const locale = useLocale();

    const menu = [
        { name: t("servers"), icon: LayoutDashboard, href: `/${locale}/dashboard`, exact: true },
        { name: t("billing"), icon: CreditCard, href: `/${locale}/dashboard/billing` },
    ];

    return (
        <div className="flex h-screen bg-[#060609] text-white font-sans overflow-hidden">
            <Sidebar
                title="CoreBot's"
                logo="/CoreBot.png"
                items={menu}
            />
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
