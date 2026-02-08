"use client";

import { Sidebar } from "@/components/Sidebar";
import { LayoutDashboard, Bot, ShieldAlert, Settings, Hand, Ticket, Wand2, Phone } from "lucide-react";

interface ServerSidebarProps {
    guild: {
        name: string;
        icon: string | null;
        id: string;
    };
    locale: string;
}

export function ServerSidebar({ guild, locale }: ServerSidebarProps) {
    const iconUrl = guild.icon
        ? `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png`
        : undefined;

    const menuItems = [
        { name: "Overview", icon: LayoutDashboard, href: `/${locale}/dashboard/${guild.id}`, exact: true },
        { name: "CoreBot AI", icon: Bot, href: `/${locale}/dashboard/${guild.id}/corebot` },
        { name: "Boas-vindas", icon: Hand, href: `/${locale}/dashboard/${guild.id}/welcome` },
        { name: "AutoMod", icon: ShieldAlert, href: `/${locale}/dashboard/${guild.id}/automod` },
        { name: "Tickets", icon: Ticket, href: `/${locale}/dashboard/${guild.id}/tickets` },
        { name: "Comandos AI", icon: Wand2, href: `/${locale}/dashboard/${guild.id}/commands` },
        { name: "Calls Privadas", icon: Phone, href: `/${locale}/dashboard/${guild.id}/private-calls` },
        { name: "Settings", icon: Settings, href: `/${locale}/dashboard/${guild.id}/settings` },
    ];

    return (
        <Sidebar
            title={guild.name}
            serverIcon={iconUrl}
            items={menuItems}
            backLink={{
                href: `/${locale}/dashboard`,
                label: "Back to Servers" // We can use useTranslations here if needed, keeping it simple for now or adding hook
            }}
        />
    );
}
