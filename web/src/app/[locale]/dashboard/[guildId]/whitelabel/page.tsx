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
            <header className="text-center mb-8 w-full">
                <div className="inline-block px-3 py-1 border border-purple-500/30 bg-purple-500/10 rounded text-[10px] tracking-widest uppercase text-purple-300 mb-4 font-medium">
                    Plano Ultimate
                </div>
                <h1 className="text-4xl md:text-5xl font-serif font-medium text-white mb-4">
                    🏷️ Whitelabel
                </h1>
                <p className="text-zinc-400 text-lg max-w-2xl mx-auto">
                    Personalize o bot com o nome e avatar do seu servidor.
                </p>
            </header>

            <PlanGate feature="whitelabel" plan={plan}>
                <div className="w-full max-w-lg bg-[#0A0A0C] border border-white/10 rounded-2xl p-8 space-y-6">
                    {/* Preview */}
                    <div className="flex items-center gap-4 bg-white/5 rounded-xl p-4 border border-white/10">
                        <div className="w-12 h-12 rounded-full bg-linear-to-br from-purple-500/30 to-pink-500/30 border border-white/10 overflow-hidden flex items-center justify-center shrink-0">
                            {avatarUrl ? (
                                <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                            ) : (
                                <Bot className="w-6 h-6 text-purple-400" />
                            )}
                        </div>
                        <div>
                            <p className="text-white font-medium">
                                {botName || 'CoreBot'}
                                <span className="ml-1 text-[10px] bg-blue-500/20 text-blue-300 px-1.5 py-0.5 rounded font-medium">BOT</span>
                            </p>
                            <p className="text-zinc-500 text-sm">Olá! Como posso ajudar? 🤖</p>
                        </div>
                    </div>

                    {/* Bot Name */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-zinc-300 flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-purple-400" />
                            Nome do Bot
                        </label>
                        <input
                            type="text"
                            value={botName}
                            onChange={e => setBotName(e.target.value)}
                            maxLength={32}
                            placeholder="CoreBot"
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-zinc-600 focus:border-purple-500/50 focus:outline-none transition-colors"
                        />
                        <p className="text-[11px] text-zinc-500">Deixe vazio para usar o nome padrão.</p>
                    </div>

                    {/* Avatar Section */}
                    <div className="space-y-3">
                        <label className="text-sm font-medium text-zinc-300 flex items-center gap-2">
                            <ImageIcon className="w-4 h-4 text-purple-400" />
                            Avatar do Bot
                        </label>

                        {/* Mode Tabs */}
                        <div className="flex gap-1 bg-white/5 rounded-lg p-1 border border-white/10">
                            <button
                                type="button"
                                onClick={() => setAvatarMode('upload')}
                                className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all ${avatarMode === 'upload'
                                    ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                                    : 'text-zinc-400 hover:text-white'
                                    }`}
                            >
                                <Upload className="w-3.5 h-3.5" />
                                Upload
                            </button>
                            <button
                                type="button"
                                onClick={() => setAvatarMode('url')}
                                className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all ${avatarMode === 'url'
                                    ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                                    : 'text-zinc-400 hover:text-white'
                                    }`}
                            >
                                <Link className="w-3.5 h-3.5" />
                                URL
                            </button>
                        </div>

                        {/* Upload Mode */}
                        {avatarMode === 'upload' && (
                            <div className="space-y-3">
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
                                    className={`flex flex-col items-center justify-center gap-2 p-6 border-2 border-dashed rounded-xl cursor-pointer transition-all ${uploading
                                        ? 'border-purple-500/50 bg-purple-500/5'
                                        : 'border-white/10 hover:border-purple-500/30 hover:bg-white/5'
                                        }`}
                                >
                                    {uploading ? (
                                        <>
                                            <div className="w-8 h-8 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
                                            <span className="text-sm text-purple-300">Enviando para Cloudinary...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Upload className="w-8 h-8 text-zinc-500" />
                                            <span className="text-sm text-zinc-400">Clique para enviar uma imagem</span>
                                            <span className="text-[10px] text-zinc-600">PNG, JPG, GIF, WebP • Máx 5MB</span>
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
                                placeholder="https://exemplo.com/avatar.png"
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-zinc-600 focus:border-purple-500/50 focus:outline-none transition-colors"
                            />
                        )}

                        {/* Current Avatar Preview + Remove */}
                        {avatarUrl && (
                            <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-white/10">
                                <img src={avatarUrl} alt="Avatar atual" className="w-10 h-10 rounded-full object-cover border border-white/10" />
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs text-zinc-400 truncate">{avatarUrl}</p>
                                    <p className="text-[10px] text-emerald-400">✓ Avatar definido</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={handleRemoveAvatar}
                                    className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors"
                                    title="Remover avatar"
                                >
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        )}

                        <p className="text-[11px] text-zinc-500">Recomendado: imagem quadrada, mínimo 128x128px.</p>
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-sm text-center">
                            {error}
                        </div>
                    )}

                    {/* Save Button */}
                    <button
                        onClick={handleSave}
                        disabled={saving || uploading}
                        className="w-full bg-linear-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-medium py-3 rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        {saving ? (
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : saved ? (
                            <>✅ Salvo com sucesso!</>
                        ) : (
                            <>
                                <Save className="w-4 h-4" />
                                Salvar Configuração
                            </>
                        )}
                    </button>
                </div>
            </PlanGate>
        </div>
    );
}
