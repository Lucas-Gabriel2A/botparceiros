"use client";

import { useState } from "react";
import { TicketForm } from "@/components/forms/TicketForm";
import { TicketConfigForm } from "@/components/forms/TicketConfigForm";
import { Button } from "@/components/ui/button";
import { Ticket, LayoutTemplate } from "lucide-react";

interface TicketDashboardClientProps {
    guildId: string;
    userId: string;
    categories: any[];
    guildConfig: {
        ticket_panel_title?: string | null;
        ticket_panel_description?: string | null;
        ticket_panel_banner_url?: string | null;
        ticket_panel_color?: string | null;
        ticket_panel_button_text?: string | null;
        ticket_panel_button_emoji?: string | null;
        ticket_panel_footer?: string | null;
    };
}

export function TicketDashboardClient({ guildId, userId, categories, guildConfig }: TicketDashboardClientProps) {
    const [activeTab, setActiveTab] = useState<'categories' | 'panel'>('categories');

    return (
        <div className="space-y-6">
            <div className="flex gap-2 p-1 bg-zinc-900/50 rounded-lg w-fit border border-zinc-800">
                <Button
                    variant={activeTab === 'categories' ? 'secondary' : 'ghost'}
                    size="sm"
                    onClick={() => setActiveTab('categories')}
                    className="gap-2"
                >
                    <Ticket className="w-4 h-4" />
                    Categorias
                </Button>
                <Button
                    variant={activeTab === 'panel' ? 'secondary' : 'ghost'}
                    size="sm"
                    onClick={() => setActiveTab('panel')}
                    className="gap-2"
                >
                    <LayoutTemplate className="w-4 h-4" />
                    Personalizar Painel
                </Button>
            </div>

            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                {activeTab === 'categories' ? (
                    <TicketForm
                        guildId={guildId}
                        userId={userId}
                        categories={categories}
                    />
                ) : (
                    <TicketConfigForm
                        guildId={guildId}
                        initialConfig={{
                            title: guildConfig.ticket_panel_title,
                            description: guildConfig.ticket_panel_description,
                            bannerUrl: guildConfig.ticket_panel_banner_url,
                            color: guildConfig.ticket_panel_color,
                            buttonText: guildConfig.ticket_panel_button_text,
                            buttonEmoji: guildConfig.ticket_panel_button_emoji,
                            footer: guildConfig.ticket_panel_footer
                        }}
                    />
                )}
            </div>
        </div>
    );
}
