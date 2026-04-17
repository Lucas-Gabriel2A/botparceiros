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

import OpenAI from 'openai';
import { toFile } from 'openai/uploads';
import { config } from './config.service';
import { logger } from './logger.service';
import type { LLMMessage } from '../../types';

// ======================================================================
// TIPOS PUBLICOS
// ======================================================================

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
    toolChoice?: 'auto' | 'none' | { type: 'function'; function: { name: string } };
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
    toolResults: Array<{ id: string; name: string; result: unknown; error?: string }>;
    content: string;
}

export interface AgentResult {
    finalAnswer: string;
    steps: AgentStep[];
    totalTokens: number;
    completed: boolean;
}

interface CacheEntry { value: ChatResult; expires: number; }

// ======================================================================
// LLM SERVICE
// ======================================================================

export class LLMService {
    private client: OpenAI | null = null;
    private model: string;
    private baseUrl: string;
    private visionModel: string;
    private fallbackModels: string[];

    private stats = {
        totalRequests: 0,
        totalTokens: 0,
        totalErrors: 0,
        totalRetries: 0,
        toolCalls: 0
    };

    private cache = new Map<string, CacheEntry>();

    constructor() {
        const apiKey = config.getOptional('OPENAI_API_KEY');
        this.baseUrl = config.getOptional('LLM_BASE_URL') || 'https://api.openai.com/v1';
        this.model = config.getOptional('MODELO_IA') || 'gpt-3.5-turbo';

        this.visionModel =
            config.getOptional('MODELO_VISAO') ||
            (this.baseUrl.includes('groq')
                ? 'meta-llama/llama-4-scout-17b-16e-instruct'
                : 'gpt-4o-mini');

        const fallbackEnv = config.getOptional('MODELOS_FALLBACK');
        this.fallbackModels = fallbackEnv
            ? fallbackEnv.split(',').map((s: string) => s.trim()).filter(Boolean)
            : this.baseUrl.includes('groq')
                ? ['llama-3.1-8b-instant', 'gemma2-9b-it']
                : ['gpt-3.5-turbo'];

        if (apiKey) {
            this.client = new OpenAI({ apiKey, baseURL: this.baseUrl });
            logger.info(`LLM Service iniciado (${this.baseUrl}) modelo=${this.model} vision=${this.visionModel}`);
        } else {
            logger.warn('LLM Service: sem API key, modo mock ativado');
        }
    }

    // ==================================================================
    // API RETRO-COMPATIVEL
    // ==================================================================

    async generateResponse(messages: LLMMessage[], systemPrompt?: string): Promise<string> {
        if (!this.client) return '[Mock] Resposta simulada - API key nao configurada';
        const built: LLMMessage[] = [];
        if (systemPrompt) built.push({ role: 'system', content: systemPrompt });
        built.push(...messages);
        const res = await this.chat(built, { maxTokens: 4000, temperature: 0.7 });
        return res.content;
    }

    async generateJson<T>(systemPrompt: string, userMessage: string, retryCount = 0): Promise<T | null> {
        if (!this.client) { logger.warn('Mock JSON response'); return null; }

        const finalSystem =
            systemPrompt +
            '\n\nRESPONDA APENAS COM JSON VALIDO E COMPLETO. SEM MARKDOWN, SEM CERCAS, SEM COMENTARIOS.';

        try {
            const result = await this.chat(
                [
                    { role: 'system', content: finalSystem },
                    { role: 'user', content: userMessage }
                ],
                { temperature: 0.4, maxTokens: 4000, jsonMode: true, maxRetries: 2, enableFallback: true }
            );

            const parsed = this.parseJsonRobust<T>(result.content);
            if (parsed !== null) return parsed;

            if (retryCount < 2) {
                logger.info(`JSON invalido - tentando auto-reparo (${retryCount + 1}/2)`);
                const repaired = await this.repairJson<T>(result.content);
                if (repaired !== null) return repaired;
                return this.generateJson(systemPrompt, userMessage, retryCount + 1);
            }
            logger.error('Nao foi possivel gerar JSON valido apos retries.');
            return null;
        } catch (error) {
            logger.error('Erro ao gerar JSON:', { error });
            if (retryCount < 2) {
                await this.delay(this.backoffMs(retryCount));
                return this.generateJson(systemPrompt, userMessage, retryCount + 1);
            }
            return null;
        }
    }

