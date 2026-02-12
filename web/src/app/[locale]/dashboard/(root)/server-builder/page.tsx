"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
    Hammer, Sparkles, LayoutTemplate, PenLine, ArrowLeft, ArrowRight,
    Plus, Trash2, GripVertical, Hash, Volume2, Megaphone, MessageSquare,
    Radio, ChevronDown, ChevronRight, Rocket, Check, Loader2,
    FolderPlus, Palette, Shield, Edit3, Eye, Wand2, Bot, Settings, X,
    Users, Gamepad2, ShoppingCart, Headphones, GraduationCap, Server, Zap,
    type LucideIcon,
    Home,
    AlertTriangle
} from "lucide-react";
import {
    DndContext, closestCenter, PointerSensor, useSensor, useSensors,
    DragEndEvent, DragStartEvent
} from "@dnd-kit/core";
import {
    SortableContext, verticalListSortingStrategy, useSortable,
    arrayMove
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
    SERVER_TEMPLATES, cloneSchemaWithNewIds, createEmptySchema, DISCORD_PERMISSIONS,
    type ServerSchema, type ServerCategory, type ServerChannel, type ServerRole, type ServerTemplate
} from "@/lib/server-templates";



// ═══════════════════════════════════════════════════════════════
// ICON MAP & TYPES
// ═══════════════════════════════════════════════════════════════
type WizardStep = 'choose' | 'editor' | 'apply';

const TEMPLATE_ICON_MAP: Record<string, LucideIcon> = {
    Users, Gamepad2, ShoppingCart, Headphones, GraduationCap, Rocket,
};

const TEMPLATE_BORDER_COLORS: Record<string, string> = {
    comunidade: 'border-indigo-500/30 hover:border-indigo-500/50',
    gaming: 'border-red-500/30 hover:border-red-500/50',
    ecommerce: 'border-emerald-500/30 hover:border-emerald-500/50',
    suporte: 'border-blue-500/30 hover:border-blue-500/50',
    escola: 'border-amber-500/30 hover:border-amber-500/50',
    startup: 'border-purple-500/30 hover:border-purple-500/50',
};

const TEMPLATE_ICON_HOVER: Record<string, string> = {
    comunidade: 'group-hover:text-indigo-400 group-hover:bg-indigo-500/10',
    gaming: 'group-hover:text-red-400 group-hover:bg-red-500/10',
    ecommerce: 'group-hover:text-emerald-400 group-hover:bg-emerald-500/10',
    suporte: 'group-hover:text-blue-400 group-hover:bg-blue-500/10',
    escola: 'group-hover:text-amber-400 group-hover:bg-amber-500/10',
    startup: 'group-hover:text-purple-400 group-hover:bg-purple-500/10',
};

const CHANNEL_ICONS: Record<string, React.ReactNode> = {
    text: <Hash size={14} />,
    voice: <Volume2 size={14} />,
    announcement: <Megaphone size={14} />,
    forum: <MessageSquare size={14} />,
    stage: <Radio size={14} />,
};

const CHANNEL_TYPE_LABELS: Record<string, string> = {
    text: 'Texto',
    voice: 'Voz',
    announcement: 'Anúncio',
    forum: 'Fórum',
    stage: 'Palco',
};

