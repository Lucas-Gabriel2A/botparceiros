"use client";

import { updateAutoModConfig } from "@/actions/guild-actions";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Hand, ShieldAlert, Type, UserPlus, LogOut, ShieldCheck, Image as ImageIcon, Sparkles, Save, Link, MessageSquare, AlertTriangle, X, Bot, Lock } from "lucide-react";
import { useEffect, useState } from "react";
import { usePlan } from "@/components/PlanGate";

interface AutoModConfig {
    guild_id: string;
    automod_links_enabled: boolean;
    automod_caps_enabled: boolean;
    automod_spam_enabled: boolean;
    prohibited_words: string[];
    automod_channel?: string | null;
    automod_action?: 'delete' | 'timeout' | 'kick' | 'ban';
    automod_timeout_duration?: number;
    automod_bypass_roles?: string[];
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


export function AutoModForm({ config, guildId, user }: { config: any, guildId: string, user?: any }) {
    const [state, formAction] = useActionState(updateAutoModConfig, { success: false, error: "", message: "" });
    const { plan, canUse } = usePlan();
    const canUseAI = canUse('automod_ia');

    const [prohibitedWords, setProhibitedWords] = useState<string[]>(config?.prohibited_words || []);
    const [newWord, setNewWord] = useState("");

    const handleAddWord = (e: React.KeyboardEvent | React.MouseEvent) => {
        if (e.type === 'keydown' && (e as React.KeyboardEvent).key !== 'Enter') return;
        e.preventDefault();

        const word = newWord.trim().toLowerCase();
        if (word && !prohibitedWords.includes(word)) {
            setProhibitedWords([...prohibitedWords, word]);
            setNewWord("");
        }
    };

    const handleRemoveWord = (wordToRemove: string) => {
        setProhibitedWords(prohibitedWords.filter(w => w !== wordToRemove));
    };

    return (
        <form action={formAction} className="space-y-6 w-full max-w-4xl mx-auto font-sans">
            <input type="hidden" name="guildId" value={guildId} />
            <input type="hidden" name="prohibitedWords" value={JSON.stringify(prohibitedWords)} />

            <div className="grid grid-cols-1 gap-6">
                {/* ════════════════════════════════════════════════════
                    AUTOMOD SYSTEM
                   ════════════════════════════════════════════════════ */}
                <div className="bg-[#0A0A0C] border border-red-500/30 rounded-3xl p-8 relative overflow-hidden group hover:border-red-500/50 transition-all duration-500 h-full">
                    {/* Glow Effect */}
                    <div className="absolute inset-0 bg-linear-to-b from-red-500/10 to-transparent opacity-50 pointer-events-none"></div>

                    <div className="relative z-10 space-y-8">
                        <div className="flex items-center gap-6 mb-8">
                            <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center bg-linear-to-br from-red-500/20 to-orange-500/20 group-hover:scale-105 transition-transform duration-500 shadow-lg shadow-red-500/10">
                                <ShieldAlert className="text-red-400 w-8 h-8" />
                            </div>
                            <div>
                                <h1 className="text-3xl md:text-5xl font-serif font-medium text-white">AutoModeração</h1>
                                <p className="text-sm text-zinc-500 font-medium mt-1">Proteção automática contra spam e conteúdo indesejado.</p>
                            </div>
                        </div>

                        <div className="h-px w-full bg-white/5"></div>

                        {/* Toggles */}
                        <div className="space-y-4">
                            {/* Anti-Links */}
                            <div className="flex items-center justify-between p-4 bg-[#13111C] rounded-xl border border-white/5 hover:border-red-500/30 transition-all duration-300 group/toggle">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center group-hover/toggle:bg-red-500/20 transition-colors">
                                        <Link className="w-5 h-5 text-red-400" />
                                    </div>
                                    <div>
                                        <Label htmlFor="automod-links" className="text-base font-medium text-white pointer-events-none block">Bloquear Links</Label>
                                        <p className="text-xs text-zinc-400">Impede envio de URLs externas.</p>
                                    </div>
                                </div>
                                <Switch
                                    id="automod-links"
                                    name="automodLinks"
                                    defaultChecked={config?.automod_links_enabled}
                                    className="data-[state=checked]:bg-red-500"
                                />
                            </div>

                            {/* Anti-Caps */}
                            <div className="flex items-center justify-between p-4 bg-[#13111C] rounded-xl border border-white/5 hover:border-red-500/30 transition-all duration-300 group/toggle">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center group-hover/toggle:bg-red-500/20 transition-colors">
                                        <Type className="w-5 h-5 text-red-400" />
                                    </div>
                                    <div>
                                        <Label htmlFor="automod-caps" className="text-base font-medium text-white pointer-events-none block">Anti-Caps Lock</Label>
                                        <p className="text-xs text-zinc-400">Bloqueia mensagens gritando.</p>
                                    </div>
                                </div>
                                <Switch
                                    id="automod-caps"
                                    name="automodCaps"
                                    defaultChecked={config?.automod_caps_enabled}
                                    className="data-[state=checked]:bg-red-500"
                                />
                            </div>

                            {/* Anti-Spam */}
                            <div className="flex items-center justify-between p-4 bg-[#13111C] rounded-xl border border-white/5 hover:border-red-500/30 transition-all duration-300 group/toggle">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center group-hover/toggle:bg-red-500/20 transition-colors">
                                        <MessageSquare className="w-5 h-5 text-red-400" />
                                    </div>
                                    <div>
                                        <Label htmlFor="automod-spam" className="text-base font-medium text-white pointer-events-none block">Anti-Spam</Label>
                                        <p className="text-xs text-zinc-400">Evita mensagens repetitivas.</p>
                                    </div>
                                </div>
                                <Switch
                                    id="automod-spam"
                                    name="automodSpam"
                                    defaultChecked={config?.automod_spam_enabled}
                                    className="data-[state=checked]:bg-red-500"
                                />
                            </div>

                            {/* AutoMod IA */}
                            <div className="flex items-center justify-between p-4 bg-[#13111C] rounded-xl border border-purple-500/20 hover:border-purple-500/40 transition-all duration-300 group/toggle relative overflow-hidden">
                                <div className="absolute inset-0 bg-linear-to-r from-purple-500/5 to-transparent pointer-events-none"></div>
                                <div className="flex items-center gap-4 relative z-10">
                                    <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center group-hover/toggle:bg-purple-500/20 transition-colors">
                                        <Bot className="w-5 h-5 text-purple-400" />
                                    </div>
                                    <div>
                                        <Label htmlFor="automod-ai" className="text-base font-medium text-white pointer-events-none block">
                                            AutoMod IA
                                            <span className="ml-2 text-[9px] bg-purple-500/20 text-purple-300 px-1.5 py-0.5 rounded font-bold tracking-wider">PRO</span>
                                        </Label>
                                        <p className="text-xs text-zinc-400">Detecção avançada por IA: toxicidade, assédio, NSFW e evasão.</p>
                                    </div>
                                </div>
                                <Switch
                                    id="automod-ai"
                                    name="automodAiEnabled"
                                    defaultChecked={config?.automod_ai_enabled}
                                    disabled={!canUseAI}
                                    className="data-[state=checked]:bg-purple-500 relative z-10 disabled:opacity-40 disabled:cursor-not-allowed"
                                />
                            </div>
                            {!canUseAI && (
                                <div className="flex items-center gap-2 px-4 py-2 bg-amber-500/5 border border-amber-500/20 rounded-lg text-amber-300 text-xs">
                                    <Lock className="w-3 h-3 shrink-0" />
                                    Requer plano Pro ou superior. Faça upgrade para ativar.
                                </div>
                            )}
                        </div>

                        {/* Actions & Sensitivity */}
                        <div className="space-y-4 pt-4 border-t border-white/5">
                            <Label className="text-base font-medium text-zinc-300 flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-white/5">
                                    <ShieldCheck className="w-4 h-4 text-violet-400" />
                                </div>
                                Ações e Exceções
                            </Label>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="automodAction" className="text-zinc-400 text-sm">Ação ao detectar infração</Label>
                                    <select
                                        id="automodAction"
                                        name="automodAction"
                                        defaultValue={config?.automod_action || 'delete'}
                                        className="w-full h-10 px-3 rounded-md border border-zinc-800 bg-zinc-950 text-sm text-white focus:outline-hidden focus:ring-2 focus:ring-violet-500/50"
                                    >
                                        <option value="delete">Apagar Mensagem</option>
                                        <option value="timeout">Castigo (Timeout)</option>
                                        <option value="kick">Expulsar (Kick)</option>
                                        <option value="ban">Banir (Ban)</option>
                                    </select>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="automodTimeoutDuration" className="text-zinc-400 text-sm">Duração do Castigo (minutos)</Label>
                                    <Input
                                        id="automodTimeoutDuration"
                                        name="automodTimeoutDuration"
                                        type="number"
                                        placeholder="Ex: 5"
                                        defaultValue={config?.automod_timeout_duration || 0}
                                        min="1"
                                        className="bg-black/50 border-white/10 text-white rounded-xl focus:border-violet-500/50 h-10 placeholder:text-zinc-600"
                                    />
                                    <p className="text-[10px] text-zinc-500">Apenas se a ação for &quot;Castigo&quot;.</p>
                                </div>

                                <div className="col-span-1 md:col-span-2 space-y-2">
                                    <Label htmlFor="automodBypassRoles" className="text-zinc-400 text-sm">Cargos que Ignoram AutoMod</Label>
                                    <Input
                                        id="automodBypassRoles"
                                        name="automodBypassRoles"
                                        placeholder="IDs dos cargos separados por vírgula (Ex: 123456, 789012)"
                                        defaultValue={JSON.stringify(config?.automod_bypass_roles || []).replace(/[\[\]"]/g, '')}
                                        className="bg-black/50 border-white/10 text-white rounded-xl focus:border-violet-500/50 h-10 placeholder:text-zinc-600"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Prohibited Words Section */}
                        <div className="space-y-4 pt-4 border-t border-white/5">
                            <Label className="text-base font-medium text-zinc-300 flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-white/5">
                                    <AlertTriangle className="w-4 h-4 text-orange-400" />
                                </div>
                                Palavras Proibidas
                            </Label>

                            <div className="flex gap-2">
                                <div className="relative group/input grow">
                                    <Input
                                        placeholder="Digite uma palavra e pressione Enter..."
                                        value={newWord}
                                        onChange={(e) => setNewWord(e.target.value)}
                                        onKeyDown={handleAddWord}
                                        className="bg-black/50 border-white/10 text-white rounded-xl focus:border-red-500/50 h-12 pl-4 transition-all group-hover/input:border-white/20"
                                    />
                                </div>
                                <Button
                                    type="button"
                                    onClick={handleAddWord}
                                    className="h-12 px-6 rounded-xl bg-white/5 hover:bg-white/10 text-white border border-white/10"
                                >
                                    Adicionar
                                </Button>
                            </div>

                            <div className="flex flex-wrap gap-2 min-h-[50px] p-4 rounded-xl bg-[#13111C] border border-white/5">
                                {prohibitedWords.length === 0 && (
                                    <span className="text-zinc-500 text-sm italic">Nenhuma palavra proibida configurada.</span>
                                )}
                                {prohibitedWords.map((word) => (
                                    <div key={word} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-300 text-sm group animate-in fade-in zoom-in">
                                        <span>{word}</span>
                                        <button
                                            type="button"
                                            onClick={() => handleRemoveWord(word)}
                                            className="hover:text-white transition-colors"
                                        >
                                            <X className="w-3 h-3" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                            <p className="text-xs text-zinc-500">
                                Mensagens contendo estas palavras serão deletadas automaticamente.
                            </p>
                        </div>

                        {/* Moderation Log Channel */}
                        <div className="pt-4 border-t border-white/5 space-y-4">
                            <Label htmlFor="automod-channel" className="text-base font-medium text-zinc-300 flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-white/5">
                                    <ShieldCheck className="w-4 h-4 text-blue-400" />
                                </div>
                                Canal de Logs (Opcional)
                            </Label>
                            <Input
                                id="automod-channel"
                                name="automodChannelId"
                                placeholder="ID do Canal de Logs"
                                defaultValue={config?.automod_channel || ""}
                                className="bg-black/50 border-white/10 text-white rounded-xl focus:border-blue-500/50 h-12 pl-4 transition-all hover:border-white/20"
                            />
                            <p className="text-xs text-zinc-500">
                                Se definido, notificações de infrações serão enviadas para este canal.
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="pt-4 pb-12">
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