    async parseAdminCommand(
        userMessage: string,
        adminPrompt: string
    ): Promise<{ action: string; params: Record<string, unknown> }> {
        try {
            const parsed = await this.generateJson<{ action: string; params: Record<string, unknown> }>(
                adminPrompt,
                userMessage
            );
            if (parsed && typeof parsed.action === 'string') {
                parsed.params = parsed.params || {};
                return parsed;
            }
            return { action: 'none', params: {} };
        } catch (error) {
            logger.error('Erro ao parsear comando admin:', { error });
            return { action: 'none', params: {} };
        }
    }

    async transcribeAudio(audioBuffer: Buffer, filename = 'audio.mp3', language?: string): Promise<string> {
        if (!this.client) return '[Mock] Transcricao simulada';
        try {
            logger.info(`Transcrevendo audio (${audioBuffer.length} bytes, ${filename})`);
            const file = await toFile(audioBuffer, filename);
            const transcriptionModel = config.getOptional('MODELO_WHISPER') || 'whisper-large-v3-turbo';
            const response = await this.client.audio.transcriptions.create({
                file,
                model: transcriptionModel,
                language,
                response_format: 'text'
            } as any);
            const text = typeof response === 'string' ? response : (response as any).text || '';
            logger.info(`Audio transcrito (${text.length} chars)`);
            return text;
        } catch (error: any) {
            logger.error('Erro na transcricao:', { error: error?.message || error });
            return '';
        }
    }

    isReady(): boolean { return this.client !== null; }

    getModelInfo(): { model: string; baseUrl: string; visionModel: string; fallbacks: string[] } {
        return {
            model: this.model,
            baseUrl: this.baseUrl,
            visionModel: this.visionModel,
            fallbacks: [...this.fallbackModels]
        };
    }

    getStats() { return { ...this.stats, cacheSize: this.cache.size }; }

    clearCache(): void { this.cache.clear(); }

    // ==================================================================
    // API AVANCADA - CHAT NUCLEO
    // ==================================================================

