import { z } from "zod";

// Helper flexível para lidar com JSON em strings, ou strings separadas por vírgula vindas do formData
const JSONStringArray = z.string().optional().nullable().transform((str, ctx) => {
    if (!str) return [];
    try {
        const parsed = JSON.parse(str);
        if (Array.isArray(parsed)) return parsed.map(String);
        return [];
    } catch {
        if (str.includes(',')) return str.split(',').map(s => s.trim()).filter(Boolean);
        return [str.trim()].filter(Boolean); // Se for um só elemento sem vírgula
    }
});

// Checkbox parser string to boolean
const CheckboxToBoolean = z.string().optional().nullable().transform(val => val === "on");

export const CoreBotActionSchema = z.object({
    guildId: z.string().min(17),
    iaEnabled: CheckboxToBoolean,
    channelId: z.string().optional().nullable(),
    systemPrompt: z.string().max(2000, "O prompt é limitado a 2000 caracteres.").optional().nullable(),
    iaTemperature: z.coerce.number().min(0).max(2).default(0.7),
    iaIgnoredChannels: JSONStringArray,
    iaIgnoredRoles: JSONStringArray,
    iaTriggers: JSONStringArray
});

export const AutoModActionSchema = z.object({
    guildId: z.string().min(17),
    automodLinks: CheckboxToBoolean,
    automodCaps: CheckboxToBoolean,
    automodSpam: CheckboxToBoolean,
    automodAiEnabled: CheckboxToBoolean,
    prohibitedWords: JSONStringArray,
    automodChannelId: z.string().optional().nullable(),
    automodAction: z.enum(['delete', 'timeout', 'kick', 'ban']).default('delete'),
    automodTimeoutDuration: z.coerce.number().min(0).default(0),
    automodLogChannel: z.string().optional().nullable(),
    automodBypassRoles: JSONStringArray
});

export const TicketCategorySchema = z.object({
    guildId: z.string().min(17),
    categoryId: z.string().optional().nullable(), // Optional for updates
    name: z.string().min(1, "O nome da categoria é obrigatório").max(100),
    description: z.string().max(255).optional().nullable(),
    color: z.string().max(20).optional().nullable(),
    userId: z.string().min(1), // Required for tracking limitations
    emoji: z.string().max(100).optional().nullable(),
    ticketChannelCategoryId: z.string().optional().nullable(),
    supportRoleId: z.string().optional().nullable(),
    welcomeTitle: z.string().max(100).optional().nullable(),
    welcomeDescription: z.string().max(1000).optional().nullable(),
});

export const WelcomeConfigSchema = z.object({
    guildId: z.string().min(17),
    welcomeMessage: z.string().max(2000).optional().nullable(),
    leaveMessage: z.string().max(2000).optional().nullable(),
    welcomeChannelId: z.string().optional().nullable(),
    leaveChannelId: z.string().optional().nullable(),
    autoroleId: z.string().optional().nullable(),
    welcome_font: z.string().optional().nullable(),
    userId: z.string().min(1)
});

export const PrivateCallsSchema = z.object({
    guildId: z.string().min(17),
    privateCallsEnabled: z.coerce.boolean().default(false),
    privateCallsCategoryId: z.string().optional().nullable(),
    privateCallsManagerRole: z.string().optional().nullable(),
    privateCallsAllowedRoles: JSONStringArray
});

export const TicketPanelSchema = z.object({
    guildId: z.string().min(17),
    title: z.string().max(200).optional().nullable(),
    description: z.string().max(2000).optional().nullable(),
    color: z.string().max(20).optional().nullable(),
    buttonText: z.string().max(80).optional().nullable(),
    buttonEmoji: z.string().max(50).optional().nullable(),
    footer: z.string().max(200).optional().nullable(),
    logsChannelId: z.string().optional().nullable(),
    bannerUrl: z.string().optional().nullable()
});
