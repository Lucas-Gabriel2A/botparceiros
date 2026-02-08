"use client";

import { updateAutoModConfig } from "@/actions/guild-actions";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { updateWelcomeConfig } from "@/actions/guild-actions";
import { Textarea } from "@/components/ui/textarea";
import { Hand, ShieldAlert, Type, UserPlus, LogOut, ShieldCheck, Image as ImageIcon, Sparkles, Save, Link, MessageSquare, CloudUpload } from "lucide-react";
import { useEffect, useState } from "react";

interface AutoModConfig {
    guild_id: string;
    welcome_message: string | null;
    welcome_channel_id: string | null;
    welcome_banner_url: string | null;
    welcome_font: string | null;
    leave_message: string | null;
    leave_channel_id: string | null;
    autorole_id: string | null;
    automod_links_enabled: boolean;
    automod_caps_enabled: boolean;
    automod_spam_enabled: boolean;
}

function SubmitButton() {
    const { pending } = useFormStatus();

    return (
        <Button
            type="submit"
            disabled={pending}
            className="w-full py-6 rounded-xl bg-white text-black hover:bg-zinc-200 text-sm font-bold shadow-[0_0_20px_-5px_rgba(255,255,255,0.3)] transition-all"
        >
            {pending ? (
                <span className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 animate-spin" /> Salvando...
                </span>
            ) : (
                <span className="flex items-center gap-2">
                    <Save className="w-4 h-4" /> Salvar Configurações
                </span>
            )}
        </Button>
    );
}


