'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Wand2, Save, Play, Loader2, Code2, Trash2, Power, Bot, Sparkles, MessageSquare, Terminal } from 'lucide-react';
import { toast } from 'sonner';
import { createCustomCommandAction, deleteCustomCommandAction, toggleCustomCommandAction, generateCommandAction } from '@/actions/command-actions';
import { useRouter } from 'next/navigation';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { clsx } from 'clsx';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';

interface CommandGeneratorProps {
    guildId: string;
    userId: string;
    existingCommands: any[];
}

export function CommandGenerator({ guildId, userId, existingCommands }: CommandGeneratorProps) {
    const [prompt, setPrompt] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedCommand, setGeneratedCommand] = useState<any>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [commandToDelete, setCommandToDelete] = useState<string | null>(null);
    const router = useRouter();

    async function handleGenerate() {
        if (!prompt.trim()) return;
        setIsGenerating(true);
        try {
            const result = await generateCommandAction(prompt, `Guild ID: ${guildId}`);
            if (result.schema) {
                setGeneratedCommand(result.schema);
                toast.success('Comando gerado com sucesso!');
            } else {
                toast.error(result.error);
            }
        } catch (error) {
            toast.error('Erro ao conectar com a IA.');
        } finally {
            setIsGenerating(false);
        }
    }

    async function handleSave() {
        if (!generatedCommand) return;
        setIsSaving(true);
        try {
            const formData = new FormData();
            formData.append('guildId', guildId);
            formData.append('name', generatedCommand.name);
            formData.append('description', generatedCommand.description);
            formData.append('response', generatedCommand.response || '');
            formData.append('actions', JSON.stringify(generatedCommand.actions));
            formData.append('options', JSON.stringify(generatedCommand.options || []));
            formData.append('userId', userId);

            const result = await createCustomCommandAction({}, formData);
            if (result.success) {
                toast.success('Comando salvo e registrado no Discord!');
                setGeneratedCommand(null);
                setPrompt('');
                router.refresh();
            } else {
                toast.error(result.error);
            }
        } catch (error) {
            toast.error('Erro ao salvar comando.');
        } finally {
            setIsSaving(false);
        }
    }

    function handleDelete(id: string) {
        setCommandToDelete(id);
    }

    async function confirmDelete() {
        if (!commandToDelete) return;
        const result = await deleteCustomCommandAction(commandToDelete, guildId);
        if (result.success) {
            toast.success('Comando excluído.');
            router.refresh();
        } else {
            toast.error('Erro ao excluir.');
        }
        setCommandToDelete(null);
    }

    async function handleToggle(id: string, currentStatus: boolean) {
        const result = await toggleCustomCommandAction(id, !currentStatus, guildId);
        if (result.success) {
            toast.success('Status atualizado.');
            router.refresh();
        }
    }

    return (
        <div className="space-y-6 w-full max-w-4xl mx-auto font-sans">
            <ConfirmDialog 
                isOpen={!!commandToDelete}
                title="Excluir Comando"
                description="Tem certeza que deseja apagar este comando personalizado da memória da inteligência artificial? Essa ação é irreversível."
                confirmLabel="Apagar Comando"
                onConfirm={confirmDelete}
                onCancel={() => setCommandToDelete(null)}
            />

            {/* ════════════════════════════════════════════════════
                AI GENERATOR SECTION
               ════════════════════════════════════════════════════ */}
            <div className="bg-[#0A0A0C] border border-violet-500/30 rounded-3xl p-8 relative overflow-hidden group hover:border-violet-500/50 transition-all duration-500">
                {/* Glow Effect */}
                <div className="absolute inset-0 bg-linear-to-b from-violet-500/10 to-transparent opacity-50 pointer-events-none"></div>

                <div className="relative z-10 space-y-8">
                    <div className="flex items-center gap-6 mb-8">
                        <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center bg-linear-to-br from-violet-500/20 to-indigo-500/20 group-hover:scale-105 transition-transform duration-500 shadow-lg shadow-violet-500/10">
                            <Bot className="text-violet-400 w-8 h-8" />
                        </div>
                        <div>
                            <h1 className="text-3xl md:text-4xl font-serif font-medium text-white">Criador de Comandos</h1>
                            <p className="text-sm text-zinc-500 font-medium mt-1">Descreva o comando e a IA cria a lógica completa para você.</p>
                        </div>
                    </div>

                    <div className="h-px w-full bg-white/5"></div>

                    <div className="bg-[#13111C] rounded-2xl p-6 border border-white/5 backdrop-blur-md space-y-4 shadow-inner">
                        <Label className="text-base font-medium text-zinc-300 flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-violet-400" />
                            Descrição do Comando
                        </Label>

                        <div className="relative">
                            <Textarea
                                value={prompt}
                                onChange={(e) => setPrompt(e.target.value)}
                                placeholder="Ex: Crie um comando /vip que dê o cargo 'Membro VIP' para quem usar e mande uma mensagem de boas-vindas com um embed bonito."
                                className="bg-black/20 border-white/10 text-white placeholder:text-zinc-600 focus-visible:ring-0 focus:border-violet-500/50 min-h-[120px] text-lg resize-none rounded-xl p-4 transition-all"
                            />
                            <div className="absolute bottom-4 right-4 text-xs text-zinc-600">
                                Powered by LLM
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 pt-2">
                            {generatedCommand && (
                                <Button
                                    variant="outline"
                                    onClick={() => setGeneratedCommand(null)}
                                    className="border-white/10 hover:bg-white/5 text-zinc-300 h-12 px-6 rounded-xl bg-transparent"
                                >
                                    Cancelar
                                </Button>
                            )}

                            {!generatedCommand ? (
                                <Button
                                    onClick={handleGenerate}
                                    disabled={isGenerating || !prompt.trim()}
                                    className="h-12 px-8 rounded-xl bg-white text-black hover:bg-zinc-200 font-bold shadow-[0_0_20px_-5px_rgba(255,255,255,0.3)] transition-all"
                                >
                                    {isGenerating ? (
                                        <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Gerando...</>
                                    ) : (
                                        <><Wand2 className="w-4 h-4 mr-2" /> Gerar com IA</>
                                    )}
                                </Button>
                            ) : (
                                <Button
                                    onClick={handleSave}
                                    disabled={isSaving}
                                    className="h-12 px-8 rounded-xl bg-green-500 hover:bg-green-600 text-white font-bold shadow-[0_0_20px_-5px_rgba(34,197,94,0.3)] transition-all"
                                >
                                    {isSaving ? (
                                        <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Salvando...</>
                                    ) : (
                                        <><Save className="w-4 h-4 mr-2" /> Salvar Comando</>
                                    )}
                                </Button>
                            )}
                        </div>
                    </div>

                    {/* Preview Section */}
                    {generatedCommand && (
                        <div className="animate-in fade-in slide-in-from-top-4 duration-500">
                            <div className="bg-[#13111C] border border-violet-500/30 rounded-2xl p-6 relative overflow-hidden shadow-lg shadow-violet-900/10">
                                <div className="absolute top-0 left-0 w-1 h-full bg-violet-500" />
                                <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-3">
                                    <div className="p-2 rounded-lg bg-violet-500/10">
                                        <Code2 className="w-5 h-5 text-violet-400" />
                                    </div>
                                    Preview do Resultado
                                </h3>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <Label className="text-zinc-500 text-xs uppercase tracking-wider font-semibold">Comando</Label>
                                        <div className="text-white font-mono bg-black/40 border border-white/5 px-4 py-3 rounded-xl flex items-center gap-2">
                                            <span className="text-violet-500">/</span>{generatedCommand.name}
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-zinc-500 text-xs uppercase tracking-wider font-semibold">Descrição</Label>
                                        <div className="text-zinc-300 bg-black/40 border border-white/5 px-4 py-3 rounded-xl truncate">
                                            {generatedCommand.description}
                                        </div>
                                    </div>
                                    <div className="md:col-span-2 space-y-3">
                                        <Label className="text-zinc-500 text-xs uppercase tracking-wider font-semibold flex items-center justify-between">
                                            Ações Executadas
                                            <Badge variant="outline" className="text-[10px] h-5 border-white/10 text-zinc-400">{generatedCommand.actions.length} passos</Badge>
                                        </Label>
                                        <div className="space-y-2 bg-black/20 p-4 rounded-xl border border-white/5">
                                            {generatedCommand.actions.map((action: any, i: number) => (
                                                <div key={i} className="flex items-center gap-3 text-sm text-zinc-300 bg-white/5 p-3 rounded-lg border border-white/5 transition-colors hover:bg-white/10">
                                                    <div className="w-6 h-6 rounded bg-violet-500/20 flex items-center justify-center text-xs font-mono text-violet-300 border border-violet-500/20">
                                                        {i + 1}
                                                    </div>
                                                    <Badge variant="secondary" className="bg-violet-500/10 text-violet-300 hover:bg-violet-500/20 border-0">
                                                        {action.type}
                                                    </Badge>
                                                    <span className="truncate flex-1 font-mono text-xs opacity-80">
                                                        {action.content || (action.role_name ? `Role: ${action.role_name}` : JSON.stringify(action))}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* ════════════════════════════════════════════════════
                COMMAND LIST SECTION
               ════════════════════════════════════════════════════ */}
            {existingCommands.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in from-bottom-4 duration-700 delay-100">
                    {existingCommands.map((cmd) => (
                        <div key={cmd.id} className="bg-[#0A0A0C] border border-white/5 rounded-2xl p-5 hover:border-violet-500/30 transition-all group relative overflow-hidden">
                            <div className="flex flex-row items-center justify-between mb-3">
                                <div className="text-lg font-medium text-white flex items-center gap-2 font-mono">
                                    <span className="text-violet-500/70 group-hover:text-violet-400 transition-colors">/</span>
                                    {cmd.name}
                                </div>
                                <Switch
                                    checked={cmd.enabled}
                                    onCheckedChange={(c) => handleToggle(cmd.id, c)}
                                    className="data-[state=checked]:bg-violet-500"
                                />
                            </div>

                            <p className="text-sm text-zinc-500 mb-4 line-clamp-2 h-10 leading-relaxed">
                                {cmd.description}
                            </p>

                            <div className="flex items-center justify-between pt-4 border-t border-white/5">
                                <div className="flex gap-2">
                                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white/5 border border-white/5 text-xs text-zinc-400">
                                        <Terminal className="w-3 h-3" />
                                        <span>{cmd.actions.length} ações</span>
                                    </div>
                                </div>
                                <Button
                                    size="icon"
                                    variant="ghost"
                                    onClick={() => handleDelete(cmd.id)}
                                    className="text-zinc-600 hover:text-red-400 hover:bg-red-500/10 transition-colors w-8 h-8 rounded-lg"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {existingCommands.length === 0 && !generatedCommand && (
                <div className="text-center py-12 rounded-3xl border border-dashed border-white/10 bg-white/5 flex flex-col items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-zinc-800/50 flex items-center justify-center">
                        <Terminal className="w-6 h-6 text-zinc-500" />
                    </div>
                    <div className="max-w-xs">
                        <h3 className="text-white font-medium mb-1">Nenhum comando criado</h3>
                        <p className="text-sm text-zinc-500">Use a inteligência artificial acima para criar seu primeiro comando personalizado.</p>
                    </div>
                </div>
            )}
        </div>
    );
}
