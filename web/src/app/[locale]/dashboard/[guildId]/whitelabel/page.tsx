'use client';

import { useState, useEffect, useRef } from 'react';
import { Bot, Upload, Save, Sparkles, ImageIcon, Link, X } from 'lucide-react';
import { usePlan, PlanGate } from '@/components/PlanGate';

interface Props {
    params: Promise<{ guildId: string }>;
}

export default function WhitelabelPage({ params }: Props) {
    const { plan, loading: planLoading } = usePlan();
    const [guildId, setGuildId] = useState('');
    const [botName, setBotName] = useState('');
    const [avatarUrl, setAvatarUrl] = useState('');
    const [avatarMode, setAvatarMode] = useState<'url' | 'upload'>('url');
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [saved, setSaved] = useState(false);
    const [error, setError] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        params.then(p => {
            setGuildId(p.guildId);
            fetch(`/api/guild/${p.guildId}/config`)
                .then(r => r.json())
                .then(config => {
                    setBotName(config.whitelabel_name || '');
                    setAvatarUrl(config.whitelabel_avatar_url || '');
                })
                .catch(() => { });
        });
    }, [params]);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            setError('Arquivo deve ser uma imagem (PNG, JPG, GIF, WebP)');
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            setError('Imagem muito grande (máx 5MB)');
            return;
        }

        setUploading(true);
        setError('');

        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('folder', 'corebot/whitelabel');

            const res = await fetch('/api/upload', {
                method: 'POST',
                body: formData
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Falha no upload');
            }

            const data = await res.json();
            setAvatarUrl(data.url);
        } catch (err: any) {
            setError(err.message || 'Erro no upload');
        }

        setUploading(false);
    };

    const handleSave = async () => {
        setSaving(true);
        setError('');
        try {
            const res = await fetch(`/api/guild/${guildId}/config`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    whitelabel_name: botName || null,
                    whitelabel_avatar_url: avatarUrl || null
                })
            });

            if (!res.ok) throw new Error('Falha ao salvar');

            setSaved(true);
            setTimeout(() => setSaved(false), 3000);
        } catch (err: any) {
            setError(err.message || 'Erro ao salvar');
        }
        setSaving(false);
    };

    const handleRemoveAvatar = () => {
        setAvatarUrl('');
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    return (
        <div className="space-y-8 flex flex-col items-center w-full max-w-7xl mx-auto px-4">
            <header className="text-center mb-10 w-full animate-in fade-in slide-in-from-bottom-4 duration-700">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 border border-purple-500/20 bg-purple-500/10 rounded-full text-xs font-bold tracking-widest uppercase text-purple-400 mb-6 shadow-[0_0_15px_rgba(168,85,247,0.1)]">
                    <Sparkles className="w-3.5 h-3.5" />
                    Plano Ultimate
                </div>
                <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-br from-white via-zinc-200 to-zinc-500 mb-4">
                    Whitelabel
                </h1>
                <p className="text-zinc-400 text-base md:text-lg max-w-2xl mx-auto font-medium">
                    Assuma a identidade do bot. Personalize perfeitamente a apresentação do assistente para o seu servidor.
                </p>
            </header>

            <PlanGate feature="whitelabel" plan={plan}>
                <div className="w-full max-w-lg bg-[#09090b] border border-white/5 shadow-2xl backdrop-blur-3xl rounded-3xl p-8 space-y-8 relative overflow-hidden group">
                    <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-transparent to-pink-500/5 opacity-50 pointer-events-none group-hover:opacity-100 transition-opacity duration-700" />
                    
                    <div className="relative z-10">
                        {/* Preview Glass Card */}
                        <div className="flex items-center gap-5 bg-zinc-900/40 backdrop-blur-md rounded-2xl p-5 border border-white/5 shadow-inner">
                            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-white/10 overflow-hidden flex items-center justify-center shrink-0 shadow-lg">
                                {avatarUrl ? (
                                    <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                                ) : (
                                    <Bot className="w-7 h-7 text-purple-400" />
                                )}
                            </div>
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <h3 className="text-white font-semibold tracking-tight text-lg">
                                        {botName || 'CoreBot'}
                                    </h3>
                                    <span className="text-[10px] bg-blue-500/10 border border-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full font-bold tracking-wider">APP</span>
                                </div>
                                <p className="text-zinc-500 text-sm">Pronto para auxiliar a comunidade.</p>
                            </div>
                        </div>

                        <div className="w-full h-px bg-gradient-to-r from-transparent via-white/10 to-transparent my-8" />

                        {/* Bot Name */}
                        <div className="space-y-3 mb-8">
                            <label className="text-sm font-semibold text-zinc-300 flex items-center gap-2">
                                Nome da Aplicação
                            </label>
                            <div className="relative group/input">
                                <input
                                    type="text"
                                    value={botName}
                                    onChange={e => setBotName(e.target.value)}
                                    maxLength={32}
                                    placeholder="Nome Personalizado"
                                    className="w-full bg-zinc-950/50 border border-white/10 rounded-xl px-4 py-3.5 text-white placeholder:text-zinc-600 focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/50 focus:outline-none transition-all shadow-inner"
                                />
                            </div>
                            <p className="text-xs text-zinc-500">Deixe vazio para manter a identidade original.</p>
                        </div>

                        {/* Avatar Section */}
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <label className="text-sm font-semibold text-zinc-300 flex items-center gap-2">
                                    Identidade Visual
                                </label>
                                {/* Mode Tabs */}
                                <div className="flex gap-1 bg-zinc-950/80 rounded-lg p-1 border border-white/5">
                                    <button
                                        type="button"
                                        onClick={() => setAvatarMode('upload')}
                                        className={`flex items-center justify-center gap-2 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${avatarMode === 'upload'
                                            ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30 shadow-sm'
                                            : 'text-zinc-400 hover:text-white'
                                            }`}
                                    >
                                        <Upload className="w-3.5 h-3.5" />
                                        Arquivo
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setAvatarMode('url')}
                                        className={`flex items-center justify-center gap-2 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${avatarMode === 'url'
                                            ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30 shadow-sm'
                                            : 'text-zinc-400 hover:text-white'
                                            }`}
                                    >
                                        <Link className="w-3.5 h-3.5" />
                                        URL
                                    </button>
                                </div>
                            </div>

                            {/* Upload Mode */}
                            {avatarMode === 'upload' && (
                                <div className="space-y-4">
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept="image/png,image/jpeg,image/gif,image/webp"
                                        onChange={handleFileUpload}
                                        className="hidden"
                                        id="avatar-upload"
                                    />
                                    <label
                                        htmlFor="avatar-upload"
                                        className={`flex flex-col items-center justify-center gap-3 p-8 border-2 border-dashed rounded-2xl cursor-pointer transition-all duration-300 group/dropzone ${uploading
                                            ? 'border-purple-500/50 bg-purple-500/5'
                                            : 'border-white/10 hover:border-purple-500/40 hover:bg-purple-500/5 hover:shadow-[0_0_30px_rgba(168,85,247,0.1)]'
                                            }`}
                                    >
                                        {uploading ? (
                                            <>
                                                <div className="w-10 h-10 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
                                                <span className="text-sm font-medium text-purple-300 mt-2">Processando envio...</span>
                                            </>
                                        ) : (
                                            <>
                                                <div className="p-3 bg-white/5 group-hover/dropzone:bg-purple-500/10 rounded-full transition-colors">
                                                    <Upload className="w-6 h-6 text-zinc-400 group-hover/dropzone:text-purple-400 transition-colors" />
                                                </div>
                                                <div className="text-center">
                                                    <span className="text-sm font-medium text-zinc-300 block">Selecione ou solte uma imagem</span>
                                                    <span className="text-xs text-zinc-500 mt-1 block">PNG, JPG, Static WebP (Recomendado 128x128)</span>
                                                </div>
                                            </>
                                        )}
                                    </label>
                                </div>
                            )}

                            {/* URL Mode */}
                            {avatarMode === 'url' && (
                                <input
                                    type="url"
                                    value={avatarUrl}
                                    onChange={e => setAvatarUrl(e.target.value)}
                                    placeholder="https://sua-empresa.com/logo.png"
                                    className="w-full bg-zinc-950/50 border border-white/10 rounded-xl px-4 py-3.5 text-white placeholder:text-zinc-600 focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/50 focus:outline-none transition-all shadow-inner"
                                />
                            )}

                            {/* Current Avatar Preview + Remove */}
                            {avatarUrl && (
                                <div className="flex items-center gap-4 p-4 bg-zinc-950/50 rounded-xl border border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.05)]">
                                    <div className="relative">
                                        <img src={avatarUrl} alt="Avatar atual" className="w-12 h-12 rounded-full object-cover border border-white/10" />
                                        <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-[#09090b] rounded-full flex items-center justify-center">
                                           <div className="w-1.5 h-1.5 bg-white rounded-full" />
                                        </div>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-emerald-400">Ativo</p>
                                        <p className="text-xs text-zinc-500 truncate" title={avatarUrl}>{avatarUrl}</p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={handleRemoveAvatar}
                                        className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors border border-red-500/10"
                                        title="Remover Identidade"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Error Message */}
                        {error && (
                            <div className="mt-6 p-4 bg-red-500/10 border border-red-500/20 text-red-300 rounded-xl text-sm font-medium flex items-center justify-center gap-2">
                                <X className="w-4 h-4" />
                                {error}
                            </div>
                        )}

                        {/* Save Button */}
                        <button
                            onClick={handleSave}
                            disabled={saving || uploading}
                            className="mt-8 w-full group relative flex justify-center items-center gap-2 overflow-hidden rounded-xl bg-purple-600 px-8 py-3.5 font-bold text-white shadow-[0_0_20px_rgba(168,85,247,0.3)] transition-all hover:bg-purple-500 hover:shadow-[0_0_30px_rgba(168,85,247,0.5)] active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none"
                        >
                            <div className="absolute inset-0 flex h-full w-full justify-center [transform:skew(-12deg)_translateX(-100%)] group-hover:duration-1000 group-hover:[transform:skew(-12deg)_translateX(100%)]">
                                <div className="relative h-full w-8 bg-white/20" />
                            </div>
                            
                            {saving ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : saved ? (
                                <div className="flex items-center gap-2 text-emerald-100">
                                    <Save className="w-4 h-4" />
                                    Substituição Aplicada
                                </div>
                            ) : (
                                <div className="flex items-center gap-2">
                                    <Save className="w-4 h-4 group-hover:-translate-y-0.5 transition-transform" />
                                    Confirmar Identidade
                                </div>
                            )}
                        </button>
                    </div>
                </div>
            </PlanGate>
        </div>
    );
}
