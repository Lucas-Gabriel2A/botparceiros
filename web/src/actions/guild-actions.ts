"use server";

import { database } from "@shared/services/database";
import { revalidatePath } from "next/cache";
import { uploadImage } from "@/lib/cloudinary";
import { verifyUserGuildAccess } from "@/lib/discord-api";
import { CoreBotActionSchema, AutoModActionSchema, TicketCategorySchema, WelcomeConfigSchema, PrivateCallsSchema, TicketPanelSchema } from "@/schemas/guild-config";

export interface GuildConfigState {
    success?: boolean;
    error?: string;
    message?: string;
}

export async function updateCoreBotConfig(prevState: GuildConfigState, formData: FormData): Promise<GuildConfigState> {
    try {
        const rawData = Object.fromEntries(formData.entries());
        const parsed = CoreBotActionSchema.safeParse(rawData);

        if (!parsed.success) {
            console.error("Zod Validation Failed:", parsed.error.format());
            return { success: false, error: "Dados inválidos enviados pelo formulário." };
        }

        const data = parsed.data;

        const hasAccess = await verifyUserGuildAccess(data.guildId);
        if (!hasAccess) return { success: false, error: "Acesso Negado ou Sessão Inválida." };

        await database.upsertGuildConfig(data.guildId, {
            ia_enabled: data.iaEnabled,
            ia_channel_id: data.channelId || null,
            ia_system_prompt: data.systemPrompt || "",
            ia_temperature: data.iaTemperature,
            ia_triggers: data.iaTriggers,
            ia_ignored_channels: data.iaIgnoredChannels,
            ia_ignored_roles: data.iaIgnoredRoles
        });

        revalidatePath(`/dashboard/${data.guildId}/corebot`);

        return { success: true, message: "Configurações salvas com sucesso!" };
    } catch (error) {
        console.error("Failed to update CoreBot config:", error);
        return { success: false, error: "Erro ao salvar configurações." };
    }
}

export async function updateWelcomeConfig(prevState: GuildConfigState, formData: FormData): Promise<GuildConfigState> {
    try {
        const rawData = Object.fromEntries(formData.entries());
        const parsed = WelcomeConfigSchema.safeParse(rawData);

        if (!parsed.success) {
            console.error("Zod Validation Failed Welcome:", parsed.error.format());
            return { success: false, error: "Dados inválidos." };
        }

        const data = parsed.data;

        const hasAccess = await verifyUserGuildAccess(data.guildId);
        if (!hasAccess) return { success: false, error: "Acesso Negado ou Sessão Inválida." };

        // Welcome Banner File Extractor (File not naturally in Zod String Schema without custom interceptor, extract normally)
        const bannerFile = formData.get("welcome_banner") as File;
        let bannerUrl = null;

        if (bannerFile && bannerFile.size > 0) {
            bannerUrl = await uploadImage(bannerFile);
        }
        
        const currentConfig = await database.getGuildConfig(data.guildId);
        let fontChangesCount = currentConfig?.welcome_font_changes_count || 0;

        if (currentConfig && data.welcome_font && data.welcome_font !== currentConfig.welcome_font) {
            if (fontChangesCount >= 1) {
                const { getUserPlan } = await import("@shared/services/plan-features");
                const userPlan = await getUserPlan(data.userId);
                
                if (userPlan === 'free') {
                    return { success: false, error: "Limite grátis de alteração de fontes esgotado. Faça upgrade para Starter e altere livremente!" };
                }
            }
            fontChangesCount += 1;
        }

        const updateData: any = {
            welcome_message: data.welcomeMessage || null,
            leave_message: data.leaveMessage || null,
            welcome_channel_id: data.welcomeChannelId || null,
            leave_channel_id: data.leaveChannelId || null,
            autorole_id: data.autoroleId || null,
            welcome_font: data.welcome_font || null,
            welcome_font_changes_count: fontChangesCount
        };

        if (bannerUrl) {
            updateData.welcome_banner_url = bannerUrl;
        }

        await database.upsertGuildConfig(data.guildId, updateData);

        revalidatePath(`/dashboard/${data.guildId}/welcome`);

        return { success: true, message: "Configurações de Boas-vindas salvas!" };
    } catch (error) {
        console.error("Welcome Update Error:", error);
        return { success: false, error: "Erro ao atualizar Boas-vindas." };
    }
}

export async function updateAutoModConfig(prevState: GuildConfigState, formData: FormData): Promise<GuildConfigState> {
    try {
        const rawData = Object.fromEntries(formData.entries());
        const parsed = AutoModActionSchema.safeParse(rawData);

        if (!parsed.success) {
            console.error("Zod Validation Failed AutoMod:", parsed.error.format());
            return { success: false, error: "Dados inválidos." };
        }

        const data = parsed.data;

        const hasAccess = await verifyUserGuildAccess(data.guildId);
        if (!hasAccess) return { success: false, error: "Acesso Negado ou Sessão Inválida." };

        const updateData: any = {
            automod_links_enabled: data.automodLinks,
            automod_caps_enabled: data.automodCaps,
            automod_spam_enabled: data.automodSpam,
            prohibited_words: data.prohibitedWords,
            automod_channel: data.automodChannelId || null,
            automod_action: data.automodAction,
            automod_timeout_duration: data.automodTimeoutDuration,
            automod_log_channel: data.automodLogChannel || null,
            automod_bypass_roles: data.automodBypassRoles,
            automod_ai_enabled: data.automodAiEnabled
        };

        await database.upsertGuildConfig(data.guildId, updateData);

        revalidatePath(`/dashboard/${data.guildId}/automod`);

        return { success: true, message: "Configurações de AutoMod salvas!" };
    } catch (error) {
        console.error("AutoMod Update Error:", error);
        return { success: false, error: "Erro ao atualizar AutoMod." };
    }
}

