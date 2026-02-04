import { Guild } from 'discord.js';
interface ServerSchema {
    roles: {
        name: string;
        color: string;
        permissions: string[];
    }[];
    categories: {
        name: string;
        channels: {
            name: string;
            type: 'text' | 'voice';
            description?: string;
            is_private?: boolean;
            allowed_roles?: string[];
        }[];
    }[];
}
export declare class ServerBuilderService {
    /**
     * Passo 1: Gerar o plano JSON com a IA
     */
    generateServerPlan(theme: string): Promise<ServerSchema | null>;
    /**
     * Passo 2: Aplicar o plano no servidor
     */
    buildServer(guild: Guild, schema: ServerSchema, progressCallback?: (msg: string) => void): Promise<void>;
}
export declare const serverBuilder: ServerBuilderService;
export {};
//# sourceMappingURL=server-builder.service.d.ts.map