/**
 * 🧠 LLM Service - Abstração para OpenAI/Groq/HuggingFace
 *
 * Fornece interface unificada para comunicação com APIs de LLM.
 */
import type { LLMMessage } from '../../types';
export declare class LLMService {
    private client;
    private model;
    private baseUrl;
    constructor();
    /**
     * Gera resposta do LLM
     */
    generateResponse(messages: LLMMessage[], systemPrompt?: string): Promise<string>;
    /**
     * Gera e valida JSON estruturado
     */
    generateJson<T>(systemPrompt: string, userMessage: string, retryCount?: number): Promise<T | null>;
    /**
     * Parseia comando admin usando LLM
     */
    parseAdminCommand(userMessage: string, adminPrompt: string): Promise<{
        action: string;
        params: Record<string, unknown>;
    }>;
    /**
     * Transcreve áudio usando Whisper
     */
    transcribeAudio(_audioBuffer: Buffer): Promise<string>;
    /**
     * Verifica se o serviço está pronto
     */
    isReady(): boolean;
    /**
     * Retorna informações do modelo em uso
     */
    getModelInfo(): {
        model: string;
        baseUrl: string;
    };
}
export declare const llmService: LLMService;
//# sourceMappingURL=llm.service.d.ts.map