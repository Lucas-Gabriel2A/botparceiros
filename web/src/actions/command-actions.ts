"use server";

import { customCommandService } from "../../bots/custom-commands/service"; // Adjust path if needed.
// Relative path from `web/src/actions` to `src/bots`
// web/src/actions -> ../../../src/bots
import { customCommandService as service } from "../../../src/bots/custom-commands/service";
import { revalidatePath } from "next/cache";
import { llmService } from "../../../src/shared/services/llm.service";

export interface CommandState {
    success?: boolean;
    error?: string;
    message?: string;
    schema?: any;
}

export async function generateCommandAction(prompt: string, context: string): Promise<CommandState> {
    try {
        const schema = await llmService.generateCommandSchema(prompt, context);
        if (!schema) {
            return { success: false, error: "Falha ao gerar comando. Tente novamente." };
        }
        return { success: true, schema };
    } catch (error) {
        console.error("Generate Command Error:", error);
        return { success: false, error: "Erro interno na IA." };
    }
}

export async function createCustomCommandAction(prevState: CommandState, formData: FormData): Promise<CommandState> {
    try {
        const guildId = formData.get("guildId") as string;
        const name = formData.get("name") as string;
        const description = formData.get("description") as string;
        const response = formData.get("response") as string;
        const actionsJson = formData.get("actions") as string;
        const optionsJson = formData.get("options") as string;
        const userId = formData.get("userId") as string;

        if (!guildId || !name || !actionsJson) {
            return { success: false, error: "Dados inválidos." };
        }

        const actions = JSON.parse(actionsJson);
        const options = optionsJson ? JSON.parse(optionsJson) : [];

        await service.create(
            guildId,
            name,
            description,
            response || null,
            actions,
            userId,
            options
        );

        revalidatePath(`/dashboard/${guildId}/commands`);
        return { success: true, message: "Comando criado com sucesso!" };
    } catch (error) {
        console.error("Create Command Error:", error);
        return { success: false, error: "Erro ao criar comando." };
    }
}

export async function deleteCustomCommandAction(commandId: string, guildId: string): Promise<CommandState> {
    try {
        await service.deleteWithGuild(commandId, guildId);
        revalidatePath(`/dashboard/${guildId}/commands`);
        return { success: true, message: "Comando removido!" };
    } catch (error) {
        console.error("Delete Command Error:", error);
        return { success: false, error: "Erro ao remover comando." };
    }
}

export async function toggleCustomCommandAction(commandId: string, enabled: boolean, guildId: string): Promise<CommandState> {
    try {
        await service.toggle(commandId, enabled);
        revalidatePath(`/dashboard/${guildId}/commands`);
        return { success: true, message: `Comando ${enabled ? 'ativado' : 'desativado'}!` };
    } catch (error) {
        console.error("Toggle Command Error:", error);
        return { success: false, error: "Erro ao alterar status." };
    }
}
