import { Guild } from 'discord.js';
interface ServerChannel {
    name: string;
    type: 'text' | 'voice' | 'stage' | 'forum' | 'announcement';
    description?: string;
    user_limit?: number;
    is_private?: boolean;
    slowmode?: number;
    nsfw?: boolean;
    allowed_roles?: string[];
}
interface ServerCategory {
    name: string;
    channels: ServerChannel[];
}
interface ServerRole {
    name: string;
    color: string;
    permissions: string[];
    hoist?: boolean;
    mentionable?: boolean;
}
interface ServerSchema {
    roles: ServerRole[];
    categories: ServerCategory[];
}
interface AdjustmentAction {
    type: 'create_category' | 'create_channel' | 'rename_category' | 'rename_channel' | 'delete_category' | 'delete_channel' | 'create_role' | 'set_user_limit';
    name?: string;
    category_name?: string;
    channel_type?: 'text' | 'voice' | 'stage' | 'forum' | 'announcement';
    old_name?: string;
    new_name?: string;
    color?: string;
    user_limit?: number;
}
interface AdjustmentSchema {
    actions: AdjustmentAction[];
    message: string;
}
export declare class ServerBuilderService {
    /**
     * Mapeia tipo de canal do schema para ChannelType do Discord.js
     */
    private getChannelType;
    /**
     * Pós-processador: Garante que todos os nomes sigam o padrão decorativo
     */
    private postProcessSchema;
    /**
     * Passo 1: Gerar o plano JSON com a LLM
     */
    generateServerPlan(theme: string): Promise<ServerSchema | null>;
    /**
     * Passo 2: Construir o servidor com todas as features
     */
    buildServer(guild: Guild, schema: ServerSchema, progressCallback?: (msg: string) => void): Promise<void>;
    /**
     * Gerar plano de ajustes
     */
    generateAdjustmentPlan(userRequest: string): Promise<AdjustmentSchema | null>;
    /**
     * Aplicar ajustes no servidor
     */
    applyAdjustments(guild: Guild, schema: AdjustmentSchema, progressCallback?: (msg: string) => void): Promise<void>;
}
export declare const serverBuilder: ServerBuilderService;
export {};
//# sourceMappingURL=server-builder.service.d.ts.map