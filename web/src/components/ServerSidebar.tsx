"use client";

import { Sidebar } from "@/components/Sidebar";
import { MobileSidebar } from "@/components/MobileSidebar";
import { LayoutDashboard, Bot, ShieldAlert, Settings, Hand, Ticket, Wand2, Phone, BarChart3, Tag, Handshake } from "lucide-react";

interface ServerSidebarProps {
    guild: {
        name: string;
        icon: string | null;
        id: string;
    };
    locale: string;
}

function getServerMenuItems(guildId: string, locale: string) {
    return [
        { name: "Visão Geral", icon: LayoutDashboard, href: `/${locale}/dashboard/${guildId}`, exact: true },
        { name: "CoreBot AI", icon: Bot, href: `/${locale}/dashboard/${guildId}/corebot` },
        { name: "Boas-vindas", icon: Hand, href: `/${locale}/dashboard/${guildId}/welcome` },
        { name: "AutoMod", icon: ShieldAlert, href: `/${locale}/dashboard/${guildId}/automod` },
        { name: "Tickets", icon: Ticket, href: `/${locale}/dashboard/${guildId}/tickets` },
        { name: "Comandos AI", icon: Wand2, href: `/${locale}/dashboard/${guildId}/commands` },
        { name: "Calls Privadas", icon: Phone, href: `/${locale}/dashboard/${guildId}/private-calls` },
        { name: "Analytics", icon: BarChart3, href: `/${locale}/dashboard/${guildId}/analytics` },
        { name: "Whitelabel", icon: Tag, href: `/${locale}/dashboard/${guildId}/whitelabel` },
        { name: "Configurações", icon: Settings, href: `/${locale}/dashboard/${guildId}/settings` },
    ];
}

export function ServerSidebar({ guild, locale }: ServerSidebarProps) {
    const iconUrl = guild.icon
        ? `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png`
        : undefined;

    const menuItems = getServerMenuItems(guild.id, locale);

    return (
        <Sidebar
            title={guild.name}
            serverIcon={iconUrl}
            items={menuItems}
            backLink={{
                href: `/${locale}/dashboard`,
                label: "Voltar para Servidores"
            }}
        />
    );
}

export function MobileServerSidebar({ guild, locale }: ServerSidebarProps) {
    const iconUrl = guild.icon
        ? `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png`
        : undefined;

    const menuItems = getServerMenuItems(guild.id, locale);

    return (
        <MobileSidebar
            title={guild.name}
            serverIcon={iconUrl}
            items={menuItems}
            backLink={{
                href: `/${locale}/dashboard`,
                label: "Voltar para Servidores"
            }}
        />
    );
}