    /**
     * Chat avancado: aceita todas as opcoes. Retorna conteudo + tool calls + uso.
     * E o metodo nucleo usado por todos os helpers (incluindo o agente).
     */
    async chat(messages: LLMMessage[], options: ChatOptions = {}): Promise<ChatResult> {
        if (!this.client) return { content: '[Mock] API key nao configurada', model: 'mock' };

        const cacheKey = options.cache ? this.cacheKey(messages, options) : null;
        if (cacheKey) {
            const hit = this.cache.get(cacheKey);
            if (hit && hit.expires > Date.now()) return hit.value;
        }

        const {
            temperature = 0.7,
            maxTokens = 4000,
            topP,
            frequencyPenalty,
            presencePenalty,
            jsonMode = false,
            imageUrl = null,
            stop,
            maxRetries = 3,
            retryBaseMs = 800,
            enableFallback = true,
            tools,
            toolChoice = 'auto'
        } = options;

        const primaryModel = imageUrl ? this.visionModel : (options.model || this.model);
        const modelChain = [
            primaryModel,
            ...(enableFallback ? this.fallbackModels.filter(m => m !== primaryModel) : [])
        ];

        let lastError: unknown = null;
        const formatted = this.buildMessages(messages, imageUrl);

        for (const mdl of modelChain) {
            for (let attempt = 0; attempt <= maxRetries; attempt++) {
                try {
                    this.stats.totalRequests++;
                    const params: any = {
                        model: mdl,
                        messages: formatted,
                        temperature,
                        max_tokens: maxTokens,
                        top_p: topP,
                        frequency_penalty: frequencyPenalty,
                        presence_penalty: presencePenalty,
                        stop
                    };
                    if (jsonMode) params.response_format = { type: 'json_object' };
                    if (tools && tools.length) {
                        params.tools = tools.map((t) => {
                            const fn = {
                                name: t.name,
                                description: t.description,
                                parameters: t.parameters
                            };
                            const entry: any = { type: 'function' };
                            entry.function = fn;
                            return entry;
                        });
                        params.tool_choice = toolChoice;
                    }

                    const response = await this.client.chat.completions.create(params);
                    const choice = response.choices[0];
                    const content = choice?.message?.content || '';
                    const rawToolCalls: any[] = (choice?.message as any)?.tool_calls || [];
                    const toolCalls: ToolCall[] = rawToolCalls.map((c: any) => ({
                        id: c.id,
                        name: c.function?.name,
                        args: this.safeJsonParse(c.function?.arguments) || {}
                    }));

                    if (response.usage) this.stats.totalTokens += response.usage.total_tokens || 0;
                    if (toolCalls.length) this.stats.toolCalls += toolCalls.length;

                    const result: ChatResult = {
                        content,
                        toolCalls: toolCalls.length ? toolCalls : undefined,
                        model: mdl,
                        finishReason: choice?.finish_reason,
                        usage: response.usage ? {
                            prompt_tokens: response.usage.prompt_tokens,
                            completion_tokens: response.usage.completion_tokens,
                            total_tokens: response.usage.total_tokens
                        } : undefined
                    };

                    if (cacheKey) this.cache.set(cacheKey, {
                        value: result,
                        expires: Date.now() + (options.cacheTtlMs || 60_000)
                    });
                    return result;
                } catch (error: any) {
                    lastError = error;
                    this.stats.totalErrors++;
                    const status = error?.status || error?.response?.status;
                    const msg = error?.message || String(error);
                    const retriable =
                        status === 429 || status === 500 || status === 502 || status === 503 || status === 504;
                    logger.warn(
                        `Erro LLM (model=${mdl} attempt=${attempt + 1}/${maxRetries + 1} status=${status}): ${msg}`
                    );
                    if (!retriable || attempt === maxRetries) break;
                    this.stats.totalRetries++;
                    await this.delay(this.backoffMs(attempt, retryBaseMs, status === 429));
                }
            }
        }

        logger.error('Todas as tentativas LLM falharam:', { error: lastError });
        return {
            content: 'Desculpe, estou com problemas para responder agora. Tente novamente.',
            model: 'error'
        };
    }

    /**
     * Chat em streaming: chama onChunk para cada delta recebido.
     * Retorna o texto completo ao final.
     */
    async chatStream(
        messages: LLMMessage[],
        onChunk: (delta: string, full: string) => void | Promise<void>,
        options: ChatOptions = {}
    ): Promise<string> {
        if (!this.client) {
            const mock = '[Mock stream] API key nao configurada';
            await onChunk(mock, mock);
            return mock;
        }
        const {
            temperature = 0.7,
            maxTokens = 4000,
            jsonMode = false,
            imageUrl = null,
            model
        } = options;
        const formatted = this.buildMessages(messages, imageUrl);
        const chosenModel = imageUrl ? this.visionModel : (model || this.model);
        try {
            const params: any = {
                model: chosenModel,
                messages: formatted,
                temperature,
                max_tokens: maxTokens,
                stream: true
            };
            if (jsonMode) params.response_format = { type: 'json_object' };
            const stream = await this.client.chat.completions.create(params);
            let full = '';
            for await (const part of stream as any) {
                const delta = part?.choices?.[0]?.delta?.content || '';
                if (delta) {
                    full += delta;
                    await onChunk(delta, full);
                }
            }
            return full;
        } catch (error) {
            logger.error('Erro no streaming LLM:', { error });
            return '';
        }
    }