export function WelcomeForm({ config, guildId, user }: { config: any, guildId: string, user?: any }) {
    // We will need to update the action import later, for now we keep it as placeholder or error until we fix guild-actions.ts
    // let's assume updateWelcomeConfig is exported from guild-actions
    // but to avoid TS error before I create the action, I will use updateAutoModConfig and rename it in next step
    // Actually, better to change it now and fix action file next.
    const [state, formAction] = useActionState(updateWelcomeConfig, { success: false, error: "", message: "" });
    const [selectedFont, setSelectedFont] = useState(config?.welcome_font || 'Inter');
    const [welcomeMessage, setWelcomeMessage] = useState(config?.welcome_message || "Bem-vindo {user} ao servidor!");
    const [bannerPreview, setBannerPreview] = useState(config?.welcome_banner_url || null);

    const previewUser = {
        name: user?.name || "Usuário",
        image: user?.image || "https://cdn.discordapp.com/embed/avatars/0.png"
    };

    const handleBannerUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const url = URL.createObjectURL(file);
            setBannerPreview(url);
        }
    };

    // Parse message for preview (simple replacement)
    const previewText = welcomeMessage.replace(/{user}/g, previewUser.name).replace(/{server}/g, "Servidor");

    return (
        <form action={formAction} className="space-y-6 w-full max-w-4xl mx-auto font-sans">
            <input type="hidden" name="guildId" value={guildId} />

            <div className="grid grid-cols-1 gap-6">
                {/* ════════════════════════════════════════════════════
                    WELCOME & LEAVE
                   ════════════════════════════════════════════════════ */}
                <div className="bg-[#0A0A0C] border border-blue-500/30 rounded-3xl p-6 relative overflow-hidden group hover:border-blue-500/50 transition-all duration-500 h-full">
                    {/* Glow Effect */}
                    <div className="absolute inset-0 bg-linear-to-b from-blue-500/10 to-transparent opacity-50 pointer-events-none"></div>

                    <div className="relative z-10 space-y-6">
                        <div className="flex items-center gap-5 mb-6">
                            <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center bg-linear-to-br from-blue-500/20 to-purple-500/20 group-hover:scale-105 transition-transform duration-500 shadow-lg shadow-blue-500/10">
                                <Hand className="text-blue-400 w-6 h-6" />
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-white">Boas-vindas</h2>
                                <p className="text-xs text-zinc-500">Configure mensagens de entrada e saída.</p>
                            </div>
                        </div>

                        <div className="h-px w-full bg-white/5"></div>

                        {/* Banner Preview */}
                        <div className="relative w-full h-40 rounded-xl overflow-hidden border border-white/10 shadow-2xl bg-[#0f0f13] group">
                            {bannerPreview ? (
                                <img
                                    src={bannerPreview}
                                    alt="Background"
                                    className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:opacity-70 transition-opacity"
                                />
                            ) : (
                                <div className="absolute inset-0 bg-linear-to-r from-blue-900/40 to-purple-900/40 opacity-60" />
                            )}

                            <div className="absolute inset-0 flex items-center px-8 gap-6 z-10">
                                <div className="w-20 h-20 rounded-full border-4 border-white/10 shadow-xl overflow-hidden relative shrink-0">
                                    <img
                                        src={previewUser.image}
                                        alt="User Avatar"
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <h3
                                        className="text-2xl font-bold text-white drop-shadow-lg wrap-break-word line-clamp-2"
                                        style={{ fontFamily: selectedFont }}
                                    >
                                        {previewText}
                                    </h3>
                                    <p className="text-zinc-200 text-sm font-medium drop-shadow-md opacity-90">
                                        Você é o membro #1234
                                    </p>
                                </div>
                            </div>

                            {/* Overlay info */}
                            <div className="absolute top-3 right-3 bg-black/50 backdrop-blur-md border border-white/10 px-2 py-0.5 rounded-full text-[10px] text-white/70">
                                Preview
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div className="space-y-3">
                                <Label htmlFor="welcome-msg" className="text-sm font-medium text-zinc-300 flex items-center gap-2">
                                    <div className="p-1.5 rounded-lg bg-white/5">
                                        <UserPlus className="w-3.5 h-3.5 text-blue-400" />
                                    </div>
                                    Mensagem de Boas-vindas
                                </Label>
                                <div className="grid gap-3">
                                    <div className="relative group/input">
                                        <Input
                                            id="welcome-channel"
                                            name="welcomeChannelId"
                                            placeholder="ID do Canal"
                                            defaultValue={config?.welcome_channel_id || ''}
                                            className="bg-black/50 border-white/10 text-white rounded-xl focus:border-blue-500/50 h-10 pl-3 transition-all group-hover/input:border-white/20 font-mono text-xs"
                                        />
                                    </div>
                                    <div className="relative group/input">
                                        <Textarea
                                            id="welcome-msg"
                                            name="welcomeMessage"
                                            placeholder="Bem-vindo {user} ao servidor!"

                                            value={welcomeMessage}
                                            onChange={(e) => setWelcomeMessage(e.target.value)}
                                            className="bg-black/50 border-white/10 text-white rounded-xl focus:border-blue-500/50 min-h-[100px] resize-none p-3 text-sm transition-all group-hover/input:border-white/20"
                                        />
                                    </div>
                                    <p className="text-[10px] text-zinc-500">
                                        Variáveis: <span className="text-blue-400">{"{user}"}</span>, <span className="text-blue-400">{"{server}"}</span>
                                    </p>
                                </div>

                                <div className="space-y-3 pt-2">
                                    <Label htmlFor="leave-msg" className="text-sm font-medium text-zinc-300 flex items-center gap-2">
                                        <div className="p-1.5 rounded-lg bg-white/5">
                                            <LogOut className="w-3.5 h-3.5 text-red-400" />
                                        </div>
                                        Mensagem de Saída
                                    </Label>
                                    <div className="grid gap-3">
                                        <div className="relative group/input">
                                            <Input
                                                id="leave-channel"
                                                name="leaveChannelId"
                                                placeholder="ID do Canal"
                                                defaultValue={config?.leave_channel_id || ''}
                                                className="bg-black/50 border-white/10 text-white rounded-xl focus:border-blue-500/50 h-10 pl-3 transition-all group-hover/input:border-white/20 font-mono text-xs"
                                            />
                                        </div>
                                        <div className="relative group/input">
                                            <Textarea
                                                id="leave-msg"
                                                name="leaveMessage"
                                                placeholder="{user} saiu do servidor."
                                                defaultValue={config?.leave_message || ''}
                                                className="bg-black/50 border-white/10 text-white rounded-xl focus:border-blue-500/50 min-h-[100px] resize-none p-3 text-sm transition-all group-hover/input:border-white/20"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 gap-5 pt-4 md:pt-0 border-t border-white/5 md:border-t-0 md:pl-5 md:border-l">
                                <div className="space-y-3">
                                    <Label htmlFor="autorole" className="text-sm font-medium text-zinc-300 flex items-center gap-2">
                                        <div className="p-1.5 rounded-lg bg-white/5">
                                            <ShieldCheck className="w-3.5 h-3.5 text-green-400" />
                                        </div>
                                        Auto-Role (ID)
                                    </Label>
                                    <div className="relative group/input">
                                        <Input
                                            id="autorole"
                                            name="autoroleId"
                                            placeholder="ID do Cargo"
                                            defaultValue={config?.autorole_id || ''}
                                            className="bg-black/50 border-white/10 text-white rounded-xl focus:border-blue-500/50 h-10 pl-3 transition-all group-hover/input:border-white/20 font-mono text-xs"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <Label htmlFor="welcome-font" className="text-sm font-medium text-zinc-300 flex items-center gap-2">
                                        <div className="p-1.5 rounded-lg bg-white/5">
                                            <Type className="w-3.5 h-3.5 text-teal-400" />
                                        </div>
                                        Fonte da Mensagem
                                    </Label>

                                    <select
                                        id="welcome-font"
                                        name="welcome_font"
                                        value={selectedFont}
                                        onChange={(e) => setSelectedFont(e.target.value)}
                                        className="w-full bg-black/50 border border-white/10 rounded-lg p-2.5 text-zinc-100 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/50 transition-all font-sans text-sm appearance-none"
                                    >
                                        <option value="Inter">Inter (Padrão)</option>
                                        <option value="Roboto">Roboto</option>
                                        <option value="Poppins">Poppins</option>
                                        <option value="Montserrat">Montserrat</option>
                                        <option value="Open Sans">Open Sans</option>
                                        <option value="Lato">Lato</option>
                                    </select>
                                </div>

                                {/* Banner Upload moved here for better use of space */}
                                <div className="space-y-3 pt-2">
                                    <div className="flex items-center gap-2 mb-1">
                                        <div className="p-1.5 rounded-lg bg-white/5">
                                            <ImageIcon className="w-3.5 h-3.5 text-pink-400" />
                                        </div>
                                        <label className="text-sm font-medium text-zinc-300">
                                            Alterar Banner
                                        </label>
                                    </div>

                                    <div className="space-y-3">
                                        <input
                                            type="file"
                                            name="welcome_banner"
                                            accept="image/*"
                                            onChange={handleBannerUpload}
                                            className="w-full text-xs text-zinc-400 
                                            file:mr-3 file:py-1.5 file:px-3 
                                            file:rounded-full file:border-0 
                                            file:text-[10px] file:font-semibold 
                                            file:bg-purple-500/10 file:text-purple-400 
                                            hover:file:bg-purple-500/20
                                            cursor-pointer border border-white/10 rounded-lg p-2 bg-black/50 focus:border-purple-500/50 transition-all font-sans"
                                        />
                                        <p className="text-[10px] text-zinc-500">
                                            Rec: 1920x1080px (JPG, PNG).
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="pt-2 pb-8">
                <SubmitButton />
                {state?.message && (
                    <div className="mt-4 p-4 bg-green-500/10 border border-green-500/20 text-green-400 rounded-xl text-center font-medium animate-in fade-in slide-in-from-bottom-2 shadow-lg shadow-green-900/10">
                        {state.message}
                    </div>
                )}
                {state?.error && (
                    <div className="mt-4 p-4 bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl text-center font-medium animate-in fade-in slide-in-from-bottom-2 shadow-lg shadow-red-900/10">
                        {state.error}
                    </div>
                )}
            </div>
        </form>
    );
}
