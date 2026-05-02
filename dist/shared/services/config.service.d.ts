/**
 * ⚙️ Config Service - Gerenciamento de configuração
 *
 * Fornece acesso tipado às variáveis de ambiente com validação.
 */
export interface BotConfig {
    token: string;
    clientId?: string;
    guildId?: string;
    ownerRoleId?: string;
    semiOwnerRoleId?: string;
    staffRoleId?: string;
}
export interface IAConfig extends BotConfig {
    categoriaAssistente?: string;
    canalAssistente?: string;
    canalChatGeral?: string;
    openaiApiKey: string;
    llmBaseUrl: string;
    modeloIa: string;
    tempoOciosoMinutos: number;
}
export interface DatabaseConfig {
    url?: string;
    host?: string;
    port?: number;
    user?: string;
    password?: string;
    database?: string;
}
export interface RedisConfig {
    url?: string;
}
export declare class ConfigService {
    /**
     * Obtém variável de ambiente
     */
    get(key: string, defaultValue?: string): string;
    /**
     * Obtém variável opcional
     */
    getOptional(key: string): string | undefined;
    /**
     * Obtém como número
     */
    getNumber(key: string, defaultValue?: number): number;
    /**
     * Obtém como boolean
     */
    getBoolean(key: string, defaultValue?: boolean): boolean;
    /**
     * Valida variáveis obrigatórias
     */
    validate(required: string[]): void;
    /**
     * Configurações específicas do Bot IA
     */
    getIAConfig(): IAConfig;
    /**
     * Configurações de banco de dados
     */
    getDatabaseConfig(): DatabaseConfig;
    /**
     * Configuração do Redis
     */
    getRedisConfig(): RedisConfig;
    /**
     * Verifica se está em produção
     */
    isProduction(): boolean;
    /**
     * Valida formato de token Discord
     */
    isValidDiscordToken(token: string): boolean;
    /**
     * Constantes e IDs do Servidor
     */
    getConstants(): {
        roles: {
            owner: string | undefined;
            semiOwner: string | undefined;
            staff: string | undefined;
            vip: string | undefined;
            member: string | undefined;
        };
        categories: {
            tickets: string | undefined;
            privateCalls: string | undefined;
            voiceChannels: string | undefined;
        };
        channels: {
            logs: string | undefined;
            welcome: string | undefined;
            rules: string | undefined;
        };
    };
}
export declare const config: ConfigService;
//# sourceMappingURL=config.service.d.ts.map