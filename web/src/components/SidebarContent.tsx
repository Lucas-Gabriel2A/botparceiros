"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, ChevronLeft, LucideIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { signOut } from "next-auth/react";
import Image from "next/image";
import { cn } from "@/lib/utils";

export interface MenuItem {
    name: string;
    icon: LucideIcon;
    href: string;
    exact?: boolean;
}

interface SidebarContentProps {
    title: string;
    logo?: string;
    serverIcon?: string;
    items: MenuItem[];
    backLink?: {
        href: string;
        label: string;
    };
    className?: string;
    onItemClick?: () => void;
}

export function SidebarContent({ title, logo, serverIcon, items, backLink, className, onItemClick }: SidebarContentProps) {
    const t = useTranslations("dashboard.sidebar");
    const pathname = usePathname();

    return (
        <div className={cn("flex flex-col h-full bg-[#060609] border-r border-white/5", className)}>
            <div className="p-6 border-b border-white/5">
                {backLink && (
                    <Link
                        href={backLink.href}
                        className="flex items-center text-xs font-bold text-zinc-500 hover:text-white transition-colors mb-4 uppercase tracking-wider"
                        onClick={onItemClick}
                    >
                        <ChevronLeft size={14} className="mr-1" />
                        {backLink.label}
                    </Link>
                )}

                <div className="flex items-center gap-3">
                    {logo && (
                        <div className="relative w-8 h-8">
                            <Image src={logo} alt={title} fill className="object-contain" />
                        </div>
                    )}
                    {serverIcon ? (
                        <img
                            src={serverIcon}
                            alt={title}
                            className="w-10 h-10 rounded-full"
                        />
                    ) : (
                        !logo && (
                            <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center text-lg font-bold text-white">
                                {title.charAt(0)}
                            </div>
                        )
                    )}

                    <span className={cn("font-bold text-white truncate", serverIcon ? "text-base" : "font-serif text-lg tracking-tight")}>
                        {title}
                    </span>
                </div>
            </div>

            <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
                {items.map((item) => {
                    const isActive = item.exact
                        ? pathname === item.href
                        : pathname.startsWith(item.href);

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            onClick={onItemClick}
                            className={cn(
                                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all group",
                                isActive
                                    ? "bg-white text-black shadow-md shadow-white/5"
                                    : "text-zinc-400 hover:bg-white/5 hover:text-white"
                            )}
                        >
                            <item.icon className={cn("w-4 h-4", isActive ? "text-black" : "text-zinc-500 group-hover:text-white")} />
                            {item.name}
                        </Link>
                    )
                })}
            </nav>

            <div className="p-4 border-t border-white/5">
                <button
                    onClick={() => signOut({ callbackUrl: '/' })}
                    className="flex items-center gap-3 px-4 py-3 w-full rounded-xl text-sm font-medium text-zinc-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                >
                    <LogOut className="w-5 h-5" />
                    {t("logout")}
                </button>
            </div>
        </div>
    );
}
