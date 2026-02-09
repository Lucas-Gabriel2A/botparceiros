"use client";

import { useState, useRef } from "react";
import { useFormStatus } from "react-dom";
import { upsertTicketCategoryAction, deleteTicketCategoryAction } from "@/actions/guild-actions";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Ticket,
    Plus,
    Trash2,
    Edit,
    Palette,
    X,
    Check
} from "lucide-react";

interface TicketCategory {
    id: string;
    name: string;
    description?: string | null;
    color?: string | null;
    emoji?: string | null;
    ticket_channel_category_id?: string | null;
    support_role_id?: string | null;
    welcome_title?: string | null;
    welcome_description?: string | null;
}

interface TicketFormProps {
    guildId: string;
    userId: string;
    categories: TicketCategory[];
}

function SubmitButton({ isEditing }: { isEditing?: boolean }) {
    const { pending } = useFormStatus();
    return (
        <Button type="submit" disabled={pending} className="w-full bg-violet-600 hover:bg-violet-700 text-white">
            {pending ? (isEditing ? "Salvando..." : "Criando...") : (isEditing ? "Salvar Alterações" : "Criar Categoria")}
        </Button>
    );
}

export function TicketForm({ guildId, userId, categories }: TicketFormProps) {
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState<TicketCategory | null>(null);
    const [feedback, setFeedback] = useState<{ type: 'success' | 'error', message: string } | null>(null);
    const modalRef = useRef<HTMLDivElement>(null);

    async function handleSubmit(formData: FormData) {
        setFeedback(null);
        const res = await upsertTicketCategoryAction({} as any, formData);
        if (res.success) {
            setFeedback({ type: 'success', message: res.message || "Sucesso!" });
            setIsDialogOpen(false);
            setEditingCategory(null);
            setTimeout(() => setFeedback(null), 3000);
        } else {
            setFeedback({ type: 'error', message: res.error || "Erro ao salvar." });
            // Keep dialog open on error
        }
    }

    async function handleDelete(categoryId: string) {
        if (!confirm("Tem certeza que deseja excluir esta categoria?")) return;

        const res = await deleteTicketCategoryAction(categoryId, guildId);
        if (res.success) {
            setFeedback({ type: 'success', message: "Categoria removida!" });
            setTimeout(() => setFeedback(null), 3000);
        } else {
            setFeedback({ type: 'error', message: res.error || "Erro ao remover." });
        }
    }

    const openCreate = () => {
        setEditingCategory(null);
        setFeedback(null);
        setIsDialogOpen(true);
    };

    const openEdit = (cat: TicketCategory) => {
        setEditingCategory(cat);
        setFeedback(null);
        setIsDialogOpen(true);
    };

    return (
        <div className="space-y-8 max-w-5xl mx-auto p-4 sm:p-6 lg:p-8 relative font-hind">
            {/* Feedback Toast (Custom) */}
            {feedback && (
                <div className={`fixed bottom-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 text-sm font-medium animate-in slide-in-from-bottom-5 fade-in duration-300 ${feedback.type === 'success' ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'
                    }`}>
                    {feedback.type === 'success' ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                    {feedback.message}
                </div>
            )}

            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl md:text-5xl font-serif font-medium text-white inline-flex items-center gap-2">
                        <div className="p-2 rounded-lg bg-violet-500/10 border border-violet-500/20">
                            <Ticket className="w-6 h-6 text-violet-400" />
                        </div>
                        Sistema de Tickets
                    </h1>
                    <p className="text-zinc-400 mt-2 font-medium">
                        Gerencie as categorias de suporte do seu servidor.
                    </p>
                </div>
                <Button onClick={openCreate} className="bg-violet-600 hover:bg-violet-700 text-white shadow-lg shadow-violet-900/20 font-bold">
                    <Plus className="w-4 h-4 mr-2" />
                    Nova Categoria
                </Button>
            </div>

            {/* Categories Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {categories.map((cat) => (
                    <Card key={cat.id} className="bg-[#0A0A0C] border border-zinc-800 rounded-3xl p-6 hover:border-violet-500/50 transition-all duration-300 group relative overflow-hidden">
                        {/* Glow Effect */}
                        <div className="absolute inset-0 bg-linear-to-b from-violet-500/5 to-transparent opacity-50 pointer-events-none"></div>

                        <div
                            className="absolute left-0 top-0 bottom-0 w-1.5 transition-all"
                            style={{ backgroundColor: cat.color || '#7B68EE' }}
                        />

                        <CardHeader className="pb-2 pl-6 p-0">
                            <div className="flex justify-between items-start">
                                <CardTitle className="text-lg font-bold text-white flex items-center gap-2">
                                    {cat.name}
                                </CardTitle>
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                                    <Button size="icon" variant="ghost" className="h-8 w-8 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg" onClick={() => openEdit(cat)}>
                                        <Edit className="w-4 h-4" />
                                    </Button>
                                    <Button size="icon" variant="ghost" className="h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-900/20 rounded-lg" onClick={() => handleDelete(cat.id)}>
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>
                            <CardDescription className="text-zinc-500 font-medium line-clamp-2 pl-0 mt-1">
                                {cat.description || "Sem descrição definida."}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="pl-6 pt-4 p-0">
                            <div className="flex items-center gap-2 text-xs text-zinc-400 font-bold font-mono bg-[#13111C] w-fit px-3 py-1.5 rounded-lg border border-zinc-800">
                                <Palette className="w-3 h-3" style={{ color: cat.color || '#7B68EE' }} />
                                {cat.color || '#7B68EE'}
                            </div>
                        </CardContent>
                    </Card>
                ))}

                {categories.length === 0 && (
                    <div className="col-span-full border border-dashed border-zinc-800 rounded-xl p-12 text-center">
                        <div className="bg-zinc-900/50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Ticket className="w-8 h-8 text-zinc-600" />
                        </div>
                        <h3 className="text-white font-medium mb-1">Nenhuma categoria criada</h3>
                        <p className="text-zinc-500 text-sm mb-4">Comece criando categorias para organizar seu suporte.</p>
                        <Button variant="outline" onClick={openCreate} className="border-zinc-700 text-zinc-300 hover:text-white hover:bg-zinc-800">
                            Criar Categoria
                        </Button>
                    </div>
                )}
            </div>

            {/* Custom Modal */}
            {isDialogOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
                    <div
                        ref={modalRef}
                        className="w-full max-w-2xl bg-zinc-950 border border-zinc-800 rounded-xl shadow-2xl animate-in zoom-in-95 duration-200 p-6 space-y-4 max-h-[90vh] overflow-y-auto"
                    >
                        <div className="flex justify-between items-center">
                            <div>
                                <h2 className="text-lg font-semibold text-white">
                                    {editingCategory ? "Editar Categoria" : "Nova Categoria"}
                                </h2>
                                <p className="text-sm text-zinc-400">
                                    Configure os detalhes da categoria de suporte.
                                </p>
                            </div>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setIsDialogOpen(false)}
                                className="h-8 w-8 text-zinc-400 hover:text-white"
                            >
                                <X className="w-4 h-4" />
                            </Button>
                        </div>

                        <form action={handleSubmit} className="space-y-4 pt-2">
                            <input type="hidden" name="guildId" value={guildId} />
                            <input type="hidden" name="userId" value={userId} />
                            {editingCategory && <input type="hidden" name="categoryId" value={editingCategory.id} />}

                            {feedback && feedback.type === 'error' && (
                                <div className="bg-red-900/20 border border-red-900/50 text-red-200 text-xs p-3 rounded-lg">
                                    {feedback.message}
                                </div>
                            )}

                            <div className="space-y-2">
                                <Label htmlFor="name" className="text-zinc-300">Nome da Categoria</Label>
                                <Input
                                    id="name"
                                    name="name"
                                    placeholder="ex: Suporte Técnico"
                                    defaultValue={editingCategory?.name}
                                    required
                                    className="bg-zinc-900/50 border-zinc-800 text-white focus:ring-violet-500/50 focus:border-violet-500 placeholder:text-zinc-600"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="description" className="text-zinc-300">Descrição</Label>
                                <Textarea
                                    id="description"
                                    name="description"
                                    placeholder="Explique para que serve esta categoria..."
                                    defaultValue={editingCategory?.description || ''}
                                    className="bg-zinc-900/50 border-zinc-800 text-white focus:ring-violet-500/50 focus:border-violet-500 min-h-[80px] placeholder:text-zinc-600"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="color" className="text-zinc-300">Cor do Embed</Label>
                                <div className="flex gap-2">
                                    <Input
                                        id="color"
                                        name="color"
                                        type="color"
                                        defaultValue={editingCategory?.color || '#7B68EE'}
                                        className="w-12 h-10 p-1 bg-zinc-900 border-zinc-800 cursor-pointer"
                                    />
                                    <Input
                                        type="text"
                                        placeholder="#7B68EE"
                                        defaultValue={editingCategory?.color || '#7B68EE'}
                                        className="flex-1 bg-zinc-900/50 border-zinc-800 text-white font-mono placeholder:text-zinc-600"
                                    />
                                    <div className="space-y-2 w-24">
                                        <Input
                                            id="emoji"
                                            name="emoji"
                                            placeholder="Emoji"
                                            defaultValue={editingCategory?.emoji || ''}
                                            className="bg-zinc-900/50 border-zinc-800 text-white text-center text-xl placeholder:text-zinc-600"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="ticketChannelCategoryId" className="text-zinc-300 text-xs uppercase font-bold tracking-wider">ID da Categoria Discord</Label>
                                    <Input
                                        id="ticketChannelCategoryId"
                                        name="ticketChannelCategoryId"
                                        placeholder="ID da Categoria"
                                        defaultValue={editingCategory?.ticket_channel_category_id || ''}
                                        className="bg-zinc-900/50 border-zinc-800 text-white font-mono text-sm placeholder:text-zinc-600"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="supportRoleId" className="text-zinc-300 text-xs uppercase font-bold tracking-wider">ID do Cargo Suporte</Label>
                                    <Input
                                        id="supportRoleId"
                                        name="supportRoleId"
                                        placeholder="ID do Cargo"
                                        defaultValue={editingCategory?.support_role_id || ''}
                                        className="bg-zinc-900/50 border-zinc-800 text-white font-mono text-sm placeholder:text-zinc-600"
                                    />
                                </div>
                            </div>

                            <div className="border-t border-zinc-800 pt-4 mt-2">
                                <h3 className="text-sm font-medium text-violet-400 mb-4">Personalização da Mensagem de Boas-vindas</h3>
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="welcomeTitle" className="text-zinc-300">Título do Embed</Label>
                                        <Input
                                            id="welcomeTitle"
                                            name="welcomeTitle"
                                            placeholder="Título padrão: Ticket Aberto"
                                            defaultValue={editingCategory?.welcome_title || ''}
                                            className="bg-zinc-900/50 border-zinc-800 text-white placeholder:text-zinc-600"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="welcomeDescription" className="text-zinc-300">Descrição do Embed</Label>
                                        <Textarea
                                            id="welcomeDescription"
                                            name="welcomeDescription"
                                            placeholder="Descrição padrão: Aguarde, um membro da equipe irá atendê-lo."
                                            defaultValue={editingCategory?.welcome_description || ''}
                                            className="bg-zinc-900/50 border-zinc-800 text-white min-h-[80px] placeholder:text-zinc-600"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="pt-4 flex justify-end gap-2">
                                <Button type="button" variant="ghost" onClick={() => setIsDialogOpen(false)} className="text-zinc-400 hover:text-white hover:bg-zinc-800">
                                    Cancelar
                                </Button>
                                <SubmitButton isEditing={!!editingCategory} />
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
