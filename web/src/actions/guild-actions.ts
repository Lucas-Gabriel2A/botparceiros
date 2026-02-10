"use server";

import { database } from "@shared/services/database";
import { revalidatePath } from "next/cache";
import { uploadImage } from "@/lib/cloudinary";

export interface GuildConfigState {
    success?: boolean;
    error?: string;
    message?: string;
}

export async function updateCoreBotConfig(prevState: GuildConfigState, formData: FormData): Promise<GuildConfigState> {
    try {
        const guildId = formData.get("guildId") as string;
        const iaEnabled = formData.get("iaEnabled") === "on";
        const channelId = formData.get("channelId") as string;
        const systemPrompt = formData.get("systemPrompt") as string;

        if (!guildId) {
            return { success: false, error: "Guild ID missing" };
        }

        const temperature = parseFloat(formData.get("iaTemperature") as string) || 0.7;
        const ignoredChannelsJson = formData.get("iaIgnoredChannels") as string;
        const ignoredRolesJson = formData.get("iaIgnoredRoles") as string;

        let ignoredChannels: string[] = [];
        let ignoredRoles: string[] = [];

        try { ignoredChannels = JSON.parse(ignoredChannelsJson || "[]"); } catch { }
        try { ignoredRoles = JSON.parse(ignoredRolesJson || "[]"); } catch { }

        await database.upsertGuildConfig(guildId, {
            ia_enabled: iaEnabled,
            ia_channel_id: channelId,
            ia_system_prompt: systemPrompt,
            ia_temperature: temperature,
            ia_ignored_channels: ignoredChannels,
            ia_ignored_roles: ignoredRoles
        });

        revalidatePath(`/dashboard/${guildId}/corebot`);

        return { success: true, message: "Configurações salvas com sucesso!" };
    } catch (error) {
        console.error("Failed to update CoreBot config:", error);
        return { success: false, error: "Erro ao salvar configurações." };
    }
}

export async function updateWelcomeConfig(prevState: GuildConfigState, formData: FormData): Promise<GuildConfigState> {
    try {
        const guildId = formData.get("guildId") as string;

        // Welcome/Leave
        const welcomeMessage = formData.get("welcomeMessage") as string;
        const leaveMessage = formData.get("leaveMessage") as string;
        const welcomeChannelId = formData.get("welcomeChannelId") as string;
        const leaveChannelId = formData.get("leaveChannelId") as string;
        const autoroleId = formData.get("autoroleId") as string;

        // Welcome Banner & Font
        const welcomeFont = formData.get("welcome_font") as string;
        const bannerFile = formData.get("welcome_banner") as File;
        let bannerUrl = null;

        if (bannerFile && bannerFile.size > 0) {
            bannerUrl = await uploadImage(bannerFile);
        }

        if (!guildId) return { success: false, error: "Guild ID missing" };

        const updateData: any = {
            welcome_message: welcomeMessage,
            leave_message: leaveMessage,
            welcome_channel_id: welcomeChannelId,
            leave_channel_id: leaveChannelId,
            autorole_id: autoroleId,
            welcome_font: welcomeFont
        };

        if (bannerUrl) {
            updateData.welcome_banner_url = bannerUrl;
        }

        await database.upsertGuildConfig(guildId, updateData);

        revalidatePath(`/dashboard/${guildId}/welcome`);

        return { success: true, message: "Configurações de Boas-vindas salvas!" };
    } catch (error) {
        console.error("Welcome Update Error:", error);
        return { success: false, error: "Erro ao atualizar Boas-vindas." };
    }
}

export async function updateAutoModConfig(prevState: GuildConfigState, formData: FormData): Promise<GuildConfigState> {
    try {
        const guildId = formData.get("guildId") as string;

        // AutoMod
        const automodLinks = formData.get("automodLinks") === "on";
        const automodCaps = formData.get("automodCaps") === "on";
        const automodSpam = formData.get("automodSpam") === "on";

        if (!guildId) return { success: false, error: "Guild ID missing" };

        const prohibitedWordsJson = formData.get("prohibitedWords") as string;
        let prohibitedWords: string[] = [];

        try {
            if (prohibitedWordsJson) {
                prohibitedWords = JSON.parse(prohibitedWordsJson);
            }
        } catch (e) {
            console.error("Error parsing prohibited words:", e);
        }

        const automodChannelId = formData.get("automodChannelId") as string;

        const automodAction = formData.get("automodAction") as 'delete' | 'timeout' | 'kick' | 'ban' || 'delete';
        const automodTimeoutDuration = parseInt(formData.get("automodTimeoutDuration") as string) || 0;
        const automodLogChannel = formData.get("automodLogChannel") as string;
        const automodBypassRolesJson = formData.get("automodBypassRoles") as string;

        let automodBypassRoles: string[] = [];
        try { automodBypassRoles = JSON.parse(automodBypassRolesJson || "[]"); } catch { }

        const updateData: any = {
            automod_links_enabled: automodLinks,
            automod_caps_enabled: automodCaps,
            automod_spam_enabled: automodSpam,
            prohibited_words: prohibitedWords,
            automod_channel: automodChannelId || null,
            automod_action: automodAction,
            automod_timeout_duration: automodTimeoutDuration,
            automod_log_channel: automodLogChannel || null,
            automod_bypass_roles: automodBypassRoles
        };

        await database.upsertGuildConfig(guildId, updateData);

        revalidatePath(`/dashboard/${guildId}/automod`);

        return { success: true, message: "Configurações de AutoMod salvas!" };
    } catch (error) {
        console.error("AutoMod Update Error:", error);
        return { success: false, error: "Erro ao atualizar AutoMod." };
    }
}

