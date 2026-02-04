"use strict";
/**
 * 🧠 LLM Service - Abstração para OpenAI/Groq/HuggingFace
 *
 * Fornece interface unificada para comunicação com APIs de LLM.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.llmService = exports.LLMService = void 0;
const openai_1 = __importDefault(require("openai"));
const config_service_1 = require("./config.service");
const logger_service_1 = require("./logger.service");
class LLMService {
    client = null;
    model;
    baseUrl;
    constructor() {
        // Force config validation/loading if not already done
        const apiKey = config_service_1.config.getOptional('OPENAI_API_KEY');
        this.baseUrl = config_service_1.config.getOptional('LLM_BASE_URL') || 'https://api.openai.com/v1';
        this.model = config_service_1.config.getOptional('MODELO_IA') || 'gpt-3.5-turbo';
        if (apiKey) {
            this.client = new openai_1.default({
                apiKey,
                baseURL: this.baseUrl
            });
            logger_service_1.logger.info(`🧠 LLM Service iniciado (${this.baseUrl})`);
        }
        else {
            logger_service_1.logger.warn('⚠️ LLM Service: Sem API key, modo mock ativado');
        }
    }
    /**
     * Gera resposta do LLM
     */
    async generateResponse(messages, systemPrompt) {
        if (!this.client) {
            return '[Mock] Resposta simulada - API key não configurada';
        }
        try {
            const formattedMessages = [];
            // Adiciona system prompt se fornecido
            if (systemPrompt) {
                formattedMessages.push({ role: 'system', content: systemPrompt });
            }
            // Adiciona mensagens do usuário
            for (const msg of messages) {
                formattedMessages.push({
                    role: msg.role,
                    content: msg.content
                });
            }
            const response = await this.client.chat.completions.create({
                model: this.model,
                messages: formattedMessages,
                max_tokens: 1000,
                temperature: 0.7
            });
            return response.choices[0]?.message?.content || '';
        }
        catch (error) {
            logger_service_1.logger.error('❌ Erro LLM:', { error });
            throw error;
        }
    }
    /**
     * Gera e valida JSON estruturado
     */
    async generateJson(systemPrompt, userMessage, retryCount = 0) {
        if (!this.client) {
            logger_service_1.logger.warn('⚠️ Mock JSON response');
            return null;
        }
        try {
            const response = await this.client.chat.completions.create({
                model: this.model,
                messages: [
                    { role: 'system', content: systemPrompt + "\n\nRESPONDA APENAS COM JSON VÁLIDO. SEM MARKDOWN." },
                    { role: 'user', content: userMessage }
                ],
                temperature: 0.5,
                response_format: { type: 'json_object' }
            });
            const content = response.choices[0]?.message?.content || '{}';
            return JSON.parse(content);
        }
        catch (error) {
            logger_service_1.logger.error('❌ Erro ao gerar JSON:', { error });
            if (retryCount < 2) {
                logger_service_1.logger.info(`🔄 Tentando novamente (${retryCount + 1})...`);
                return this.generateJson(systemPrompt, userMessage, retryCount + 1);
            }
            return null;
        }
    }
    /**
     * Parseia comando admin usando LLM
     */
    async parseAdminCommand(userMessage, adminPrompt) {
        try {
            const response = await this.generateResponse([{ role: 'user', content: userMessage }], adminPrompt);
            // Extrai JSON da resposta
            const jsonMatch = response.match(/\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/);
            if (jsonMatch) {
                try {
                    return JSON.parse(jsonMatch[0]);
                }
                catch {
                    // Tenta limpar JSON malformado
                    const cleaned = jsonMatch[0]
                        .replace(/[\n\r]/g, '')
                        .replace(/,\s*}/g, '}');
                    return JSON.parse(cleaned);
                }
            }
            return { action: 'none', params: {} };
        }
        catch (error) {
            logger_service_1.logger.error('❌ Erro ao parsear comando:', { error });
            return { action: 'none', params: {} };
        }
    }
    /**
     * Transcreve áudio usando Whisper
     */
    async transcribeAudio(_audioBuffer) {
        if (!this.client) {
            return '[Mock] Transcrição simulada';
        }
        try {
            // Nota: Implementação de upload de arquivo para Whisper
            // Requer FormData e File polyfill no Node
            logger_service_1.logger.info('🎤 Transcrevendo áudio...');
            // TODO: Implementar transcrição real
            return '';
        }
        catch (error) {
            logger_service_1.logger.error('❌ Erro na transcrição:', { error });
            throw error;
        }
    }
    /**
     * Verifica se o serviço está pronto
     */
    isReady() {
        return this.client !== null;
    }
    /**
     * Retorna informações do modelo em uso
     */
    getModelInfo() {
        return {
            model: this.model,
            baseUrl: this.baseUrl
        };
    }
}
exports.LLMService = LLMService;
// Singleton para uso global
exports.llmService = new LLMService();
//# sourceMappingURL=llm.service.js.map