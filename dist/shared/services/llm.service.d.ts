/**
 * LLM Service - Orquestrador Inteligente de IA (CoreBot)
 *
 * Interface unificada e avancada para interagir com modelos de linguagem
 * (OpenAI / Groq / HuggingFace / compativeis). Esta versao foi desenhada
 * para suportar criacoes completas feitas pelo agente:
 *   planejar -> gerar -> validar -> auto-corrigir.
 *
 * Capacidades:
 *  - Chat textual + opcoes avancadas (model, tokens, temperature, ...)
 *  - Multimodal: envio de imagens (vision) em qualquer chamada
 *  - Streaming token-a-token
 *  - JSON estruturado robusto com multiplas estrategias de parsing + auto-reparo
 *  - Tool use / function calling + loop de agente (plan -> act -> reflect)
 *  - Retry com backoff exponencial e respeito a rate limit
 *  - Fallback automatico entre modelos
 *  - Tracking de uso de tokens
 *  - Cache opcional de respostas idempotentes
 *  - Compressao de historico quando o contexto cresce
 *  - Transcricao Whisper + TTS + geracao de imagem
 *  - Parser de comando admin e geracao de schemas
 *
 * Mantem 100% de compatibilidade com a API antiga:
 *  generateResponse, generateJson, parseAdminCommand, generateCommandSchema,
 *  transcribeAudio, isReady, getModelInfo.
 */
import type { LLMMessage } from '../../types';
export type LLMRole = 'system' | 'user' | 'assistant' | 'tool';
export interface ChatOptions {
    model?: string;
    temperature?: number;
    maxTokens?: number;
    topP?: number;
    frequencyPenalty?: number;
    presencePenalty?: number;
    jsonMode?: boolean;
    imageUrl?: string | null;
    stop?: string[];
    maxRetries?: number;
    retryBaseMs?: number;
    enableFallback?: boolean;
    tools?: ToolDefinition[];
    toolChoice?: 'auto' | 'none' | {
        type: 'function';
        function: {
            name: string;
        };
    };
    cache?: boolean;
    cacheTtlMs?: number;
}
export interface ToolDefinition {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
    execute?: (args: Record<string, unknown>) => Promise<unknown>;
}
export interface ToolCall {
    id: string;
    name: string;
    args: Record<string, unknown>;
}
export interface ChatResult {
    content: string;
    toolCalls?: ToolCall[];
    model: string;
    finishReason?: string;
    usage?: {
        prompt_tokens: number;
        completion_tokens: number;
        total_tokens: number;
    };
}
export interface AgentStep {
    iteration: number;
    thought?: string;
    toolCalls: ToolCall[];
    toolResults: Array<{
        id: string;
        name: string;
        result: unknown;
        error?: string;
    }>;
    content: string;
}
export interface AgentResult {
    finalAnswer: string;
    steps: AgentStep[];
    totalTokens: number;
    completed: boolean;
}
export declare class LLMService {
    private client;
    private model;
    private baseUrl;
    private visionModel;
    private fallbackModels;
    private stats;
    private cache;
    constructor();
    generateResponse(messages: LLMMessage[], systemPrompt?: string): Promise<string>;
    generateJson<T>(systemPrompt: string, userMessage: string, retryCount?: number): Promise<T | null>;
    parseAdminCommand(userMessage: string, adminPrompt: string): Promise<{
        action: string;
        params: Record<string, unknown>;
    }>;
    transcribeAudio(audioBuffer: Buffer, filename?: string, language?: string): Promise<string>;
    isReady(): boolean;
    getModelInfo(): {
        model: string;
        baseUrl: string;
        visionModel: string;
        fallbacks: string[];
    };
    getStats(): {
        cacheSize: number;
        totalRequests: number;
        totalTokens: number;
        totalErrors: number;
        totalRetries: number;
        toolCalls: number;
    };
    clearCache(): void;
    /**
     * Chat avancado: aceita todas as opcoes. Retorna conteudo + tool calls + uso.
     * E o metodo nucleo usado por todos os helpers (incluindo o agente).
     */
    chat(messages: LLMMessage[], options?: ChatOptions): Promise<ChatResult>;
    /**
     * Chat em streaming: chama onChunk para cada delta recebido.
     * Retorna o texto completo ao final.
     */
    chatStream(messages: LLMMessage[], onChunk: (delta: string, full: string) => void | Promise<void>, options?: ChatOptions): Promise<string>;
    /** Atalho multimodal: texto + imagem em 1 chamada. */
    generateWithVision(prompt: string, imageUrl: string, systemPrompt?: string, options?: ChatOptions): Promise<string>;
    /**
     * Loop de agente: recebe um objetivo + ferramentas e executa iteracoes
     * plan/act/reflect ate chegar na resposta final ou atingir maxIterations.
     * E o metodo que permite o agente fazer "criacoes completas" em cadeia
     * (ex: criar cargo -> criar categoria -> criar canal -> enviar embed).
     */
    runAgent(goal: string, tools: ToolDefinition[], options?: {
        systemPrompt?: string;
        context?: string;
        maxIterations?: number;
        model?: string;
        temperature?: number;
        onStep?: (step: AgentStep) => void | Promise<void>;
    }): Promise<AgentResult>;
    /** Divide uma tarefa complexa em passos acionaveis (planner). */
    planTask(goal: string, context?: string): Promise<{
        steps: string[];
        rationale: string;
    } | null>;
    /** Extracao de dados estruturados a partir de texto livre com schema. */
    extractStructuredData<T>(text: string, schemaDescription: string, example?: unknown): Promise<T | null>;
    /** Comprime historico longo em resumo denso preservando decisoes-chave. */
    summarizeConversation(messages: LLMMessage[]): Promise<string>;
    /** Geracao de imagem (DALL-E compativel). Retorna URL ou null. */
    generateImage(prompt: string, options?: {
        size?: '1024x1024' | '1792x1024' | '1024x1792';
        model?: string;
    }): Promise<string | null>;
    /** Text-to-speech. Retorna Buffer com audio (mp3 por default). */
    textToSpeech(text: string, options?: {
        voice?: string;
        model?: string;
        format?: 'mp3' | 'wav' | 'opus';
    }): Promise<Buffer | null>;
    /** Gera schema de comando personalizado para Discord (compativel retro). */
    generateCommandSchema(prompt: string, guildContext?: string): Promise<{
        name: string;
        description: string;
        response?: string;
        actions: any[];
    } | null>;
    private buildMessages;
    /** Tenta parsear JSON de varias formas antes de desistir. */
    private parseJsonRobust;
    /** Extrai o primeiro objeto/array JSON balanceado do texto. */
    private extractBalancedJson;
    /** Pede ao modelo para consertar um JSON quebrado. */
    private repairJson;
    private safeJsonParse;
    private cacheKey;
    private backoffMs;
    private delay;
    private defaultAgentPrompt;
}
export declare const llmService: LLMService;
//# sourceMappingURL=llm.service.d.ts.map