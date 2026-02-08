import { z } from "zod";

export const CoreBotSchema = z.object({
    guildId: z.string(),
    ia_enabled: z.boolean().default(true),
    ia_channel_id: z.string().optional().or(z.literal('')), // Pode ser vazio
    ia_system_prompt: z.string().max(2000, "O prompt deve ter no máximo 2000 caracteres").optional(),
    ia_voice_enabled: z.boolean().default(true)
});

export type CoreBotConfigForm = z.infer<typeof CoreBotSchema>;
