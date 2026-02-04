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
class LLMService {
    client = null;
    model;
    baseUrl;
    constructor() {
        const apiKey = process.env.OPENAI_API_KEY;
        this.baseUrl = process.env.LLM_BASE_URL || 'https://api.openai.com/v1';
        this.model = process.env.MODELO_IA || 'gpt-3.5-turbo';
        if (apiKey) {
            this.client = new openai_1.default({
                apiKey,
                baseURL: this.baseUrl
            });
            console.log(`🧠 LLM Service iniciado (${this.baseUrl})`);
        }
        else {
            console.warn('⚠️ LLM Service: Sem API key, modo mock ativado');
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
            console.error('❌ Erro LLM:', error);
            throw error;
        }
    }
    /**
     * Gera e valida JSON estruturado
     */
    async generateJson(systemPrompt, userMessage, retryCount = 0) {
        if (!this.client) {
            console.warn('⚠️ Mock JSON response');
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
            console.error('❌ Erro ao gerar JSON:', error);
            if (retryCount < 2) {
                console.log(`🔄 Tentando novamente (${retryCount + 1})...`);
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
            console.error('❌ Erro ao parsear comando:', error);
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
            console.log('🎤 Transcrevendo áudio...');
            // TODO: Implementar transcrição real
            return '';
        }
        catch (error) {
            console.error('❌ Erro na transcrição:', error);
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