export async function upsertTicketCategoryAction(prevState: GuildConfigState, formData: FormData): Promise<GuildConfigState> {
    try {
        const guildId = formData.get("guildId") as string;
        const categoryId = formData.get("categoryId") as string; // Optional, for update
        const name = formData.get("name") as string;
        const description = formData.get("description") as string;
        const color = formData.get("color") as string;
        const userId = formData.get("userId") as string;

        // New fields
        const emoji = formData.get("emoji") as string;
        const ticketChannelCategoryId = formData.get("ticketChannelCategoryId") as string;
        const supportRoleId = formData.get("supportRoleId") as string;
        const welcomeTitle = formData.get("welcomeTitle") as string;
        const welcomeDescription = formData.get("welcomeDescription") as string;

        console.log("Upsert Ticket Category Debug:", { guildId, name, userId, categoryId, emoji });

        if (!guildId || !name || !userId) {
            return { success: false, error: "Dados incompletos." };
        }

        if (categoryId) {
            await database.updateTicketCategory(categoryId, {
                name, description, color,
                emoji, ticket_channel_category_id: ticketChannelCategoryId, support_role_id: supportRoleId,
                welcome_title: welcomeTitle, welcome_description: welcomeDescription
            });
        } else {
            const newId = `cat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            await database.createTicketCategory(
                newId, guildId, name, description, color, userId,
                emoji, ticketChannelCategoryId, supportRoleId, welcomeTitle, welcomeDescription
            );
        }

        revalidatePath(`/dashboard/${guildId}/tickets`);
        return { success: true, message: categoryId ? "Categoria atualizada!" : "Categoria criada!" };
    } catch (error) {
        console.error("Ticket Category Upsert Error:", error);
        return { success: false, error: "Erro ao salvar categoria." };
    }
}

export async function deleteTicketCategoryAction(categoryId: string, guildId: string): Promise<GuildConfigState> {
    try {
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
        const guildId = formData.get("guildId") as string;
        const enabled = formData.get("privateCallsEnabled") === "true";
        const categoryId = formData.get("privateCallsCategoryId") as string;
        const managerRole = formData.get("privateCallsManagerRole") as string;
        const allowedRolesJson = formData.get("privateCallsAllowedRoles") as string;

        if (!guildId) return { success: false, error: "Guild ID missing" };

        let allowedRoles: string[] = [];
        try { allowedRoles = JSON.parse(allowedRolesJson || "[]"); } catch { }

        await database.upsertGuildConfig(guildId, {
            private_calls_enabled: enabled,
            private_calls_category_id: categoryId || null,
            private_calls_manager_role: managerRole || null,
            private_calls_allowed_roles: allowedRoles
        });

        revalidatePath(`/dashboard/${guildId}/private-calls`);

        return { success: true, message: "Configurações de Calls Privadas salvas!" };
    } catch (error) {
        console.error("Private Calls Update Error:", error);
        return { success: false, error: "Erro ao salvar configurações." };
    }
}
// ... existing imports ...

export async function updateTicketConfigAction(prevState: GuildConfigState, formData: FormData): Promise<GuildConfigState> {
    try {
        const guildId = formData.get("guildId") as string;
        const title = formData.get("title") as string;
        const description = formData.get("description") as string;
        const color = formData.get("color") as string;
        const buttonText = formData.get("buttonText") as string;
        const buttonEmoji = formData.get("buttonEmoji") as string;
        const footer = formData.get("footer") as string;

        // Image upload logic
        const bannerFile = formData.get("bannerFile") as File;
        let bannerUrl = formData.get("bannerUrl") as string; // Keep existing URL if no new file

        if (bannerFile && bannerFile.size > 0) {
            bannerUrl = await uploadImage(bannerFile);
        }

        if (!guildId) return { success: false, error: "Guild ID missing" };

        await database.upsertGuildConfig(guildId, {
            ticket_panel_title: title,
            ticket_panel_description: description,
            ticket_panel_banner_url: bannerUrl,
            ticket_panel_color: color,
            ticket_panel_button_text: buttonText,
            ticket_panel_button_emoji: buttonEmoji,
            ticket_panel_footer: footer
        });

        revalidatePath(`/dashboard/${guildId}/tickets`);
        return { success: true, message: "Configurações do Painel salvas!" };
    } catch (error) {
        console.error("Ticket Config Update Error:", error);
        return { success: false, error: "Erro ao salvar configurações." };
    }
}
