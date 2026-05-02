"use strict";
/**
 * ⚙️ Config Service - Gerenciamento de configuração
 *
 * Fornece acesso tipado às variáveis de ambiente com validação.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = exports.ConfigService = void 0;
const dotenv = __importStar(require("dotenv"));
const path = __importStar(require("path"));
// Carrega .env do web/ (prioritário ou complementar)
dotenv.config({ path: path.resolve(process.cwd(), 'web', '.env.local') });
// Carrega .env da raiz (fallback)
dotenv.config();
class ConfigService {
    /**
     * Obtém variável de ambiente
     */
    get(key, defaultValue) {
        const value = process.env[key] || defaultValue;
        if (!value) {
            throw new Error(`Variável de ambiente não definida: ${key}`);
        }
        return value;
    }
    /**
     * Obtém variável opcional
     */
    getOptional(key) {
        return process.env[key];
    }
    /**
     * Obtém como número
     */
    getNumber(key, defaultValue) {
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
    getBoolean(key, defaultValue = false) {
        const value = process.env[key]?.toLowerCase();
        if (!value)
            return defaultValue;
        return value === 'true' || value === '1' || value === 'yes';
    }
    /**
     * Valida variáveis obrigatórias
     */
    validate(required) {
        const missing = [];
        const warnings = [];
        for (const key of required) {
            const value = process.env[key];
            if (!value) {
                missing.push(key);
            }
            else if (value.includes('seu_') || value.includes('_aqui')) {
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
    getIAConfig() {
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
    getDatabaseConfig() {
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
    getRedisConfig() {
        return {
            url: this.getOptional('REDIS_URL')
        };
    }
    /**
     * Verifica se está em produção
     */
    isProduction() {
        return process.env.NODE_ENV === 'production';
    }
    /**
     * Valida formato de token Discord
     */
    isValidDiscordToken(token) {
        if (!token)
            return false;
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
exports.ConfigService = ConfigService;
// Singleton
exports.config = new ConfigService();
//# sourceMappingURL=config.service.js.map