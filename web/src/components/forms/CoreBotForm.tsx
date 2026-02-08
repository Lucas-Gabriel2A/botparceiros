"use client";

import { updateCoreBotConfig } from "@/actions/guild-actions";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useEffect } from "react";
import { Bot, MessageSquare, Save, Sparkles } from "lucide-react";

interface GuildConfig {
    guild_id: string;
    ia_enabled: boolean;
    ia_channel_id: string | null;
    ia_system_prompt: string | null;
    ia_temperature?: number;
    ia_ignored_channels?: string[];
    ia_ignored_roles?: string[];
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
                    <Save className="w-4 h-4" /> Salvar Alterações
                </span>
            )}
        </Button>
    );
}

export function CoreBotForm({ config, guildId }: { config: any, guildId: string }) {
    const [state, formAction] = useActionState(updateCoreBotConfig, {});

    useEffect(() => {
        if (state.success) {
            console.log("Saved successfully!");
        } else if (state.error) {
            console.error(state.error);
        }
    }, [state]);

    return (
        <form action={formAction} className="space-y-6 w-full max-w-3xl mx-auto font-sans">
            <input type="hidden" name="guildId" value={guildId} />

            {/* Config Card */}
            <div className="bg-[#0A0A0C] border border-purple-500/30 rounded-3xl p-8 relative overflow-hidden group hover:border-purple-500/50 transition-all duration-500">
                {/* Glow Effect */}
                <div className="absolute inset-0 bg-linear-to-b from-purple-500/10 to-transparent opacity-50 pointer-events-none"></div>

                <div className="relative z-10 space-y-8">

                    {/* Header do Card */}
                    <div className="flex items-center gap-6 mb-8">
                        <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center bg-linear-to-br from-purple-500/20 to-blue-500/20 group-hover:scale-105 transition-transform duration-500 shadow-lg shadow-purple-500/10">
                            <Bot className="text-white w-8 h-8" />
                        </div>
                        <div>
                            <h3 className="text-2xl font-medium text-white mb-2">Configurações da IA</h3>
                            <p className="text-sm text-zinc-500">Gerencie a personalidade e o comportamento do seu assistente.</p>
                        </div>
                    </div>

                    <div className="h-px w-full bg-white/5"></div>

                    {/* Toggle Ativo/Inativo */}
                    <div className="flex items-center justify-between p-6 bg-[#13111C] rounded-2xl border border-white/5 hover:border-purple-500/30 transition-all duration-300 group/toggle">
                        <div className="flex items-center gap-5">
                            <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center group-hover/toggle:bg-green-500/20 transition-colors">
                                <Sparkles className="w-6 h-6 text-green-400" />
                            </div>
                            <div className="space-y-1">
                                <Label htmlFor="ia-enabled" className="text-lg font-medium text-white pointer-events-none block">Ativar Inteligência Artificial</Label>
                                <p className="text-sm text-zinc-400">
                                    O bot responderá automaticamente quando mencionado.
                                </p>
                            </div>
                        </div>
                        <Switch
                            id="ia-enabled"
                            name="iaEnabled"
                            defaultChecked={config?.ia_enabled}
                            className="data-[state=checked]:bg-green-500 scale-125 mr-2"
                        />
                    </div>

                    {/* Canal da IA */}
                    <div className="space-y-4">
                        <Label htmlFor="channel" className="text-base font-medium text-zinc-300 flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-white/5">
                                <MessageSquare className="w-4 h-4 text-purple-400" />
                            </div>
                            Canal de Interação
                        </Label>
                        <div className="relative group/input">
                            <Input
                                id="channel"
                                name="channelId"
                                placeholder="ID do Canal (Ex: 123456...)"
                                defaultValue={config?.ia_channel_id || ''}
                                className="bg-black/50 border-white/10 text-white rounded-xl focus:border-purple-500/50 py-6 pl-4 transition-all group-hover/input:border-white/20"
                            />
                        </div>
                        <p className="text-xs text-zinc-500 pl-1">
                            * Deixe vazio para permitir respostas em todos os canais permitidos.
                        </p>
                    </div>

                    {/* System Prompt */}
                    <div className="space-y-4">
                        <Label htmlFor="prompt" className="text-base font-medium text-zinc-300 flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-white/5">
                                <Bot className="w-4 h-4 text-purple-400" />
                            </div>
                            Personalidade (System Prompt)
                        </Label>
                        <div className="relative group/input">
                            <Textarea
                                id="prompt"
                                name="systemPrompt"
                                placeholder="Ex: Você é um assistente sarcástico que adora trocadilhos..."
                                defaultValue={config?.ia_system_prompt || ''}
                                className="bg-black/50 border-white/10 text-white rounded-xl focus:border-purple-500/50 min-h-[160px] resize-none p-4 text-base leading-relaxed transition-all group-hover/input:border-white/20"
                            />
                        </div>
                        <p className="text-xs text-zinc-500 pl-1">
                            Defina o comportamento base da IA. Isso afeta todas as respostas.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-white/5 pt-6">
                        <div className="space-y-4">
                            <Label htmlFor="iaTemperature" className="text-base font-medium text-zinc-300">
                                Criatividade (Temperatura)
                            </Label>
                            <Input
                                id="iaTemperature"
                                name="iaTemperature"
                                type="number"
                                step="0.1"
                                min="0"
                                max="1"
                                placeholder="0.7"
                                defaultValue={config?.ia_temperature || 0.7}
                                className="bg-black/50 border-white/10 text-white rounded-xl focus:border-purple-500/50 h-12 pl-4 transition-all"
                            />
                            <p className="text-xs text-zinc-500">
                                0.0 (Focado) a 1.0 (Criativo).
                            </p>
                        </div>

                        <div className="space-y-4">
                            <Label htmlFor="iaIgnoredChannels" className="text-base font-medium text-zinc-300">
                                Canais Ignorados
                            </Label>
                            <Input
                                id="iaIgnoredChannels"
                                name="iaIgnoredChannels"
                                placeholder="IDs separados por vírgula"
                                defaultValue={JSON.stringify(config?.ia_ignored_channels || []).replace(/[\[\]"]/g, '')}
                                className="bg-black/50 border-white/10 text-white rounded-xl focus:border-purple-500/50 h-12 pl-4 transition-all"
                            />
                            <p className="text-xs text-zinc-500">
                                O bot não responderá nestes canais.
                            </p>
                        </div>

                        <div className="space-y-4 md:col-span-2">
                            <Label htmlFor="iaIgnoredRoles" className="text-base font-medium text-zinc-300">
                                Cargos Ignorados
                            </Label>
                            <Input
                                id="iaIgnoredRoles"
                                name="iaIgnoredRoles"
                                placeholder="IDs separados por vírgula"
                                defaultValue={JSON.stringify(config?.ia_ignored_roles || []).replace(/[\[\]"]/g, '')}
                                className="bg-black/50 border-white/10 text-white rounded-xl focus:border-purple-500/50 h-12 pl-4 transition-all"
                            />
                            <p className="text-xs text-zinc-500">
                                Usuários com estes cargos serão ignorados.
                            </p>
                        </div>
                    </div>

                    <div className="pt-6">
                        <SubmitButton />
                    </div>

                    {/* Feedback Messages */}
                    {state.message && (
                        <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 text-sm text-center font-medium animate-in fade-in slide-in-from-bottom-2">
                            {state.message}
                        </div>
                    )}
                    {state.error && (
                        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-sm text-center font-medium animate-in fade-in slide-in-from-bottom-2">
                            {state.error}
                        </div>
                    )}
                </div>
            </div>
        </form>
    );
}