    /** Atalho multimodal: texto + imagem em 1 chamada. */
    async generateWithVision(
        prompt: string,
        imageUrl: string,
        systemPrompt = 'Voce e a IA do CoreBot. Descreva e analise imagens com precisao.',
        options: ChatOptions = {}
    ): Promise<string> {
        const res = await this.chat(
            [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: prompt || 'Analise esta imagem.' }
            ],
            { ...options, imageUrl, maxTokens: options.maxTokens ?? 2000 }
        );
        return res.content;
    }

    // ==================================================================
    // LOOP DE AGENTE (PLAN -> ACT -> REFLECT)
    // ==================================================================

    /**
     * Loop de agente: recebe um objetivo + ferramentas e executa iteracoes
     * plan/act/reflect ate chegar na resposta final ou atingir maxIterations.
     * E o metodo que permite o agente fazer "criacoes completas" em cadeia
     * (ex: criar cargo -> criar categoria -> criar canal -> enviar embed).
     */
    async runAgent(
        goal: string,
        tools: ToolDefinition[],
        options: {
            systemPrompt?: string;
            context?: string;
            maxIterations?: number;
            model?: string;
            temperature?: number;
            onStep?: (step: AgentStep) => void | Promise<void>;
        } = {}
    ): Promise<AgentResult> {
        const {
            systemPrompt,
            context,
            maxIterations = 8,
            model,
            temperature = 0.3,
            onStep
        } = options;

        if (!this.client) {
            return { finalAnswer: '[Mock] Agent sem API key', steps: [], totalTokens: 0, completed: false };
        }

        const baseSystem = systemPrompt || this.defaultAgentPrompt();
        const toolSpec = tools.map(t => `- ${t.name}: ${t.description}`).join('\n');
        const fullSystem =
            baseSystem +
            '\n\nFERRAMENTAS DISPONIVEIS:\n' + toolSpec +
            '\n\n' + (context ? ('CONTEXTO:\n' + context + '\n\n') : '') +
            'REGRAS:\n' +
            '1. Pense passo a passo.\n' +
            '2. Use as ferramentas quando precisar agir.\n' +
            '3. So encerre com a resposta final quando o objetivo estiver atingido.';

        const history: LLMMessage[] = [
            { role: 'system', content: fullSystem },
            { role: 'user', content: 'OBJETIVO: ' + goal }
        ];

        const steps: AgentStep[] = [];
        let totalTokens = 0;
        let completed = false;
        let finalAnswer = '';

        for (let i = 1; i <= maxIterations; i++) {
            const res = await this.chat(history, {
                model,
                temperature,
                maxTokens: 4000,
                tools,
                toolChoice: 'auto'
            });
            totalTokens += res.usage?.total_tokens || 0;

            const step: AgentStep = {
                iteration: i,
                thought: res.content,
                toolCalls: res.toolCalls || [],
                toolResults: [],
                content: res.content
            };

            if (res.toolCalls?.length) {
                history.push({ role: 'assistant', content: res.content || '' });
                for (const call of res.toolCalls) {
                    const tool = tools.find(t => t.name === call.name);
                    if (!tool || !tool.execute) {
                        step.toolResults.push({
                            id: call.id,
                            name: call.name,
                            result: null,
                            error: 'Ferramenta ' + call.name + ' sem executor.'
                        });
                        history.push({
                            role: 'user',
                            content: '[Resultado tool ' + call.name + '] ERRO: sem executor.'
                        });
                        continue;
                    }
                    try {
                        const out = await tool.execute(call.args);
                        step.toolResults.push({ id: call.id, name: call.name, result: out });
                        history.push({
                            role: 'user',
                            content: '[Resultado tool ' + call.name + '] ' +
                                JSON.stringify(out).slice(0, 4000)
                        });
                    } catch (err: any) {
                        step.toolResults.push({
                            id: call.id,
                            name: call.name,
                            result: null,
                            error: err?.message || String(err)
                        });
                        history.push({
                            role: 'user',
                            content: '[Erro tool ' + call.name + '] ' + (err?.message || err)
                        });
                    }
                }
                await onStep?.(step);
                steps.push(step);
            } else {
                finalAnswer = res.content;
                completed = true;
                await onStep?.(step);
                steps.push(step);
                break;
            }

            // Compressao defensiva de historico
            if (history.length > 24) {
                history.splice(1, history.length - 18);
            }
        }

        if (!completed) {
            const conclude = await this.chat(
                [
                    ...history,
                    {
                        role: 'user',
                        content:
                            'Encerre agora: entregue a resposta final com base no que ja foi feito, sem chamar novas ferramentas.'
                    }
                ],
                { temperature: 0.2, maxTokens: 2000 }
            );
            finalAnswer = conclude.content;
            totalTokens += conclude.usage?.total_tokens || 0;
        }

        return { finalAnswer, steps, totalTokens, completed };
    }

    // ==================================================================
    // UTILITARIOS DE ALTO NIVEL
    // ==================================================================

    /** Divide uma tarefa complexa em passos acionaveis (planner). */
    async planTask(
        goal: string,
        context?: string
    ): Promise<{ steps: string[]; rationale: string } | null> {
        const sys =
            'Voce e um planejador. Divida a tarefa em passos curtos, ordenados e executaveis.\n' +
            'Retorne JSON no formato: ' +
            '{ "rationale": "breve justificativa", "steps": ["passo 1", "passo 2", ...] }.\n' +
            'Maximo 12 passos. Cada passo deve ser uma ACAO CONCRETA.';
        const user = 'TAREFA: ' + goal + (context ? ('\nCONTEXTO: ' + context) : '');
        return this.generateJson(sys, user);
    }

    /** Extracao de dados estruturados a partir de texto livre com schema. */
    async extractStructuredData<T>(
        text: string,
        schemaDescription: string,
        example?: unknown
    ): Promise<T | null> {
        const sys =
            'Voce e um extrator de dados. Retorne JSON que obedeca exatamente a este formato:\n' +
            schemaDescription +
            (example ? ('\nEXEMPLO:\n' + JSON.stringify(example, null, 2)) : '') +
            '\nNao invente campos. Se um campo nao existir no texto, use null.';
        return this.generateJson<T>(sys, text);
    }

    /** Comprime historico longo em resumo denso preservando decisoes-chave. */
    async summarizeConversation(messages: LLMMessage[]): Promise<string> {
        if (!this.client || messages.length === 0) return '';
        const joined = messages
            .map(m => '[' + m.role.toUpperCase() + '] ' + m.content)
            .join('\n')
            .slice(0, 16_000);
        const res = await this.chat(
            [
                {
                    role: 'system',
                    content:
                        'Resuma a conversa em bullet points densos, preservando decisoes, pedidos do usuario, fatos e estado atual. Maximo 400 palavras.'
                },
                { role: 'user', content: joined }
            ],
            { temperature: 0.3, maxTokens: 800 }
        );
        return res.content;
    }

    /** Geracao de imagem (DALL-E compativel). Retorna URL ou null. */
    async generateImage(
        prompt: string,
        options: {
            size?: '1024x1024' | '1792x1024' | '1024x1792';
            model?: string;
        } = {}
    ): Promise<string | null> {
        if (!this.client) return null;
        try {
            const imgModel = options.model || config.getOptional('MODELO_IMAGEM') || 'dall-e-3';
            const response: any = await (this.client as any).images.generate({
                model: imgModel,
                prompt,
                size: options.size || '1024x1024',
                n: 1
            });
            return response?.data?.[0]?.url || null;
        } catch (error: any) {
            logger.warn('Geracao de imagem indisponivel neste provedor:', { error: error?.message });
            return null;
        }
    }

    /** Text-to-speech. Retorna Buffer com audio (mp3 por default). */
    async textToSpeech(
        text: string,
        options: { voice?: string; model?: string; format?: 'mp3' | 'wav' | 'opus' } = {}
    ): Promise<Buffer | null> {
        if (!this.client) return null;
        try {
            const ttsModel = options.model || config.getOptional('MODELO_TTS') || 'tts-1';
            const response: any = await (this.client as any).audio.speech.create({
                model: ttsModel,
                voice: options.voice || 'alloy',
                input: text,
                response_format: options.format || 'mp3'
            });
            const arrayBuffer = await response.arrayBuffer();
            return Buffer.from(arrayBuffer);
        } catch (error: any) {
            logger.warn('TTS indisponivel neste provedor:', { error: error?.message });
            return null;
        }
    }

    /** Gera schema de comando personalizado para Discord (compativel retro). */
    async generateCommandSchema(
        prompt: string,
        guildContext?: string
    ): Promise<{ name: string; description: string; response?: string; actions: any[] } | null> {
        const systemPrompt =
            'Voce e um Arquiteto de Comandos para Discord. Converta descricoes em linguagem natural em um esquema JSON completo e funcional.\n\n' +
            'CONTEXTO:\n' + (guildContext || 'Servidor generico') + '\n\n' +
            'ACOES SUPORTADAS:\n' +
            '- REPLY: Responder (params: content, ephemeral). Use {nome_opcao}.\n' +
            '- ADD_ROLE: Adicionar cargo (params: role_id, user_id?).\n' +
            '- REMOVE_ROLE: Remover cargo (params: role_id, user_id?).\n' +
            '- SEND_DM: Enviar DM (params: content, user_id?).\n' +
            '- SEND_CHANNEL: Enviar msg em canal (params: channel_id, content).\n' +
            '- SET_NICKNAME: Mudar apelido (params: nickname, user_id?).\n' +
            "- RANDOM_IMAGE: Enviar GIF (params: category). Categorias validas: 'bite','blush','cry','cuddle','dance','facepalm','feed','happy','highfive','hug','kiss','laugh','pat','poke','pout','slap','sleep','smile','smug','stare','think','thumbsup','tickle','wave','wink','yeet'.\n" +
            '- KICK: Expulsar (params: user_id, reason).\n' +
            '- BAN: Banir (params: user_id, reason).\n\n' +
            'OPCOES (Slash Options): STRING, USER, CHANNEL, ROLE, INTEGER, BOOLEAN, NUMBER, ATTACHMENT.\n\n' +
            'REGRAS CRITICAS:\n' +
            '1. Se interage com outro usuario, EXIGE option type USER (required:true).\n' +
            '2. "mudar apelido" -> option STRING para novo apelido.\n' +
            '3. "dar cargo" -> option ROLE.\n' +
            '4. "name" kebab-case, minusculo, sem acentos, max 32 chars.\n' +
            '5. Use {nome_opcao} em actions. Para USER em texto, use <@{nome_opcao}>.\n' +
            '6. SEMPRE passe user_id: "{alvo}" nas actions que mexem com outro usuario.\n\n' +
            'EXEMPLO:\n' +
            '{\n' +
            '  "name": "alterar-status",\n' +
            '  "description": "Altera apelido e cargo de um membro",\n' +
            '  "options": [\n' +
            '    { "name": "membro", "description": "Alvo", "type": "USER", "required": true },\n' +
            '    { "name": "novo_apelido", "description": "Novo apelido", "type": "STRING", "required": true },\n' +
            '    { "name": "cargo", "description": "Cargo", "type": "ROLE", "required": true }\n' +
            '  ],\n' +
            '  "actions": [\n' +
            '    { "type": "REPLY", "content": "Alterando <@{membro}>...", "ephemeral": true },\n' +
            '    { "type": "SET_NICKNAME", "nickname": "{novo_apelido}", "user_id": "{membro}" },\n' +
            '    { "type": "ADD_ROLE", "role_id": "{cargo}", "user_id": "{membro}" }\n' +
            '  ]\n' +
            '}';
        return this.generateJson(systemPrompt, prompt);
    }

    // ==================================================================
    // HELPERS INTERNOS
    // ==================================================================

    private buildMessages(
        messages: LLMMessage[],
        imageUrl: string | null
    ): OpenAI.ChatCompletionMessageParam[] {
        const out: OpenAI.ChatCompletionMessageParam[] = [];
        messages.forEach((m, idx) => {
            const isLastUser = imageUrl && idx === messages.length - 1 && m.role === 'user';
            if (isLastUser) {
                out.push({
                    role: 'user',
                    content: [
                        { type: 'text', text: m.content || 'Analise esta imagem.' },
                        { type: 'image_url', image_url: { url: imageUrl as string } } as any
                    ]
                } as any);
            } else {
                out.push({
                    role: m.role as 'user' | 'assistant' | 'system',
                    content: m.content
                });
            }
        });
        return out;
    }

    /** Tenta parsear JSON de varias formas antes de desistir. */
    private parseJsonRobust<T>(raw: string): T | null {
        if (!raw) return null;
        const direct = this.safeJsonParse<T>(raw);
        if (direct) return direct;
        const fenced = raw
            .replace(/```json\s*([\s\S]*?)```/gi, '$1')
            .replace(/```([\s\S]*?)```/g, '$1');
        const fencedParse = this.safeJsonParse<T>(fenced);
        if (fencedParse) return fencedParse;
        const extracted = this.extractBalancedJson(raw);
        if (extracted) {
            const ext = this.safeJsonParse<T>(extracted);
            if (ext) return ext;
            const cleaned = extracted
                .replace(/,\s*([}\]])/g, '$1')
                .replace(/[\n\r\t]/g, ' ');
            const cleanedParse = this.safeJsonParse<T>(cleaned);
            if (cleanedParse) return cleanedParse;
        }
        return null;
    }

    /** Extrai o primeiro objeto/array JSON balanceado do texto. */
    private extractBalancedJson(text: string): string | null {
        const first = text.search(/[\[{]/);
        if (first < 0) return null;
        const open = text[first];
        const close = open === '{' ? '}' : ']';
        let depth = 0;
        let inStr = false;
        let esc = false;
        for (let i = first; i < text.length; i++) {
            const c = text[i];
            if (esc) { esc = false; continue; }
            if (c === '\\' && inStr) { esc = true; continue; }
            if (c === '"') { inStr = !inStr; continue; }
            if (inStr) continue;
            if (c === open) depth++;
            else if (c === close) {
                depth--;
                if (depth === 0) return text.slice(first, i + 1);
            }
        }
        return null;
    }

    /** Pede ao modelo para consertar um JSON quebrado. */
    private async repairJson<T>(broken: string): Promise<T | null> {
        if (!this.client) return null;
        try {
            const res = await this.chat(
                [
                    {
                        role: 'system',
                        content:
                            'Voce recebe um JSON quebrado ou com markdown. Retorne APENAS o JSON valido correspondente, sem texto extra, sem markdown.'
                    },
                    { role: 'user', content: broken.slice(0, 8000) }
                ],
                { temperature: 0, maxTokens: 4000, jsonMode: true }
            );
            return this.parseJsonRobust<T>(res.content);
        } catch {
            return null;
        }
    }

    private safeJsonParse<T>(raw: unknown): T | null {
        if (typeof raw !== 'string' || !raw.trim()) return null;
        try { return JSON.parse(raw) as T; } catch { return null; }
    }

    private cacheKey(messages: LLMMessage[], options: ChatOptions): string {
        const normalized = {
            m: messages.map(x => ({ r: x.role, c: x.content })),
            t: options.temperature ?? 0.7,
            mt: options.maxTokens ?? 4000,
            md: options.model || this.model,
            j: options.jsonMode || false,
            i: options.imageUrl || null
        };
        return JSON.stringify(normalized);
    }

    private backoffMs(attempt: number, base = 800, isRateLimit = false): number {
        const exp = Math.pow(2, attempt);
        const jitter = Math.random() * 250;
        return Math.min(isRateLimit ? base * exp * 2 : base * exp, 15_000) + jitter;
    }

    private delay(ms: number): Promise<void> {
        return new Promise(r => setTimeout(r, ms));
    }

    private defaultAgentPrompt(): string {
        return (
            'Voce e o Agente CoreBot: inteligente, cuidadoso e proativo.\n' +
            'Seu trabalho e alcancar o OBJETIVO usando as ferramentas disponiveis.\n\n' +
            'PRINCIPIOS:\n' +
            '1. Sempre pense antes de agir; explique brevemente o raciocinio.\n' +
            '2. Execute uma ou mais ferramentas em sequencia logica.\n' +
            '3. Apos cada resultado, reflita se ainda falta algo.\n' +
            '4. Evite repetir chamadas identicas. Se uma ferramenta falha, adapte-se.\n' +
            '5. Quando o objetivo estiver cumprido, responda em portugues e PARE.\n' +
            '6. Nunca invente IDs, nomes ou permissoes que nao foram retornados por ferramentas.'
        );
    }
}

// Singleton global
export const llmService = new LLMService();
