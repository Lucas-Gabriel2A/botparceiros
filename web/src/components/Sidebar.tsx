"use client";

import { LucideIcon } from "lucide-react";
import { SidebarContent, MenuItem } from "./SidebarContent";

interface SidebarProps {
    title: string;
    logo?: string;
    serverIcon?: string;
    items: MenuItem[];
    backLink?: {
        href: string;
        label: string;
    };
}

export function Sidebar(props: SidebarProps) {
    return (
        <aside className="hidden md:flex w-72 h-screen shrink-0 sticky top-0">
            <SidebarContent {...props} className="w-full" />
        </aside>
    );
}
