/**
 * ⚙️ Config Service - Gerenciamento de configuração
 * 
 * Fornece acesso tipado às variáveis de ambiente com validação.
 */

import * as dotenv from 'dotenv';
import * as path from 'path';

// Carrega .env do web/ (prioritário ou complementar)
dotenv.config({ path: path.resolve(process.cwd(), 'web', '.env.local') });

// Carrega .env da raiz (fallback)
dotenv.config();

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

export class ConfigService {

    /**
     * Obtém variável de ambiente
     */
    get(key: string, defaultValue?: string): string {
        const value = process.env[key] || defaultValue;
        if (!value) {
            throw new Error(`Variável de ambiente não definida: ${key}`);
        }
        return value;
    }

    /**
     * Obtém variável opcional
     */
    getOptional(key: string): string | undefined {
        return process.env[key];
    }

    /**
     * Obtém como número
     */
    getNumber(key: string, defaultValue?: number): number {
        const value = process.env[key];
        if (!value && defaultValue !== undefined) {
            return defaultValue;
        }
        const num = parseInt(value || '', 10);
        if (isNaN(num)) {
            throw new Error(`Variável ${key} não é um número válido`);
        }
        return num;
    }

    /**
     * Obtém como boolean
     */
    getBoolean(key: string, defaultValue = false): boolean {
        const value = process.env[key]?.toLowerCase();
        if (!value) return defaultValue;
        return value === 'true' || value === '1' || value === 'yes';
    }

    /**
     * Valida variáveis obrigatórias
     */
    validate(required: string[]): void {
        const missing: string[] = [];
        const warnings: string[] = [];

        for (const key of required) {
            const value = process.env[key];
            if (!value) {
                missing.push(key);
            } else if (value.includes('seu_') || value.includes('_aqui')) {
                warnings.push(`${key} parece ser um placeholder`);
            }
        }

        if (warnings.length > 0) {
            console.warn('\n⚠️ AVISOS DE CONFIGURAÇÃO:');
            warnings.forEach(w => console.warn(`   ${w}`));
        }

        if (missing.length > 0) {
            console.error('\n❌ ERRO: Variáveis obrigatórias não definidas:');
            missing.forEach(key => console.error(`   • ${key}`));
            console.error('\n📋 Copie .env.example para .env e preencha.\n');
            process.exit(1);
        }
    }

    /**
     * Configurações específicas do Bot IA
     */
    getIAConfig(): IAConfig {
        return {
            token: this.get('DISCORD_TOKEN_AGENTE_IA'),
            ownerRoleId: this.getOptional('OWNER_ROLE_ID'),
            semiOwnerRoleId: this.getOptional('SEMI_OWNER_ROLE_ID'),
            staffRoleId: this.getOptional('STAFF_ROLE_ID'),
            categoriaAssistente: this.getOptional('CATEGORIA_ASSISTENTE'),
            canalAssistente: this.getOptional('CANAL_ASSISTENTE'),
            canalChatGeral: this.getOptional('CANAL_CHAT_GERAL'),
            openaiApiKey: this.get('OPENAI_API_KEY'),
            llmBaseUrl: this.get('LLM_BASE_URL', 'https://api.openai.com/v1'),
            modeloIa: this.get('MODELO_IA', 'gpt-3.5-turbo'),
            tempoOciosoMinutos: this.getNumber('TEMPO_OCIOSO_MINUTOS', 30)
        };
    }

    /**
     * Configurações de banco de dados
     */
    getDatabaseConfig(): DatabaseConfig {
        return {
            url: this.getOptional('DATABASE_URL'),
            host: this.getOptional('DB_HOST'),
            port: this.getNumber('DB_PORT', 5432),
            user: this.getOptional('DB_USER'),
            password: this.getOptional('DB_PASSWORD'),
            database: this.getOptional('DB_NAME')
        };
    }

    /**
     * Configuração do Redis
     */
    getRedisConfig(): RedisConfig {
        return {
            url: this.getOptional('REDIS_URL')
        };
    }

    /**
     * Verifica se está em produção
     */
    isProduction(): boolean {
        return process.env.NODE_ENV === 'production';
    }

    /**
     * Valida formato de token Discord
     */
    isValidDiscordToken(token: string): boolean {
        if (!token) return false;
        const parts = token.split('.');
        return parts.length === 3 && parts[0].length > 10;
    }

    /**
     * Constantes e IDs do Servidor
     */
    getConstants() {
        return {
            roles: {
                owner: this.getOptional('OWNER_ROLE_ID'),
                semiOwner: this.getOptional('SEMI_OWNER_ROLE_ID'),
                staff: this.getOptional('STAFF_ROLE_ID'),
                vip: this.getOptional('VIP_ROLE_ID'),
                member: this.getOptional('MEMBER_ROLE_ID')
            },
            categories: {
                tickets: this.getOptional('TICKET_CATEGORY_ID'),
                privateCalls: this.getOptional('PRIVATE_CALL_CATEGORY_ID'),
                voiceChannels: this.getOptional('VOICE_CATEGORY_ID')
            },
            channels: {
                logs: this.getOptional('LOGS_CHANNEL_ID'),
                welcome: this.getOptional('WELCOME_CHANNEL_ID'),
                rules: this.getOptional('RULES_CHANNEL_ID')
            }
        };
    }
}

// Singleton
export const config = new ConfigService();
