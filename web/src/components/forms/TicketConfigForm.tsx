"use client";

import { useFormStatus } from "react-dom";
import { updateTicketConfigAction } from "@/actions/guild-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Settings, Save, LayoutTemplate, Lock } from "lucide-react";
import { useState } from "react";
import { Check, X } from "lucide-react";

interface TicketConfigFormProps {
    guildId: string;
    userPlan: any;
    initialConfig: {
        title?: string | null;
        description?: string | null;
        bannerUrl?: string | null;
        color?: string | null;
        buttonText?: string | null;
        buttonEmoji?: string | null;
        footer?: string | null;
        logsChannelId?: string | null;
    };
}

function SubmitButton() {
    const { pending } = useFormStatus();
    return (
        <Button type="submit" disabled={pending} className="bg-violet-600 hover:bg-violet-700 text-white min-w-[120px]">
            {pending ? (
                <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                    Salvando...
                </>
            ) : (
                <>
                    <Save className="w-4 h-4 mr-2" />
                    Salvar Configuração
                </>
            )}
        </Button>
    );
}

import { useRouter } from "next/navigation";

export function TicketConfigForm({ guildId, initialConfig, userPlan }: TicketConfigFormProps) {
    const router = useRouter();
    const [feedback, setFeedback] = useState<{ type: 'success' | 'error', message: string } | null>(null);
    const isPremium = userPlan !== 'free';

    // State for Real-time Preview
    const [config, setConfig] = useState({
        title: initialConfig.title || '',
        description: initialConfig.description || '',
        bannerUrl: initialConfig.bannerUrl || '',
        color: initialConfig.color || '#5865F2', // Default Discord Blurple
        buttonText: initialConfig.buttonText || 'Abrir Ticket',
        buttonEmoji: initialConfig.buttonEmoji || '🎫',
        footer: initialConfig.footer || '',
        logsChannelId: initialConfig.logsChannelId || ''
    });

    const [bannerFile, setBannerFile] = useState<File | null>(null);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setConfig(prev => ({ ...prev, [name]: value }));
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setBannerFile(file);
            const objectUrl = URL.createObjectURL(file);
            setConfig(prev => ({ ...prev, bannerUrl: objectUrl }));
        }
    };

    async function handleSubmit(formData: FormData) {
        setFeedback(null);

        // Append file if exists
        if (bannerFile) {
            formData.set('bannerFile', bannerFile);
        }

        const res = await updateTicketConfigAction({} as any, formData);

        if (res.success) {
            setFeedback({ type: 'success', message: res.message || "Configuração salva!" });
            setTimeout(() => setFeedback(null), 3000);
        } else {
            setFeedback({ type: 'error', message: res.error || "Erro ao salvar." });
        }
    }

    return (
        <form action={handleSubmit} className="space-y-6 relative font-hind">
            {/* Feedback Toast */}
            {feedback && (
                <div className={`fixed bottom-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 text-sm font-medium animate-in slide-in-from-bottom-5 fade-in duration-300 ${feedback.type === 'success' ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'
                    }`}>
                    {feedback.type === 'success' ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                    {feedback.message}
                </div>
            )}

            <input type="hidden" name="guildId" value={guildId} />

            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                <div>
                    <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                        <LayoutTemplate className="w-5 h-5 text-violet-400" />
                        Personalização do Painel de Tickets
                    </h2>
                    <p className="text-zinc-400 text-sm mt-1">
                        Defina como o painel de abertura de tickets aparecerá no Discord.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    {!isPremium && (
                        <Button
                            type="button"
                            variant="outline"
                            className="border-amber-500/30 text-amber-300 hover:bg-amber-500/10 hover:text-amber-200 hidden sm:flex"
                            onClick={() => router.push('/dashboard/billing')}
                        >
                            <Lock className="w-4 h-4 mr-2" />
                            Liberar Premium
                        </Button>
                    )}
                    <SubmitButton />
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Configuration Fields */}
                <div className="space-y-6">
                    <Card className="bg-[#0A0A0C] border border-zinc-800 rounded-xl overflow-hidden">
                        <CardHeader className="border-b border-zinc-800 bg-zinc-900/30">
                            <CardTitle className="text-white text-base">Conteúdo do Embed</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-5 p-6">
                            <div className="space-y-2">
                                <Label htmlFor="title" className="text-zinc-300">Título do Painel</Label>
                                <Input
                                    id="title"
                                    name="title"
                                    placeholder="Ex: Central de Ajuda"
                                    value={config.title}
                                    onChange={handleInputChange}
                                    className="bg-zinc-900/50 border-zinc-800 text-white focus:ring-violet-500/50 placeholder:text-zinc-600"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="description" className="text-zinc-300">Descrição</Label>
                                <Textarea
                                    id="description"
                                    name="description"
                                    placeholder="Ex: Selecione uma categoria abaixo para abrir um ticket..."
                                    value={config.description}
                                    onChange={handleInputChange}
                                    className="bg-zinc-900/50 border-zinc-800 text-white focus:ring-violet-500/50 min-h-[120px] placeholder:text-zinc-600"
                                />
                            </div>

                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <Label className="text-zinc-300">Banner do Painel</Label>
                                    {!isPremium && (
                                        <span className="text-[10px] uppercase font-bold text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/20 flex items-center gap-1">
                                            <Lock className="w-3 h-3" /> Premium
                                        </span>
                                    )}
                                </div>
                                <div className={`space-y-3 ${!isPremium ? 'opacity-50 pointer-events-none' : ''}`}>
                                    <Input
                                        type="file"
                                        accept="image/*"
                                        onChange={handleFileChange}
                                        disabled={!isPremium}
                                        className="bg-zinc-900/50 border-zinc-800 text-white file:text-violet-400 file:bg-zinc-900 file:border-0 file:rounded-md cursor-pointer disabled:cursor-not-allowed"
                                    />
                                    <div className="flex items-center gap-2">
                                        <div className="h-px bg-zinc-800 flex-1"></div>
                                        <span className="text-zinc-500 text-xs">OU URL</span>
                                        <div className="h-px bg-zinc-800 flex-1"></div>
                                    </div>
                                    <Input
                                        id="bannerUrl"
                                        name="bannerUrl"
                                        placeholder="https://..."
                                        value={config.bannerUrl}
                                        onChange={handleInputChange}
                                        disabled={!isPremium}
                                        className="bg-zinc-900/50 border-zinc-800 text-white focus:ring-violet-500/50 placeholder:text-zinc-600 font-mono text-sm disabled:cursor-not-allowed"
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-[#0A0A0C] border border-zinc-800 rounded-xl overflow-hidden">
                        <CardHeader className="border-b border-zinc-800 bg-zinc-900/30">
                            <CardTitle className="text-white text-base">Aparência & Botões</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-5 p-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <Label htmlFor="color" className="text-zinc-300">Cor do Embed</Label>
                                        {!isPremium && (
                                            <Lock className="w-3 h-3 text-amber-400" />
                                        )}
                                    </div>
                                    <div className={`flex gap-2 ${!isPremium ? 'opacity-50 pointer-events-none' : ''}`}>
                                        <Input
                                            type="color"
                                            id="color"
                                            name="color"
                                            value={config.color}
                                            onChange={handleInputChange}
                                            disabled={!isPremium}
                                            className="w-12 h-10 p-1 bg-zinc-900 border-zinc-800 cursor-pointer disabled:cursor-not-allowed"
                                        />
                                        <Input
                                            value={config.color}
                                            onChange={handleInputChange}
                                            name="color"
                                            disabled={!isPremium}
                                            className="bg-zinc-900/50 border-zinc-800 text-white font-mono uppercase disabled:cursor-not-allowed"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="buttonEmoji" className="text-zinc-300">Emoji do Botão</Label>
                                    <Input
                                        id="buttonEmoji"
                                        name="buttonEmoji"
                                        placeholder="🎫"
                                        value={config.buttonEmoji}
                                        onChange={handleInputChange}
                                        className="bg-zinc-900/50 border-zinc-800 text-white focus:ring-violet-500/50 placeholder:text-zinc-600"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="buttonText" className="text-zinc-300">Texto do Botão (Caso não use categorias)</Label>
                                <Input
                                    id="buttonText"
                                    name="buttonText"
                                    placeholder="Ex: Abrir Ticket"
                                    value={config.buttonText}
                                    onChange={handleInputChange}
                                    className="bg-zinc-900/50 border-zinc-800 text-white focus:ring-violet-500/50 placeholder:text-zinc-600"
                                />
                                <p className="text-xs text-zinc-500">Este texto aparece se você usar um botão único ao invés de menu de seleção.</p>
                            </div>

                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <Label htmlFor="footer" className="text-zinc-300">Rodapé do Embed</Label>
                                    {!isPremium && (
                                        <Lock className="w-3 h-3 text-amber-400" />
                                    )}
                                </div>
                                <Input
                                    id="footer"
                                    name="footer"
                                    placeholder="Ex: Sistema de Tickets CoreBot"
                                    value={config.footer}
                                    onChange={handleInputChange}
                                    disabled={!isPremium}
                                    className={`bg-zinc-900/50 border-zinc-800 text-white focus:ring-violet-500/50 placeholder:text-zinc-600 ${!isPremium ? 'opacity-50 cursor-not-allowed' : ''}`}
                                />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-[#0A0A0C] border border-zinc-800 rounded-xl overflow-hidden">
                        <CardHeader className="border-b border-zinc-800 bg-zinc-900/30">
                            <CardTitle className="text-white text-base">Configurações de Logs</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-5 p-6">
                            <div className="space-y-2">
                                <Label htmlFor="logsChannelId" className="text-zinc-300">ID do Canal de Logs</Label>
                                <Input
                                    id="logsChannelId"
                                    name="logsChannelId"
                                    placeholder="Ex: 123456789012345678"
                                    value={config.logsChannelId}
                                    onChange={handleInputChange}
                                    className="bg-zinc-900/50 border-zinc-800 text-white focus:ring-violet-500/50 placeholder:text-zinc-600 font-mono"
                                />
                                <p className="text-xs text-zinc-500">
                                    Copie o ID do canal onde deseja receber os transcripts dos tickets fechados.
                                    (Ative o Modo Desenvolvedor do Discord para copiar IDs)
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Preview Section */}
                <div className="space-y-6">
                    <div className="sticky top-6">
                        <Label className="text-zinc-400 text-xs uppercase font-bold tracking-wider mb-3 block">Pré-visualização em Tempo Real</Label>

                        <div className="bg-[#313338] rounded-lg p-4 border border-zinc-700/50 shadow-2xl">
                            <div className="flex gap-3">
                                <div className="w-10 h-10 rounded-full bg-violet-600 shrink-0 flex items-center justify-center text-white font-bold text-sm">Bot</div>
                                <div className="flex-1 space-y-1">
                                    <div className="flex items-center gap-2">
                                        <span className="text-white font-medium text-sm">CoreBot Tickets</span>
                                        <span className="bg-[#5865F2] text-white text-[10px] px-1.5 py-0.5 rounded flex items-center gap-1">
                                            <Check className="w-2 h-2" /> BOT
                                        </span>
                                    </div>

                                    {/* Embed Preview */}
                                    <div className="bg-[#2B2D31] rounded flex max-w-sm overflow-hidden border-l-4" style={{ borderLeftColor: config.color }}>
                                        <div className="p-4 space-y-3 w-full">
                                            <div className="space-y-2">
                                                <h4 className="text-white font-bold text-sm leading-snug">
                                                    {config.title || "🌌 Central de Tickets - CoreBot"}
                                                </h4>
                                                <p className="text-[#DBDEE1] text-xs whitespace-pre-wrap leading-relaxed">
                                                    {config.description || "Bem-vindo ao Sistema de Tickets!\n\nSelecione uma categoria abaixo..."}
                                                </p>
                                            </div>

                                            {/* Banner */}
                                            {(config.bannerUrl || "https://placehold.co/1200x400/1e1e2e/ffffff.png?text=CoreBot+Tickets&font=montserrat") && (
                                                <div className="rounded-lg overflow-hidden relative w-full aspect-2/1 bg-zinc-800 mt-2">
                                                    <img
                                                        src={config.bannerUrl || "https://placehold.co/1200x400/1e1e2e/ffffff.png?text=CoreBot+Tickets&font=montserrat"}
                                                        alt="Banner"
                                                        className="w-full h-full object-cover"
                                                        onError={(e) => {
                                                            (e.target as HTMLImageElement).style.display = 'none';
                                                        }}
                                                    />
                                                </div>
                                            )}

                                            <div className="flex items-center gap-2 mt-2">
                                                <div className="w-4 h-4 rounded-full bg-zinc-700"></div>
                                                <span className="text-[10px] text-zinc-400 font-medium">
                                                    {config.footer || "🌌 CoreBot - Explorando o Universo Juntos"}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Components Preview */}
                                    <div className="space-y-2 mt-1 max-w-sm">
                                        <div className="bg-[#2B2D31] p-2.5 rounded border border-zinc-700/50 flex items-center justify-between cursor-pointer hover:bg-[#35373C] transition-colors">
                                            <span className="text-zinc-400 text-sm">Selecione uma categoria...</span>
                                            <span className="text-zinc-500">▼</span>
                                        </div>

                                        {/* Button Preview (Visual simulation of what a button might look like if used) */}
                                        {/* <div className="bg-[#5865F2] hover:bg-[#4752C4] text-white px-4 py-2 rounded text-sm font-medium transition-colors cursor-pointer inline-flex items-center gap-2">
                                            <span>{config.buttonEmoji}</span>
                                            <span>{config.buttonText}</span>
                                        </div> */}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="mt-6 p-4 bg-violet-500/10 border border-violet-500/20 rounded-lg">
                            <h4 className="text-violet-300 font-medium text-sm mb-1 flex items-center gap-2">
                                <Settings className="w-4 h-4" />
                                Dica Pro
                            </h4>
                            <p className="text-zinc-400 text-xs">
                                As alterações feitas aqui atualizam o painel enviado pelo comando <code>/ticket-painel</code>.
                                Você pode reenviar o painel a qualquer momento para aplicar o novo visual.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </form>
    );
}