export async function upsertTicketCategoryAction(prevState: GuildConfigState, formData: FormData): Promise<GuildConfigState> {
    try {
        const rawData = Object.fromEntries(formData.entries());
        const parsed = TicketCategorySchema.safeParse(rawData);

        if (!parsed.success) {
            console.error("Zod Validation Failed Ticket Category:", parsed.error.format());
            return { success: false, error: "Dados da Categoria Inválidos." };
        }

        const data = parsed.data;

        const hasAccess = await verifyUserGuildAccess(data.guildId);
        if (!hasAccess) return { success: false, error: "Acesso Negado ou Sessão Inválida." };

        if (data.categoryId) {
            await database.updateTicketCategory(data.categoryId, {
                name: data.name, description: data.description || null, color: data.color || null,
                emoji: data.emoji || null, ticket_channel_category_id: data.ticketChannelCategoryId || null, support_role_id: data.supportRoleId || null,
                welcome_title: data.welcomeTitle || null, welcome_description: data.welcomeDescription || null
            });
        } else {
            const currentCategories = await database.getTicketCategories(data.guildId);
            const { getUserPlan } = await import("@shared/services/plan-features");
            const userPlan = await getUserPlan(data.userId);

            if (userPlan === 'free' && currentCategories.length >= 5) {
                return { success: false, error: "Limite de 5 categorias atingido (Plano Grátis)." };
            }

            const newId = `cat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            await database.createTicketCategory(
                newId, data.guildId, data.name, data.description || "", data.color || "", data.userId,
                data.emoji || undefined, data.ticketChannelCategoryId || undefined, data.supportRoleId || undefined, data.welcomeTitle || undefined, data.welcomeDescription || undefined
            );
        }

        revalidatePath(`/dashboard/${data.guildId}/tickets`);
        return { success: true, message: data.categoryId ? "Categoria atualizada!" : "Categoria criada!" };
    } catch (error) {
        console.error("Ticket Category Upsert Error:", error);
        return { success: false, error: "Erro ao salvar categoria." };
    }
}

export async function deleteTicketCategoryAction(categoryId: string, guildId: string): Promise<GuildConfigState> {
    try {
        if (!guildId) return { success: false, error: "Guild ID info missing" };

        const hasAccess = await verifyUserGuildAccess(guildId);
        if (!hasAccess) return { success: false, error: "Acesso Negado ou Sessão Inválida." };

        await database.deleteTicketCategory(categoryId);
        revalidatePath(`/dashboard/${guildId}/tickets`);
        return { success: true, message: "Categoria removida!" };
    } catch (error) {
        console.error("Ticket Category Delete Error:", error);
        return { success: false, error: "Erro ao remover categoria." };
    }
}

export async function updatePrivateCallsConfig(prevState: GuildConfigState, formData: FormData): Promise<GuildConfigState> {
    try {
        const rawData = Object.fromEntries(formData.entries());
        const parsed = PrivateCallsSchema.safeParse(rawData);

        if (!parsed.success) {
            console.error("Zod Validation Failed Private Calls:", parsed.error.format());
            return { success: false, error: "Dados inválidos." };
        }

        const data = parsed.data;

        const hasAccess = await verifyUserGuildAccess(data.guildId);
        if (!hasAccess) return { success: false, error: "Acesso Negado ou Sessão Inválida." };

        await database.upsertGuildConfig(data.guildId, {
            private_calls_enabled: data.privateCallsEnabled,
            private_calls_category_id: data.privateCallsCategoryId || null,
            private_calls_manager_role: data.privateCallsManagerRole || null,
            private_calls_allowed_roles: data.privateCallsAllowedRoles
        });

        revalidatePath(`/dashboard/${data.guildId}/private-calls`);

        return { success: true, message: "Configurações de Calls Privadas salvas!" };
    } catch (error) {
        console.error("Private Calls Update Error:", error);
        return { success: false, error: "Erro ao salvar configurações." };
    }
}
// ... existing imports ...

export async function updateTicketConfigAction(prevState: GuildConfigState, formData: FormData): Promise<GuildConfigState> {
    try {
        const rawData = Object.fromEntries(formData.entries());
        const parsed = TicketPanelSchema.safeParse(rawData);

        if (!parsed.success) {
            console.error("Zod Validation Failed Ticket Config:", parsed.error.format());
            return { success: false, error: "Dados inválidos." };
        }

        const data = parsed.data;

        const hasAccess = await verifyUserGuildAccess(data.guildId);
        if (!hasAccess) return { success: false, error: "Acesso Negado ou Sessão Inválida." };

        const bannerFile = formData.get("bannerFile") as File;
        let finalBannerUrl = data.bannerUrl || null; 

        if (bannerFile && bannerFile.size > 0) {
            finalBannerUrl = await uploadImage(bannerFile);
        }

        await database.upsertGuildConfig(data.guildId, {
            ticket_panel_title: data.title || null,
            ticket_panel_description: data.description || null,
            ticket_panel_banner_url: finalBannerUrl,
            ticket_panel_color: data.color || null,
            ticket_panel_button_text: data.buttonText || null,
            ticket_panel_button_emoji: data.buttonEmoji || null,
            ticket_panel_footer: data.footer || null,
            ticket_logs_channel_id: data.logsChannelId || null
        });

        revalidatePath(`/dashboard/${data.guildId}/tickets`);
        return { success: true, message: "Configurações do Painel salvas!" };
    } catch (error) {
        console.error("Ticket Config Update Error:", error);
        return { success: false, error: "Erro ao salvar configurações." };
    }
}
