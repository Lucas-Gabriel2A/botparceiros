'use server';

import {
    createCustomCommand,
    deleteCustomCommand,
    toggleCustomCommand,
    getCustomCommands,
    CustomCommand
} from '@shared/services/database';
import { llmService } from '@shared/services/llm.service';
import { refreshGuildCommands } from '@bots/custom-commands/registration';
import { revalidatePath } from 'next/cache';

export async function generateCommandAction(prompt: string, guildContext: string) {
    try {
        const schema = await llmService.generateCommandSchema(prompt, guildContext);
        if (!schema) return { error: 'Falha ao gerar comando. Tente novamente.' };
        return { success: true, schema };
    } catch (error) {
        return { error: 'Erro interno ao gerar comando.' };
    }
}

export async function saveCommandAction(guildId: string, commandData: any, createdBy: string) {
    try {
        // Create in DB
        await createCustomCommand(
            crypto.randomUUID(),
            guildId,
            commandData.name,
            commandData.description,
            commandData.response || null,
            commandData.actions,
            createdBy
        );

        // Refresh Discord Commands
        await refreshGuildCommands(guildId);

        revalidatePath(`/dashboard/${guildId}/commands`);
        return { success: true };
    } catch (error: any) {
        console.error("Save Command Error:", error);
        return { error: error.message || 'Erro ao salvar comando.' };
    }
}

export async function deleteCommandAction(guildId: string, commandId: string) {
    try {
        await deleteCustomCommand(commandId);
        await refreshGuildCommands(guildId); // Important: Remove from Discord
        revalidatePath(`/dashboard/${guildId}/commands`);
        return { success: true };
    } catch (error) {
        return { error: 'Erro ao deletar comando.' };
    }
}

export async function toggleCommandAction(guildId: string, commandId: string, enabled: boolean) {
    try {
        await toggleCustomCommand(commandId, enabled);
        await refreshGuildCommands(guildId); // Important: Update Discord
        revalidatePath(`/dashboard/${guildId}/commands`);
        return { success: true };
    } catch (error) {
        return { error: 'Erro ao alterar status.' };
    }
}