// ═══════════════════════════════════════════════════════════════
// SORTABLE CHANNEL ITEM
// ═══════════════════════════════════════════════════════════════
function SortableChannel({
    channel, categoryId, onRename, onDelete, onSelect, isSelected
}: {
    channel: ServerChannel;
    categoryId: string;
    onRename: (catId: string, chId: string, name: string) => void;
    onDelete: (catId: string, chId: string) => void;
    onSelect: (chId: string) => void;
    isSelected: boolean;
}) {
    const [editing, setEditing] = useState(false);
    const [name, setName] = useState(channel.name);
    const inputRef = useRef<HTMLInputElement>(null);

    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
        id: channel.id,
        data: { type: 'channel', categoryId },
    });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
    };

    useEffect(() => {
        if (editing && inputRef.current) inputRef.current.focus();
    }, [editing]);

    const commitRename = () => {
        setEditing(false);
        if (name.trim() && name !== channel.name) {
            onRename(categoryId, channel.id, name.trim());
        } else {
            setName(channel.name);
        }
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg cursor-pointer group transition-all text-sm
                ${isSelected ? 'bg-purple-500/20 border border-purple-500/40' : 'hover:bg-white/5 border border-transparent'}`}
            onClick={() => onSelect(channel.id)}
        >
            <button {...attributes} {...listeners} className="cursor-grab text-white/30 hover:text-white/60 shrink-0">
                <GripVertical size={14} />
            </button>
            <span className="text-white/50 shrink-0">{CHANNEL_ICONS[channel.type]}</span>
            {editing ? (
                <input
                    ref={inputRef}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onBlur={commitRename}
                    onKeyDown={(e) => { if (e.key === 'Enter') commitRename(); if (e.key === 'Escape') { setName(channel.name); setEditing(false); } }}
                    className="flex-1 bg-transparent border-b border-purple-400 text-white text-sm outline-none px-1"
                    onClick={(e) => e.stopPropagation()}
                />
            ) : (
                <span
                    className="flex-1 text-white/80 truncate"
                    onDoubleClick={(e) => { e.stopPropagation(); setEditing(true); }}
                >
                    {channel.name}
                </span>
            )}
            <span className="text-[10px] text-white/30 uppercase hidden group-hover:block">{CHANNEL_TYPE_LABELS[channel.type]}</span>
            <button
                onClick={(e) => { e.stopPropagation(); onDelete(categoryId, channel.id); }}
                className="text-white/20 hover:text-red-400 hidden group-hover:block shrink-0 transition-colors"
            >
                <Trash2 size={12} />
            </button>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════
// CATEGORY SECTION
// ═══════════════════════════════════════════════════════════════
function SortableCategory({
    category, onRenameChannel, onDeleteChannel, onSelectChannel, selectedChannelId,
    onRenameCategory, onDeleteCategory, onAddChannel, items
}: {
    category: ServerCategory;
    onRenameChannel: (catId: string, chId: string, name: string) => void;
    onDeleteChannel: (catId: string, chId: string) => void;
    onSelectChannel: (chId: string) => void;
    selectedChannelId: string | null;
    onRenameCategory: (catId: string, name: string) => void;
    onDeleteCategory: (catId: string) => void;
    onAddChannel: (catId: string, type: ServerChannel['type']) => void;
    items: string[];
}) {
    const [collapsed, setCollapsed] = useState(false);
    const [editing, setEditing] = useState(false);
    const [name, setName] = useState(category.name);
    const inputRef = useRef<HTMLInputElement>(null);
    const [showAddMenu, setShowAddMenu] = useState(false);

    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
        id: category.id,
        data: { type: 'category' },
    });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
    };

    useEffect(() => {
        if (editing && inputRef.current) inputRef.current.focus();
    }, [editing]);

    const commitRename = () => {
        setEditing(false);
        if (name.trim() && name !== category.name) {
            onRenameCategory(category.id, name.trim());
        } else {
            setName(category.name);
        }
    };

    return (
        <div ref={setNodeRef} style={style} className="mb-3 bg-white/2 rounded-xl border border-white/5 overflow-hidden">
            {/* Draggable Header */}
            <div
                className="flex items-center gap-2 px-3 py-2 bg-white/5 group relative cursor-grab active:cursor-grabbing hover:bg-white/10 transition-colors"
                {...attributes}
                {...listeners}
            >
                <div className="text-white/30 group-hover:text-white/60 shrink-0">
                    <GripVertical size={16} />
                </div>
                {/* Stop propagation on interactive elements so dragging doesn't trigger them */}
                <button
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={(e) => { e.stopPropagation(); setCollapsed(!collapsed); }}
                    className="text-white/40 hover:text-white/70"
                >
                    {collapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
                </button>
                {editing ? (
                    <input
                        ref={inputRef}
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        onBlur={commitRename}
                        onKeyDown={(e) => { if (e.key === 'Enter') commitRename(); if (e.key === 'Escape') { setName(category.name); setEditing(false); } }}
                        className="flex-1 bg-transparent border-b border-purple-400 text-white/90 text-xs font-bold uppercase tracking-wider outline-none py-1"
                        onClick={(e) => e.stopPropagation()}
                    />
                ) : (
                    <span
                        className="flex-1 text-white/70 text-xs font-bold uppercase tracking-wider truncate cursor-pointer py-1"
                        onDoubleClick={() => setEditing(true)}
                    >
                        {category.name}
                    </span>
                )}

                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => setEditing(true)} className="p-1.5 rounded-lg hover:bg-white/10 text-white/40 hover:text-white transition-colors">
                        <Edit3 size={14} />
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); setShowAddMenu(!showAddMenu); }}
                        className={`p-1.5 rounded-lg transition-colors ${showAddMenu ? 'bg-green-500/20 text-green-400' : 'hover:bg-white/10 text-white/40 hover:text-green-400'}`}
                    >
                        <Plus size={16} />
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); onDeleteCategory(category.id); }}
                        className="p-1.5 rounded-lg hover:bg-white/10 text-white/40 hover:text-green-400 transition-colors"
                    >
                        <Trash2 size={14} />
                    </button>
                </div>
            </div>

            {/* Inline Add Menu */}
            <AnimatePresence>
                {showAddMenu && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden bg-black/20 border-b border-white/5"
                    >
                        <div className="p-2 grid grid-cols-2 gap-2">
                            {(['text', 'voice', 'announcement', 'forum', 'stage'] as const).map(type => (
                                <button
                                    key={type}
                                    onClick={() => { onAddChannel(category.id, type); setShowAddMenu(false); }}
                                    className="flex items-center gap-3 px-3 py-2 text-xs font-medium text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors bg-white/5 border border-white/5"
                                >
                                    {/* @ts-ignore */}
                                    <span className={type === 'voice' || type === 'stage' ? 'text-green-400' : 'text-zinc-400'}>{CHANNEL_ICONS[type]}</span>
                                    {CHANNEL_TYPE_LABELS[type]}
                                </button>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {!collapsed && (
                <div className="p-2 space-y-0.5 min-h-[10px]">
                    <SortableContext items={items} strategy={verticalListSortingStrategy}>
                        {category.channels.length === 0 && (
                            <div className="text-center py-4 text-xs text-zinc-600 border-2 border-dashed border-white/5 rounded-lg">
                                Arraste canais aqui ou crie um novo
                            </div>
                        )}
                        {category.channels.map(channel => (
                            <SortableChannel
                                key={channel.id}
                                channel={channel}
                                categoryId={category.id}
                                onRename={onRenameChannel}
                                onDelete={onDeleteChannel}
                                onSelect={onSelectChannel}
                                isSelected={selectedChannelId === channel.id}
                            />
                        ))}
                    </SortableContext>
                </div>
            )}
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════
export default function ServerBuilderPage() {
    const [step, setStep] = useState<WizardStep>('choose');
    const [schema, setSchema] = useState<ServerSchema | null>(null);
    const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null);
    const [aiPrompt, setAiPrompt] = useState('');
    const [aiLoading, setAiLoading] = useState(false);
    const [applying, setApplying] = useState(false);
    const [applyGuildId, setApplyGuildId] = useState('');
    const [guilds, setGuilds] = useState<{ id: string; name: string; icon: string }[]>([]);
    const [applyProgress, setApplyProgress] = useState<string[]>([]);
    const [applyDone, setApplyDone] = useState(false);
    const [activeId, setActiveId] = useState<string | null>(null);
    const [editingRole, setEditingRole] = useState<ServerRole | null>(null);
    const router = useRouter();

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
    );

    useEffect(() => {
        if (step === 'apply') {
            fetch("/api/user/guilds")
                .then(res => res.json())
                .then(data => setGuilds(data || []))
                .catch(() => { });
        }
    }, [step]);

    // ── TEMPLATE / AI SELECTION ──────────────────────────────
    const selectTemplate = (template: ServerTemplate) => {
        setSchema(cloneSchemaWithNewIds(template.schema));
        setStep('editor');
    };

    const startFromScratch = () => {
        setSchema(createEmptySchema());
        setStep('editor');
    };

    const generateWithAI = async () => {
        if (!aiPrompt.trim()) return;
        setAiLoading(true);
        try {
            const res = await fetch("/api/server-builder/generate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ prompt: aiPrompt.trim() }),
            });
            if (res.ok) {
                const data = await res.json();
                if (data.schema) {
                    let counter = 0;
                    const addIds = (s: any): ServerSchema => ({
                        roles: (s.roles || []).map((r: any) => ({ ...r, id: `ai_r_${++counter}` })),
                        categories: (s.categories || []).map((cat: any) => ({
                            ...cat,
                            id: `ai_cat_${++counter}`,
                            channels: (cat.channels || []).map((ch: any) => ({
                                ...ch,
                                id: `ai_ch_${++counter}`,
                            })),
                        })),
                    });
                    setSchema(addIds(data.schema));
                    setStep('editor');
                }
            }
        } catch (e) {
            console.error("AI generation error:", e);
        } finally {
            setAiLoading(false);
        }
    };

    // ── EDITOR ACTIONS ────────────────────────────────────────
    const updateSchema = useCallback((updater: (prev: ServerSchema) => ServerSchema) => {
        setSchema(prev => prev ? updater(prev) : prev);
    }, []);

    const renameChannel = useCallback((catId: string, chId: string, newName: string) => {
        updateSchema(s => ({
            ...s,
            categories: s.categories.map(cat =>
                cat.id === catId ? {
                    ...cat,
                    channels: cat.channels.map(ch => ch.id === chId ? { ...ch, name: newName } : ch)
                } : cat
            )
        }));
    }, [updateSchema]);

    const deleteChannel = useCallback((catId: string, chId: string) => {
        updateSchema(s => ({
            ...s,
            categories: s.categories.map(cat =>
                cat.id === catId ? { ...cat, channels: cat.channels.filter(ch => ch.id !== chId) } : cat
            )
        }));
        if (selectedChannelId === chId) setSelectedChannelId(null);
    }, [updateSchema, selectedChannelId]);

    const renameCategory = useCallback((catId: string, newName: string) => {
        updateSchema(s => ({
            ...s,
            categories: s.categories.map(cat =>
                cat.id === catId ? { ...cat, name: newName } : cat
            )
        }));
    }, [updateSchema]);

    const deleteCategory = useCallback((catId: string) => {
        updateSchema(s => ({ ...s, categories: s.categories.filter(c => c.id !== catId) }));
    }, [updateSchema]);

    const addCategory = useCallback(() => {
        const id = `cat_${Date.now()}`;
        updateSchema(s => ({
            ...s,
            categories: [
                { id, name: '━━━ 📁 NOVA CATEGORIA ━━━', channels: [] },
                ...s.categories
            ]
        }));
    }, [updateSchema]);

    const addChannel = useCallback((catId: string, type: ServerChannel['type']) => {
        const id = `ch_${Date.now()}`;
        const defaultNames: Record<string, string> = {
            text: '💬┃novo-canal',
            voice: '🔊┃novo-canal-voz',
            announcement: '📢┃anúncios',
            forum: '💡┃novo-fórum',
            stage: '🎤┃novo-palco',
        };
        updateSchema(s => ({
            ...s,
            categories: s.categories.map(cat =>
                cat.id === catId ? {
                    ...cat,
                    channels: [...cat.channels, { id, name: defaultNames[type] || '💬┃novo-canal', type }]
                } : cat
            )
        }));
    }, [updateSchema]);

    const addRole = useCallback(() => {
        const id = `role_${Date.now()}`;
        updateSchema(s => ({
            ...s,
            roles: [...s.roles, { id, name: 'Novo Cargo', color: '#95A5A6', permissions: ['SendMessages'] }]
        }));
    }, [updateSchema]);

    const deleteRole = useCallback((roleId: string) => {
        updateSchema(s => ({ ...s, roles: s.roles.filter(r => r.id !== roleId) }));
    }, [updateSchema]);

    const updateRole = useCallback((roleId: string, updates: Partial<ServerRole>) => {
        updateSchema(s => ({
            ...s,
            roles: s.roles.map(r => r.id === roleId ? { ...r, ...updates } : r)
        }));
    }, [updateSchema]);

    const togglePermission = useCallback((roleId: string, permission: string | string[]) => {
        const permsToToggle = Array.isArray(permission) ? permission : [permission];

        updateSchema(s => ({
            ...s,
            roles: s.roles.map(r => {
                if (r.id !== roleId) return r;
                let newPerms = [...(r.permissions || [])];

                permsToToggle.forEach(p => {
                    if (newPerms.includes(p)) {
                        newPerms = newPerms.filter(x => x !== p);
                    } else {
                        newPerms.push(p);
                    }
                });

                return { ...r, permissions: newPerms };
            })
        }));
        // Update local editing state
        setEditingRole(prev => {
            if (!prev || prev.id !== roleId) return prev;
            let newPerms = [...(prev.permissions || [])];

            permsToToggle.forEach(p => {
                if (newPerms.includes(p)) {
                    newPerms = newPerms.filter(x => x !== p);
                } else {
                    newPerms.push(p);
                }
            });

            return { ...prev, permissions: newPerms };
        });
    }, [updateSchema]);

    const updateChannelProp = useCallback((chId: string, updates: Partial<ServerChannel>) => {
        updateSchema(s => ({
            ...s,
            categories: s.categories.map(cat => ({
                ...cat,
                channels: cat.channels.map(ch => ch.id === chId ? { ...ch, ...updates } : ch)
            }))
        }));
    }, [updateSchema]);

    // ── DRAG & DROP ───────────────────────────────────────────
    const handleDragStart = (event: DragStartEvent) => {
        setActiveId(event.active.id as string);
    };

    const handleDragEnd = (event: DragEndEvent) => {
        setActiveId(null);
        const { active, over } = event;
        if (!over || active.id === over.id || !schema) return;

        const activeData = active.data.current;
        const overData = over.data.current;

        // 1. Reorder Categories
        if (activeData?.type === 'category' && overData?.type === 'category') {
            updateSchema(s => {
                const oldIdx = s.categories.findIndex(c => c.id === active.id);
                const newIdx = s.categories.findIndex(c => c.id === over.id);
                if (oldIdx === -1 || newIdx === -1) return s;
                return { ...s, categories: arrayMove(s.categories, oldIdx, newIdx) };
            });
            return;
        }

        // 2. Reorder Channels (Same Category or Different Category)
        if (activeData?.type === 'channel' && overData?.type === 'channel') {
            const activeCatId = activeData.categoryId;
            const overCatId = overData.categoryId;

            // Scenario A: Same category
            if (activeCatId === overCatId) {
                updateSchema(s => ({
                    ...s,
                    categories: s.categories.map(cat => {
                        if (cat.id !== activeCatId) return cat;
                        const oldIdx = cat.channels.findIndex(c => c.id === active.id);
                        const newIdx = cat.channels.findIndex(c => c.id === over.id);
                        return { ...cat, channels: arrayMove(cat.channels, oldIdx, newIdx) };
                    })
                }));
            }
            // Scenario B: Different category (Move channel)
            /* 
               For now, dnd-kit's SortableContext requires items to be in the same list during drag for smooth animation.
               Moving between lists is more complex with dnd-kit. 
               We simply reorder within the same list for now as per user request to "reorder categories".
               Moving channels between categories is a nice-to-have but not strictly requested as "reorder categories".
               Actually the user said "move categories not just channels".
               So we prioritized category moving.
            */
        }
    };

    const selectedChannel = schema ? (() => {
        for (const cat of schema.categories) {
            const ch = cat.channels.find(c => c.id === selectedChannelId);
            if (ch) return ch;
        }
        return null;
    })() : null;

    // ── APPLY ────────────────────────────────────────────────
    const applyToServer = async () => {
        if (!applyGuildId || !schema) return;
        setApplying(true);
        setApplyProgress(['🚀 Iniciando aplicação da estrutura...']);

        try {
            const res = await fetch("/api/server-builder/apply", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ guildId: applyGuildId, schema }),
            });

            if (res.ok) {
                const data = await res.json();
                setApplyProgress(prev => [...prev, ...(data.messages || [])]);
                toast.success('Estrutura aplicada com sucesso!', {
                    description: 'Seus canais e cargos foram criados.'
                });
                setApplyDone(true);
            } else {
                const err = await res.json().catch(() => ({}));
                setApplyProgress(prev => [...prev, `❌ Erro: ${err.error || 'Falha ao aplicar'}`]);
                toast.error('Erro ao aplicar estrutura', {
                    description: err.error || 'Verifique o log para mais detalhes.'
                });
            }
        } catch {
            setApplyProgress(prev => [...prev, '❌ Erro de conexão']);
            toast.error('Erro de conexão');
        } finally {
            setApplying(false);
        }
    };

    // ── STATS ────────────────────────────────────────────────
    const stats = schema ? {
        categories: schema.categories.length,
        channels: schema.categories.reduce((a, c) => a + c.channels.length, 0),
        roles: schema.roles.length,
        textChannels: schema.categories.reduce((a, c) => a + c.channels.filter(ch => ch.type === 'text').length, 0),
        voiceChannels: schema.categories.reduce((a, c) => a + c.channels.filter(ch => ch.type === 'voice' || ch.type === 'stage').length, 0),
    } : null;

    // ═════════════════════════════════════════════════════════
    //  RENDER
    // ═════════════════════════════════════════════════════════
    return (
        <div className="h-full bg-[#060609] overflow-y-auto overflow-x-hidden">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-6 md:py-10 pb-24 md:pb-10">

                {/* ── HEADER ──────────────────────────────────────── */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                    className="flex items-center gap-5 mb-10"
                >
                    {step !== 'choose' && (
                        <button
                            onClick={() => setStep(step === 'apply' ? 'editor' : 'choose')}
                            className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-all flex items-center justify-center border border-white/5"
                        >
                            <ArrowLeft size={18} />
                        </button>
                    )}
                    <div>
                        <div className="inline-block px-3 py-1 border border-zinc-800 bg-zinc-900/50 rounded text-[10px] tracking-widest uppercase text-zinc-400 mb-3 font-medium">
                            Server Builder
                        </div>
                        <h1 className="text-3xl md:text-4xl font-serif font-medium leading-tight text-white">
                            {step === 'choose' && 'Construa seu servidor'}
                            {step === 'editor' && 'Personalize a estrutura'}
                            {step === 'apply' && 'Aplique no Discord'}
                        </h1>
                        <p className="text-zinc-500 mt-2 text-sm">
                            {step === 'choose' && 'Escolha um template, gere com IA ou comece do zero.'}
                            {step === 'editor' && 'Arraste canais, renomeie categorias e personalize os cargos.'}
                            {step === 'apply' && 'Selecione o servidor e aplique a estrutura com um clique.'}
                        </p>
                    </div>

                    {/* Step indicator */}
                    <div className="ml-auto hidden md:flex items-center gap-3">
                        {(['choose', 'editor', 'apply'] as const).map((s, i) => {
                            const stepIdx = ['choose', 'editor', 'apply'].indexOf(step);
                            const isCompleted = i < stepIdx;
                            const isCurrent = step === s;
                            return (
                                <div key={s} className="flex items-center gap-3">
                                    <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold transition-all border
                                        ${isCurrent
                                            ? 'bg-white text-black border-white shadow-[0_0_20px_-5px_rgba(255,255,255,0.3)]'
                                            : isCompleted
                                                ? 'bg-green-500/20 text-green-400 border-green-500/30'
                                                : 'bg-white/5 text-zinc-600 border-white/5'
                                        }`}>
                                        {isCompleted ? <Check size={14} /> : i + 1}
                                    </div>
                                    {i < 2 && (
                                        <div className={`w-10 h-px ${isCompleted ? 'bg-green-500/30' : 'bg-white/5'}`} />
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </motion.div>

                <AnimatePresence mode="wait">

                    {/* ═══════════════════════════════════════════════════ */}
                    {/* STEP 1: CHOOSE METHOD                              */}
                    {/* ═══════════════════════════════════════════════════ */}
                    {step === 'choose' && (
                        <motion.div key="choose" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.4 }}>

                            {/* AI Generation Card */}
                            <div className="md:col-span-2 row-span-1 bg-[#0A0A0C] border border-purple-500/30 rounded-3xl p-8 md:p-10 relative overflow-hidden group hover:border-purple-500/50 transition-all mb-8">
                                <div className="absolute right-0 bottom-0 top-0 w-1/2 bg-linear-to-l from-purple-900/10 to-transparent pointer-events-none" />
                                <div className="relative z-10">
                                    <div className="flex items-center gap-4 mb-6">
                                        <div className="w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform bg-linear-to-br from-purple-500/20 to-blue-500/20">
                                            <Bot className="text-white w-6 h-6" />
                                        </div>
                                        <div>
                                            <h2 className="text-xl font-medium text-white group-hover:text-purple-300 transition-colors">Criar com IA</h2>
                                            <p className="text-zinc-500 text-sm">Descreva o servidor que você imagina e a IA gera toda a estrutura</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-3">
                                        <input
                                            value={aiPrompt}
                                            onChange={(e) => setAiPrompt(e.target.value)}
                                            placeholder='Ex: "Servidor de anime com canais por gênero e salas de watch party"'
                                            className="flex-1 px-5 py-3.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder:text-zinc-600 outline-none focus:border-purple-500/50 transition-colors"
                                            onKeyDown={e => { if (e.key === 'Enter') generateWithAI(); }}
                                        />
                                        <button
                                            onClick={generateWithAI}
                                            disabled={aiLoading || !aiPrompt.trim()}
                                            className="px-6 py-3.5 bg-white hover:bg-zinc-200 text-black text-sm font-bold uppercase tracking-wider rounded-xl flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-[0_0_20px_-5px_rgba(255,255,255,0.2)] hover:shadow-[0_0_30px_-5px_rgba(255,255,255,0.4)]"
                                        >
                                            {aiLoading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                                            {aiLoading ? 'Gerando...' : 'Gerar'}
                                        </button>
                                    </div>
                                </div>
                                {/* Animated visual */}
                                <div className="absolute top-[20%] right-[5%] w-48 h-full bg-[#1A1A1E] rounded-t-xl border-l border-t border-white/10 p-4 opacity-0 md:opacity-60 group-hover:translate-y-[-15px] transition-transform duration-700 shadow-2xl hidden md:block">
                                    <div className="space-y-2">
                                        <div className="flex gap-1.5"><div className="w-2 h-2 rounded-full bg-red-500/50" /><div className="w-2 h-2 rounded-full bg-yellow-500/50" /></div>
                                        <div className="h-1.5 w-16 bg-white/10 rounded" />
                                        <div className="h-1.5 w-24 bg-white/5 rounded" />
                                        <motion.div
                                            animate={{ opacity: [0.5, 1, 0.5] }}
                                            transition={{ duration: 2, repeat: Infinity }}
                                            className="h-10 w-full bg-purple-500/5 rounded mt-3 border border-dashed border-purple-500/20 flex items-center justify-center text-[9px] text-purple-300 font-mono"
                                        >
                                            Generating...
                                        </motion.div>
                                    </div>
                                </div>
                            </div>

                            {/* Templates Title */}
                            <div className="mb-6">
                                <h2 className="text-2xl font-serif font-medium text-white mb-1">Templates prontos</h2>
                                <p className="text-zinc-600 text-sm">Comece com uma estrutura pré-configurada e personalize como quiser</p>
                            </div>

                            {/* Templates Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mb-8">
                                {SERVER_TEMPLATES.map(template => {
                                    const IconComp = TEMPLATE_ICON_MAP[template.icon] || Server;
                                    const borderClass = TEMPLATE_BORDER_COLORS[template.id] || 'border-white/10 hover:border-white/20';
                                    const iconHover = TEMPLATE_ICON_HOVER[template.id] || 'group-hover:text-white group-hover:bg-white/10';

                                    return (
                                        <motion.button
                                            key={template.id}
                                            onClick={() => selectTemplate(template)}
                                            whileHover={{ y: -4 }}
                                            transition={{ duration: 0.2 }}
                                            className={`text-left p-6 rounded-3xl border bg-[#0A0A0C] ${borderClass} transition-all group relative overflow-hidden`}
                                        >
                                            {/* Accent glow */}
                                            <div className="absolute -top-20 -right-20 w-40 h-40 rounded-full opacity-0 group-hover:opacity-20 transition-opacity duration-500 blur-3xl" style={{ backgroundColor: template.color }} />

                                            <div className="relative z-10">
                                                <div className="flex items-start gap-4 mb-4">
                                                    <div className={`w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center transition-all ${iconHover}`}>
                                                        <IconComp className="text-white w-6 h-6" />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <h3 className="font-medium text-white text-lg group-hover:text-white/90 transition-colors">{template.name}</h3>
                                                        <div className="flex gap-1.5 mt-1.5 flex-wrap">
                                                            {template.tags.map(tag => (
                                                                <span key={tag} className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-zinc-500 font-medium tracking-wide uppercase">{tag}</span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>
                                                <p className="text-sm text-zinc-500 line-clamp-2 leading-relaxed">{template.description}</p>

                                                <div className="h-px w-full bg-white/5 my-4" />

                                                <div className="flex gap-4 text-xs text-zinc-600 font-medium">
                                                    <span>{template.schema.categories.length} categorias</span>
                                                    <span>•</span>
                                                    <span>{template.schema.categories.reduce((a, c) => a + c.channels.length, 0)} canais</span>
                                                    <span>•</span>
                                                    <span>{template.schema.roles.length} cargos</span>
                                                </div>
                                            </div>
                                        </motion.button>
                                    );
                                })}
                            </div>

                            {/* From Scratch */}
                            <motion.button
                                onClick={startFromScratch}
                                whileHover={{ y: -2 }}
                                className="w-full p-6 rounded-3xl border border-dashed border-white/10 hover:border-white/20 bg-[#0A0A0C] text-zinc-500 hover:text-zinc-300 flex items-center justify-center gap-3 transition-all group"
                            >
                                <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center group-hover:bg-white/10 transition-colors">
                                    <PenLine className="w-5 h-5" />
                                </div>
                                <span className="font-medium tracking-wide">Começar do Zero</span>
                            </motion.button>
                        </motion.div>
                    )}

                    {/* ═══════════════════════════════════════════════════ */}
                    {/* STEP 2: EDITOR                                     */}
                    {/* ═══════════════════════════════════════════════════ */}
                    {step === 'editor' && schema && (
                        <motion.div key="editor" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.4 }}>

                            {/* Header Actions & Stats */}
                            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 mb-8">
                                {stats && (
                                    <div className="flex flex-wrap gap-3 overflow-x-auto pb-2 scrollbar-none flex-1">
                                        {[
                                            { label: 'Categorias', value: stats.categories, icon: FolderPlus, color: 'text-purple-400', border: 'border-purple-500/20' },
                                            { label: 'Canais', value: stats.channels, icon: Hash, color: 'text-blue-400', border: 'border-blue-500/20' },
                                            { label: 'Texto', value: stats.textChannels, icon: MessageSquare, color: 'text-green-400', border: 'border-green-500/20' },
                                            { label: 'Voz', value: stats.voiceChannels, icon: Volume2, color: 'text-orange-400', border: 'border-orange-500/20' },
                                            { label: 'Cargos', value: stats.roles, icon: Shield, color: 'text-pink-400', border: 'border-pink-500/20' },
                                        ].map(s => (
                                            <div key={s.label} className={`px-4 py-3 rounded-2xl bg-[#0A0A0C] border ${s.border} flex items-center gap-3 shrink-0`}>
                                                <s.icon size={16} className={s.color} />
                                                <span className={`font-bold text-lg ${s.color}`}>{s.value}</span>
                                                <span className="text-zinc-600 text-xs font-medium uppercase tracking-wide">{s.label}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                <button
                                    onClick={() => setStep('apply')}
                                    className="group px-6 py-3 bg-white hover:bg-zinc-200 text-black font-semibold flex items-center justify-center gap-3 transition-all rounded-xl shadow-[0_0_20px_-5px_rgba(255,255,255,0.2)] hover:shadow-[0_0_30px_-5px_rgba(255,255,255,0.4)] shrink-0 h-fit"
                                >
                                    Aplicar no Servidor
                                    <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                                </button>
                            </div>

                            <div className="flex flex-col lg:flex-row gap-6">
                                {/* LEFT: Channel tree */}
                                <div className="flex-1 min-w-0">
                                    <div className="rounded-3xl border border-white/10 bg-[#0A0A0C] overflow-hidden">
                                        <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
                                            <h3 className="font-medium text-white text-sm flex items-center gap-3">
                                                <div className="w-8 h-8 bg-white/2 rounded-lg flex items-center justify-center">
                                                    <Eye size={14} className="text-purple-400" />
                                                </div>
                                                Estrutura do Servidor
                                            </h3>
                                            <button onClick={addCategory} className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 text-zinc-400 hover:text-white text-xs font-medium flex items-center gap-2 transition-all">
                                                <FolderPlus size={14} /> <span className="hidden sm:inline">Nova Categoria</span><span className="sm:hidden">Add</span>
                                            </button>
                                        </div>
                                        <div className="p-4 lg:max-h-[500px] overflow-y-auto">
                                            <DndContext
                                                sensors={sensors}
                                                collisionDetection={closestCenter}
                                                onDragStart={handleDragStart}
                                                onDragEnd={handleDragEnd}
                                            >
                                                <SortableContext items={schema.categories.map(c => c.id)} strategy={verticalListSortingStrategy}>
                                                    {schema.categories.map(category => (
                                                        <SortableCategory
                                                            key={category.id}
                                                            category={category}
                                                            items={category.channels.map(c => c.id)}
                                                            onRenameChannel={renameChannel}
                                                            onDeleteChannel={deleteChannel}
                                                            onSelectChannel={setSelectedChannelId}
                                                            selectedChannelId={selectedChannelId}
                                                            onRenameCategory={renameCategory}
                                                            onDeleteCategory={deleteCategory}
                                                            onAddChannel={addChannel}
                                                        />
                                                    ))}
                                                </SortableContext>
                                            </DndContext>
                                        </div>
                                    </div>


                                </div>

                                {/* RIGHT: Properties & Roles */}
                                <div className="w-full lg:w-80 shrink-0 flex flex-col gap-5 lg:h-[calc(100vh-6rem)] lg:sticky lg:top-4 lg:overflow-y-auto scrollbar-none pb-10">

                                    {/* Properties */}
                                    <div className="rounded-3xl border border-blue-500/20 bg-[#0A0A0C] overflow-hidden shrink-0">
                                        <div className="px-5 py-4 border-b border-white/5">
                                            <h3 className="font-medium text-white text-sm flex items-center gap-3">
                                                <div className="w-8 h-8 bg-blue-500/10 rounded-lg flex items-center justify-center">
                                                    <Palette size={14} className="text-blue-400" />
                                                </div>
                                                {selectedChannel ? 'Propriedades' : 'Selecione um Canal'}
                                            </h3>
                                        </div>
                                        {selectedChannel ? (
                                            <div className="p-5 space-y-4">
                                                <div>
                                                    <label className="text-[10px] text-zinc-600 mb-1.5 block uppercase tracking-wider font-medium">Nome</label>
                                                    <input
                                                        value={selectedChannel.name}
                                                        onChange={(e) => updateChannelProp(selectedChannel.id, { name: e.target.value })}
                                                        className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm outline-none focus:border-purple-500/50 transition-colors"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-[10px] text-zinc-600 mb-1.5 block uppercase tracking-wider font-medium">Tipo</label>
                                                    <select
                                                        value={selectedChannel.type}
                                                        onChange={(e) => updateChannelProp(selectedChannel.id, { type: e.target.value as ServerChannel['type'] })}
                                                        className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm outline-none [&>option]:bg-[#141416] [&>option]:text-white"
                                                    >
                                                        <option value="text">Texto</option>
                                                        <option value="voice">Voz</option>
                                                        <option value="announcement">Anúncio</option>
                                                        <option value="forum">Fórum</option>
                                                        <option value="stage">Palco</option>
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="text-[10px] text-zinc-600 mb-1.5 block uppercase tracking-wider font-medium">Descrição</label>
                                                    <input
                                                        value={selectedChannel.description || ''}
                                                        onChange={(e) => updateChannelProp(selectedChannel.id, { description: e.target.value })}
                                                        placeholder="Descrição do canal..."
                                                        className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm outline-none focus:border-purple-500/50 transition-colors placeholder:text-zinc-700"
                                                    />
                                                </div>
                                                {(selectedChannel.type === 'voice' || selectedChannel.type === 'stage') && (
                                                    <div>
                                                        <label className="text-[10px] text-zinc-600 mb-1.5 block uppercase tracking-wider font-medium">Limite de Usuários</label>
                                                        <input
                                                            type="number"
                                                            min={0}
                                                            max={99}
                                                            value={selectedChannel.user_limit || 0}
                                                            onChange={(e) => updateChannelProp(selectedChannel.id, { user_limit: parseInt(e.target.value) || 0 })}
                                                            className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm outline-none"
                                                        />
                                                    </div>
                                                )}
                                                <div className="flex items-center justify-between py-1">
                                                    <label className="text-[10px] text-zinc-600 uppercase tracking-wider font-medium">Privado</label>
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedChannel.is_private || false}
                                                        onChange={(e) => updateChannelProp(selectedChannel.id, { is_private: e.target.checked })}
                                                        className="accent-purple-500 w-4 h-4"
                                                    />
                                                </div>

                                                {/* Allowed Roles Selection */}
                                                {selectedChannel.is_private && (
                                                    <div className="space-y-2 pt-2 border-t border-white/5">
                                                        <label className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold">Cargos Permitidos (Ver)</label>
                                                        <div className="space-y-1 max-h-[150px] overflow-y-auto pr-1">
                                                            {schema.roles.map(role => {
                                                                const isAllowed = (selectedChannel.allowed_roles || []).includes(role.id);
                                                                return (
                                                                    <label key={role.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white/5 cursor-pointer text-sm">
                                                                        <input
                                                                            type="checkbox"
                                                                            checked={isAllowed}
                                                                            onChange={(e) => {
                                                                                const current = selectedChannel.allowed_roles || [];
                                                                                const updated = e.target.checked
                                                                                    ? [...current, role.id]
                                                                                    : current.filter(id => id !== role.id);
                                                                                updateChannelProp(selectedChannel.id, { allowed_roles: updated });
                                                                            }}
                                                                            className="accent-purple-500 w-3.5 h-3.5 rounded-sm"
                                                                        />
                                                                        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: role.color }} />
                                                                        <span className={isAllowed ? 'text-white' : 'text-zinc-500'}>{role.name}</span>
                                                                    </label>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Read Only Toggle */}
                                                <div className="flex items-center justify-between py-1 border-t border-white/5 pt-2">
                                                    <label className="text-[10px] text-zinc-600 uppercase tracking-wider font-medium">Somente Leitura</label>
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedChannel.is_readonly || false}
                                                        onChange={(e) => updateChannelProp(selectedChannel.id, { is_readonly: e.target.checked })}
                                                        className="accent-purple-500 w-4 h-4"
                                                    />
                                                </div>

                                                {/* Writable Roles Selection */}
                                                {selectedChannel.is_readonly && (
                                                    <div className="space-y-2 pt-2 border-t border-white/5">
                                                        <label className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold">Cargos que podem escrever</label>
                                                        <div className="space-y-1 max-h-[150px] overflow-y-auto pr-1">
                                                            {schema.roles.map(role => {
                                                                const isWritable = (selectedChannel.writable_roles || []).includes(role.id);
                                                                return (
                                                                    <label key={role.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white/5 cursor-pointer text-sm">
                                                                        <input
                                                                            type="checkbox"
                                                                            checked={isWritable}
                                                                            onChange={(e) => {
                                                                                const current = selectedChannel.writable_roles || [];
                                                                                const updated = e.target.checked
                                                                                    ? [...current, role.id]
                                                                                    : current.filter(id => id !== role.id);
                                                                                updateChannelProp(selectedChannel.id, { writable_roles: updated });
                                                                            }}
                                                                            className="accent-blue-500 w-3.5 h-3.5 rounded-sm"
                                                                        />
                                                                        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: role.color }} />
                                                                        <span className={isWritable ? 'text-white' : 'text-zinc-500'}>{role.name}</span>
                                                                    </label>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                )}
                                                {selectedChannel.type === 'text' && (
                                                    <div className="flex items-center justify-between py-1">
                                                        <label className="text-[10px] text-zinc-600 uppercase tracking-wider font-medium">Conteúdo Adulto (+18)</label>
                                                        <input
                                                            type="checkbox"
                                                            checked={selectedChannel.nsfw || false}
                                                            onChange={(e) => updateChannelProp(selectedChannel.id, { nsfw: e.target.checked })}
                                                            className="accent-purple-500 w-4 h-4"
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="p-10 text-center">
                                                <div className="w-14 h-14 bg-white/5 rounded-xl flex items-center justify-center mx-auto mb-3">
                                                    <Hash size={24} className="text-zinc-700" />
                                                </div>
                                                <p className="text-sm text-zinc-600">Clique em um canal para editar</p>
                                            </div>
                                        )}
                                    </div>

                                    {/* Roles Section (Moved here) */}
                                    <div className="rounded-3xl border border-pink-500/20 bg-[#0A0A0C] overflow-hidden shrink-0">
                                        <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
                                            <h3 className="font-medium text-white text-sm flex items-center gap-3">
                                                <div className="w-8 h-8 bg-pink-500/10 rounded-lg flex items-center justify-center">
                                                    <Shield size={14} className="text-pink-400" />
                                                </div>
                                                Cargos
                                            </h3>
                                            <button onClick={addRole} className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 text-zinc-400 hover:text-white text-xs font-medium flex items-center gap-2 transition-all">
                                                <Plus size={14} /> <span className="hidden sm:inline">Add</span>
                                            </button>
                                        </div>
                                        <div className="p-4 space-y-2 max-h-[300px] overflow-y-auto">
                                            {schema.roles.map(role => (
                                                <div key={role.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white/2 hover:bg-white/5 border border-white/5 group transition-all">
                                                    <input
                                                        type="color"
                                                        value={role.color}
                                                        onChange={(e) => updateRole(role.id, { color: e.target.value })}
                                                        className="w-6 h-6 rounded cursor-pointer border-0 bg-transparent shrink-0"
                                                    />
                                                    <input
                                                        value={role.name}
                                                        onChange={(e) => updateRole(role.id, { name: e.target.value })}
                                                        className="flex-1 bg-transparent text-white text-sm outline-none min-w-0"
                                                    />
                                                    <label className="flex items-center gap-1.5 text-[10px] text-zinc-600 uppercase tracking-wider font-medium shrink-0">
                                                        <input
                                                            type="checkbox"
                                                            checked={role.hoist || false}
                                                            onChange={(e) => updateRole(role.id, { hoist: e.target.checked })}
                                                            className="accent-purple-500 w-3 h-3"
                                                        />
                                                        Sep
                                                    </label>
                                                    <button onClick={() => deleteRole(role.id)} className="text-white/20 hover:text-red-400 md:hidden md:group-hover:block transition-colors shrink-0">
                                                        <Trash2 size={14} />
                                                    </button>
                                                    <button onClick={() => setEditingRole(role)} className="w-6 h-6 rounded flex items-center justify-center text-white/20 hover:text-white hover:bg-white/10 transition-colors shrink-0">
                                                        <Settings size={14} />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Permission Modal */}
                            <AnimatePresence>
                                {editingRole && (
                                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                                        <motion.div
                                            initial={{ opacity: 0, scale: 0.95 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            exit={{ opacity: 0, scale: 0.95 }}
                                            className="bg-[#0A0A0C] border border-white/10 rounded-3xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl"
                                        >
                                            <div className="flex items-center justify-between px-6 py-5 border-b border-white/5 shrink-0">
                                                <div>
                                                    <h3 className="text-xl font-serif font-medium text-white">Editar Permissões</h3>
                                                    <p className="text-sm text-zinc-500 flex items-center gap-2 mt-1">
                                                        <span className="w-3 h-3 rounded-full" style={{ backgroundColor: editingRole.color }} />
                                                        {editingRole.name}
                                                    </p>
                                                </div>
                                                <button
                                                    onClick={() => setEditingRole(null)}
                                                    className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white flex items-center justify-center transition-colors"
                                                >
                                                    <X size={18} />
                                                </button>
                                            </div>

                                            <div className="flex-1 overflow-y-auto p-6 space-y-8">
                                                {Object.entries(DISCORD_PERMISSIONS).map(([category, perms]) => (
                                                    <div key={category}>
                                                        <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-4">{category}</h4>
                                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                            {perms.map(perm => {
                                                                const isEnabled = (editingRole.permissions || []).includes(perm.key);
                                                                return (
                                                                    <button
                                                                        key={perm.key}
                                                                        onClick={() => togglePermission(editingRole.id, perm.key)}
                                                                        className={`flex items-center justify-between p-3 rounded-xl border transition-all text-left group
                                                                            ${isEnabled
                                                                                ? 'bg-purple-500/10 border-purple-500/30'
                                                                                : 'bg-white/2 border-white/5 hover:bg-white/4'
                                                                            }`}
                                                                    >
                                                                        <span className={`text-sm font-medium ${isEnabled ? 'text-white' : 'text-zinc-400 group-hover:text-zinc-300'}`}>
                                                                            {perm.label}
                                                                        </span>
                                                                        <div className={`w-10 h-6 rounded-full p-1 transition-colors relative ${isEnabled ? 'bg-purple-500' : 'bg-zinc-700'}`}>
                                                                            <motion.div
                                                                                layout
                                                                                className="w-4 h-4 bg-white rounded-full shadow-sm"
                                                                                initial={false}
                                                                                animate={{ x: isEnabled ? 16 : 0 }}
                                                                                transition={{ type: "spring", stiffness: 500, damping: 30 }}
                                                                            />
                                                                        </div>
                                                                    </button>
                                                                )
                                                            })}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>

                                            <div className="p-6 border-t border-white/5 shrink-0 bg-[#0A0A0C]/50">
                                                <button
                                                    onClick={() => setEditingRole(null)}
                                                    className="w-full py-3.5 bg-white hover:bg-zinc-200 text-black font-bold rounded-xl transition-colors"
                                                >
                                                    Concluído
                                                </button>
                                            </div>
                                        </motion.div>
                                    </div>
                                )}
                            </AnimatePresence>

                        </motion.div>
                    )}

                    {/* ═══════════════════════════════════════════════════ */}
                    {/* STEP 3: APPLY                                      */}
                    {/* ═══════════════════════════════════════════════════ */}
                    {step === 'apply' && schema && (
                        <motion.div key="apply" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.4 }}>
                            <div className="max-w-2xl mx-auto">

                                {/* Summary */}
                                <div className="p-8 rounded-3xl border border-white/10 bg-[#0A0A0C] mb-6">
                                    <h3 className="font-medium text-white mb-6 flex items-center gap-3">
                                        <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center">
                                            <Eye size={18} className="text-purple-400" />
                                        </div>
                                        Resumo da Estrutura
                                    </h3>
                                    {stats && (
                                        <div className="grid grid-cols-3 gap-4">
                                            {[
                                                { label: 'Categorias', value: stats.categories, icon: FolderPlus, color: 'text-purple-400', bg: 'bg-purple-500/10' },
                                                { label: 'Canais', value: stats.channels, icon: Hash, color: 'text-blue-400', bg: 'bg-blue-500/10' },
                                                { label: 'Cargos', value: stats.roles, icon: Shield, color: 'text-pink-400', bg: 'bg-pink-500/10' },
                                            ].map(s => (
                                                <div key={s.label} className="text-center p-5 rounded-2xl bg-white/[0.02] border border-white/5">
                                                    <div className={`w-10 h-10 ${s.bg} rounded-xl flex items-center justify-center mx-auto mb-3`}>
                                                        <s.icon size={18} className={s.color} />
                                                    </div>
                                                    <div className={`text-2xl font-serif font-medium ${s.color}`}>{s.value}</div>
                                                    <div className="text-[10px] text-zinc-600 uppercase tracking-wider font-medium mt-1">{s.label}</div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Warning */}
                                <div className="p-6 rounded-3xl bg-yellow-500/10 border border-yellow-500/20 mb-6 flex gap-4">
                                    <AlertTriangle className="text-yellow-500 shrink-0" size={24} />
                                    <div className="space-y-2">
                                        <h3 className="font-bold text-yellow-500">Atenção: Verifique seu Servidor</h3>
                                        <p className="text-yellow-200/80 text-sm leading-relaxed">
                                            A aplicação da estrutura é um processo complexo. O CoreBot tentará criar todos os canais, cargos e permissões conforme configurado, mas limitações do Discord podem ocorrer.
                                        </p>
                                        <p className="text-yellow-200/80 text-sm leading-relaxed font-medium">
                                            Após a conclusão, recomendamos fortemente que você revise manualmente as permissões de canais e configurações sensíveis.
                                        </p>
                                    </div>
                                </div>

                                {/* Server selection */}
                                <div className="p-8 rounded-3xl border border-green-500/20 bg-[#0A0A0C] mb-6">
                                    <h3 className="font-medium text-white mb-4 flex items-center gap-3">
                                        <div className="w-10 h-10 bg-green-500/10 rounded-xl flex items-center justify-center">
                                            <Rocket size={18} className="text-green-400" />
                                        </div>
                                        Selecione o Servidor
                                    </h3>
                                    <p className="text-zinc-500 text-sm mb-5 leading-relaxed">
                                        Escolha o servidor Discord onde deseja aplicar esta estrutura. O CoreBot precisa estar no servidor.
                                    </p>
                                    <select
                                        value={applyGuildId}
                                        onChange={(e) => setApplyGuildId(e.target.value)}
                                        className="w-full px-5 py-3.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm outline-none focus:border-green-500/50 transition-colors [&>option]:bg-[#141416] [&>option]:text-white"
                                    >
                                        <option value="">Selecione um servidor...</option>
                                        {guilds.map(g => (
                                            <option key={g.id} value={g.id}>{g.name}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Progress */}
                                {applyProgress.length > 0 && (
                                    <div className="p-8 rounded-3xl border border-white/10 bg-[#0A0A0C] mb-6">
                                        <h3 className="font-medium text-white mb-4 flex items-center gap-3">
                                            <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center">
                                                <Zap size={18} className="text-yellow-400" />
                                            </div>
                                            Progresso
                                        </h3>
                                        <div className="space-y-1.5 max-h-[200px] overflow-y-auto font-mono text-xs bg-white/[0.02] rounded-xl p-4 border border-white/5">
                                            {applyProgress.map((msg, i) => (
                                                <div key={i} className="text-zinc-400">{msg}</div>
                                            ))}
                                            {applying && <div className="text-purple-400 animate-pulse">⏳ Aplicando...</div>}
                                        </div>
                                    </div>
                                )}

                                {/* Apply button */}
                                {applyDone ? (
                                    <button
                                        onClick={() => router.push('/dashboard')}
                                        className="w-full py-4 rounded-xl font-bold text-sm uppercase tracking-wider flex items-center justify-center gap-3 transition-all bg-green-500 hover:bg-green-600 text-white shadow-[0_0_30px_-5px_rgba(34,197,94,0.4)] hover:shadow-[0_0_40px_-5px_rgba(34,197,94,0.6)]"
                                    >
                                        <Home size={18} /> Voltar para Dashboard
                                    </button>
                                ) : (
                                    <button
                                        onClick={applyToServer}
                                        disabled={!applyGuildId || applying}
                                        className="w-full py-4 rounded-xl font-bold text-sm uppercase tracking-wider flex items-center justify-center gap-3 transition-all bg-white hover:bg-zinc-200 text-black shadow-[0_0_30px_-5px_rgba(255,255,255,0.2)] hover:shadow-[0_0_40px_-5px_rgba(255,255,255,0.4)] disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
                                    >
                                        {applying ? (
                                            <><Loader2 size={18} className="animate-spin" /> Aplicando Estrutura...</>
                                        ) : (
                                            <><Rocket size={18} /> Aplicar Estrutura no Servidor</>
                                        )}
                                    </button>
                                )}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
