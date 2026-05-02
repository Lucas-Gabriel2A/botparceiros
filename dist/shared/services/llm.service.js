"use strict";
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.llmService = exports.LLMService = void 0;
const openai_1 = __importDefault(require("openai"));
const uploads_1 = require("openai/uploads");
const config_service_1 = require("./config.service");
const logger_service_1 = require("./logger.service");
// ======================================================================
// LLM SERVICE
// ======================================================================
class LLMService {
    client = null;
    model;
    baseUrl;
    visionModel;
    fallbackModels;
    stats = {
        totalRequests: 0,
        totalTokens: 0,
        totalErrors: 0,
        totalRetries: 0,
        toolCalls: 0
    };
    cache = new Map();
    constructor() {
        const apiKey = config_service_1.config.getOptional('OPENAI_API_KEY');
        this.baseUrl = config_service_1.config.getOptional('LLM_BASE_URL') || 'https://api.openai.com/v1';
        this.model = config_service_1.config.getOptional('MODELO_IA') || 'gpt-3.5-turbo';
        this.visionModel =
            config_service_1.config.getOptional('MODELO_VISAO') ||
                (this.baseUrl.includes('groq')
                    ? 'meta-llama/llama-4-scout-17b-16e-instruct'
                    : 'gpt-4o-mini');
        const fallbackEnv = config_service_1.config.getOptional('MODELOS_FALLBACK');
        this.fallbackModels = fallbackEnv
            ? fallbackEnv.split(',').map((s) => s.trim()).filter(Boolean)
            : this.baseUrl.includes('groq')
                ? ['llama-3.1-8b-instant', 'gemma2-9b-it']
                : ['gpt-3.5-turbo'];
        if (apiKey) {
            this.client = new openai_1.default({ apiKey, baseURL: this.baseUrl });
            logger_service_1.logger.info(`LLM Service iniciado (${this.baseUrl}) modelo=${this.model} vision=${this.visionModel}`);
            // Garbage Collector para o Memory Leak
            setInterval(() => {
                const now = Date.now();
                for (const [key, value] of this.cache.entries()) {
                    if (value.expires <= now) {
                        this.cache.delete(key);
                    }
                }
            }, 600000); // 10 minutos
        }
        else {
            logger_service_1.logger.warn('LLM Service: sem API key, modo mock ativado');
        }
    }
    // ==================================================================
    // API RETRO-COMPATIVEL
    // ==================================================================
    async generateResponse(messages, systemPrompt) {
        if (!this.client)
            return '[Mock] Resposta simulada - API key nao configurada';
        const built = [];
        if (systemPrompt)
            built.push({ role: 'system', content: systemPrompt });
        built.push(...messages);
        const res = await this.chat(built, { maxTokens: 4000, temperature: 0.7 });
        return res.content;
    }
    async generateJson(systemPrompt, userMessage, retryCount = 0) {
        if (!this.client) {
            logger_service_1.logger.warn('Mock JSON response');
            return null;
        }
        const finalSystem = systemPrompt +
            '\n\nRESPONDA APENAS COM JSON VALIDO E COMPLETO. SEM MARKDOWN, SEM CERCAS, SEM COMENTARIOS.';
        try {
            const result = await this.chat([
                { role: 'system', content: finalSystem },
                { role: 'user', content: userMessage }
            ], { temperature: 0.4, maxTokens: 4000, jsonMode: true, maxRetries: 2, enableFallback: true });
            const parsed = this.parseJsonRobust(result.content);
            if (parsed !== null)
                return parsed;
            if (retryCount < 2) {
                logger_service_1.logger.info(`JSON invalido - tentando auto-reparo (${retryCount + 1}/2)`);
                const repaired = await this.repairJson(result.content);
                if (repaired !== null)
                    return repaired;
                return this.generateJson(systemPrompt, userMessage, retryCount + 1);
            }
            logger_service_1.logger.error('Nao foi possivel gerar JSON valido apos retries.');
            return null;
        }
        catch (error) {
            logger_service_1.logger.error('Erro ao gerar JSON:', { error });
            if (retryCount < 2) {
                await this.delay(this.backoffMs(retryCount));
                return this.generateJson(systemPrompt, userMessage, retryCount + 1);
            }
            return null;
        }
    }
    async parseAdminCommand(userMessage, adminPrompt) {
        try {
            const parsed = await this.generateJson(adminPrompt, userMessage);
            if (parsed && typeof parsed.action === 'string') {
                parsed.params = parsed.params || {};
                return parsed;
            }
            return { action: 'none', params: {} };
        }
        catch (error) {
            logger_service_1.logger.error('Erro ao parsear comando admin:', { error });
            return { action: 'none', params: {} };
        }
    }
    async transcribeAudio(audioBuffer, filename = 'audio.mp3', language) {
        if (!this.client)
            return '[Mock] Transcricao simulada';
        try {
            logger_service_1.logger.info(`Transcrevendo audio (${audioBuffer.length} bytes, ${filename})`);
            const file = await (0, uploads_1.toFile)(audioBuffer, filename);
            const transcriptionModel = config_service_1.config.getOptional('MODELO_WHISPER') || 'whisper-large-v3-turbo';
            const response = await this.client.audio.transcriptions.create({
                file,
                model: transcriptionModel,
                language,
                response_format: 'text'
            });
            const text = typeof response === 'string' ? response : response.text || '';
            logger_service_1.logger.info(`Audio transcrito (${text.length} chars)`);
            return text;
        }
        catch (error) {
            logger_service_1.logger.error('Erro na transcricao:', { error: error?.message || error });
            return '';
        }
    }
    isReady() { return this.client !== null; }
    getModelInfo() {
        return {
            model: this.model,
            baseUrl: this.baseUrl,
            visionModel: this.visionModel,
            fallbacks: [...this.fallbackModels]
        };
    }
    getStats() { return { ...this.stats, cacheSize: this.cache.size }; }
    clearCache() { this.cache.clear(); }
    // ==================================================================
    // API AVANCADA - CHAT NUCLEO
    // ==================================================================
    /**
     * Chat avancado: aceita todas as opcoes. Retorna conteudo + tool calls + uso.
     * E o metodo nucleo usado por todos os helpers (incluindo o agente).
     */
    async chat(messages, options = {}) {
        if (!this.client)
            return { content: '[Mock] API key nao configurada', model: 'mock' };
        const cacheKey = options.cache ? this.cacheKey(messages, options) : null;
        if (cacheKey) {
            const hit = this.cache.get(cacheKey);
            if (hit && hit.expires > Date.now())
                return hit.value;
        }
        const { temperature = 0.7, maxTokens = 4000, topP, frequencyPenalty, presencePenalty, jsonMode = false, imageUrl = null, stop, maxRetries = 3, retryBaseMs = 800, enableFallback = true, tools, toolChoice = 'auto' } = options;
        const primaryModel = imageUrl ? this.visionModel : (options.model || this.model);
        const modelChain = [
            primaryModel,
            ...(enableFallback ? this.fallbackModels.filter(m => m !== primaryModel) : [])
        ];
        let lastError = null;
        const formatted = this.buildMessages(messages, imageUrl);
        for (const mdl of modelChain) {
            for (let attempt = 0; attempt <= maxRetries; attempt++) {
                try {
                    this.stats.totalRequests++;
                    const params = {
                        model: mdl,
                        messages: formatted,
                        temperature,
                        max_tokens: maxTokens,
                        top_p: topP,
                        frequency_penalty: frequencyPenalty,
                        presence_penalty: presencePenalty,
                        stop
                    };
                    if (jsonMode)
                        params.response_format = { type: 'json_object' };
                    if (tools && tools.length) {
                        params.tools = tools.map((t) => {
                            const fn = {
                                name: t.name,
                                description: t.description,
                                parameters: t.parameters
                            };
                            const entry = { type: 'function' };
                            entry.function = fn;
                            return entry;
                        });
                        params.tool_choice = toolChoice;
                    }
                    const response = await this.client.chat.completions.create(params);
                    const choice = response.choices[0];
                    const content = choice?.message?.content || '';
                    const rawToolCalls = choice?.message?.tool_calls || [];
                    const toolCalls = rawToolCalls.map((c) => ({
                        id: c.id,
                        name: c.function?.name,
                        args: this.safeJsonParse(c.function?.arguments) || {}
                    }));
                    if (response.usage)
                        this.stats.totalTokens += response.usage.total_tokens || 0;
                    if (toolCalls.length)
                        this.stats.toolCalls += toolCalls.length;
                    const result = {
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
                    if (cacheKey)
                        this.cache.set(cacheKey, {
                            value: result,
                            expires: Date.now() + (options.cacheTtlMs || 60_000)
                        });
                    return result;
                }
                catch (error) {
                    lastError = error;
                    this.stats.totalErrors++;
                    const status = error?.status || error?.response?.status;
                    const msg = error?.message || String(error);
                    const retriable = status === 429 || status === 500 || status === 502 || status === 503 || status === 504;
                    logger_service_1.logger.warn(`Erro LLM (model=${mdl} attempt=${attempt + 1}/${maxRetries + 1} status=${status}): ${msg}`);
                    if (!retriable || attempt === maxRetries)
                        break;
                    this.stats.totalRetries++;
                    await this.delay(this.backoffMs(attempt, retryBaseMs, status === 429));
                }
            }
        }
        logger_service_1.logger.error('Todas as tentativas LLM falharam:', { error: lastError });
        return {
            content: 'Desculpe, estou com problemas para responder agora. Tente novamente.',
            model: 'error'
        };
    }
    /**
     * Chat em streaming: chama onChunk para cada delta recebido.
     * Retorna o texto completo ao final.
     */
    async chatStream(messages, onChunk, options = {}) {
        if (!this.client) {
            const mock = '[Mock stream] API key nao configurada';
            await onChunk(mock, mock);
            return mock;
        }
        const { temperature = 0.7, maxTokens = 4000, jsonMode = false, imageUrl = null, model } = options;
        const formatted = this.buildMessages(messages, imageUrl);
        const chosenModel = imageUrl ? this.visionModel : (model || this.model);
        try {
            const params = {
                model: chosenModel,
                messages: formatted,
                temperature,
                max_tokens: maxTokens,
                stream: true
            };
            if (jsonMode)
                params.response_format = { type: 'json_object' };
            const stream = await this.client.chat.completions.create(params);
            let full = '';
            for await (const part of stream) {
                const delta = part?.choices?.[0]?.delta?.content || '';
                if (delta) {
                    full += delta;
                    await onChunk(delta, full);
                }
            }
            return full;
        }
        catch (error) {
            logger_service_1.logger.error('Erro no streaming LLM:', { error });
            return '';
        }
    }
    /** Atalho multimodal: texto + imagem em 1 chamada. */
    async generateWithVision(prompt, imageUrl, systemPrompt = 'Voce e a IA do CoreBot. Descreva e analise imagens com precisao.', options = {}) {
        const res = await this.chat([
            { role: 'system', content: systemPrompt },
            { role: 'user', content: prompt || 'Analise esta imagem.' }
        ], { ...options, imageUrl, maxTokens: options.maxTokens ?? 2000 });
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
    async runAgent(goal, tools, options = {}) {
        const { systemPrompt, context, maxIterations = 8, model, temperature = 0.3, onStep } = options;
        if (!this.client) {
            return { finalAnswer: '[Mock] Agent sem API key', steps: [], totalTokens: 0, completed: false };
        }
        const baseSystem = systemPrompt || this.defaultAgentPrompt();
        const toolSpec = tools.map(t => `- ${t.name}: ${t.description}`).join('\n');
        const fullSystem = baseSystem +
            '\n\nFERRAMENTAS DISPONIVEIS:\n' + toolSpec +
            '\n\n' + (context ? ('CONTEXTO:\n' + context + '\n\n') : '') +
            'REGRAS:\n' +
            '1. Pense passo a passo.\n' +
            '2. Use as ferramentas quando precisar agir.\n' +
            '3. So encerre com a resposta final quando o objetivo estiver atingido.';
        const history = [
            { role: 'system', content: fullSystem },
            { role: 'user', content: 'OBJETIVO: ' + goal }
        ];
        const steps = [];
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
            const step = {
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
                    }
                    catch (err) {
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
            }
            else {
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
            const conclude = await this.chat([
                ...history,
                {
                    role: 'user',
                    content: 'Encerre agora: entregue a resposta final com base no que ja foi feito, sem chamar novas ferramentas.'
                }
            ], { temperature: 0.2, maxTokens: 2000 });
            finalAnswer = conclude.content;
            totalTokens += conclude.usage?.total_tokens || 0;
        }
        return { finalAnswer, steps, totalTokens, completed };
    }
    // ==================================================================
    // UTILITARIOS DE ALTO NIVEL
    // ==================================================================
    /** Divide uma tarefa complexa em passos acionaveis (planner). */
    async planTask(goal, context) {
        const sys = 'Voce e um planejador. Divida a tarefa em passos curtos, ordenados e executaveis.\n' +
            'Retorne JSON no formato: ' +
            '{ "rationale": "breve justificativa", "steps": ["passo 1", "passo 2", ...] }.\n' +
            'Maximo 12 passos. Cada passo deve ser uma ACAO CONCRETA.';
        const user = 'TAREFA: ' + goal + (context ? ('\nCONTEXTO: ' + context) : '');
        return this.generateJson(sys, user);
    }
    /** Extracao de dados estruturados a partir de texto livre com schema. */
    async extractStructuredData(text, schemaDescription, example) {
        const sys = 'Voce e um extrator de dados. Retorne JSON que obedeca exatamente a este formato:\n' +
            schemaDescription +
            (example ? ('\nEXEMPLO:\n' + JSON.stringify(example, null, 2)) : '') +
            '\nNao invente campos. Se um campo nao existir no texto, use null.';
        return this.generateJson(sys, text);
    }
    /** Comprime historico longo em resumo denso preservando decisoes-chave. */
    async summarizeConversation(messages) {
        if (!this.client || messages.length === 0)
            return '';
        const joined = messages
            .map(m => '[' + m.role.toUpperCase() + '] ' + m.content)
            .join('\n')
            .slice(0, 16_000);
        const res = await this.chat([
            {
                role: 'system',
                content: 'Resuma a conversa em bullet points densos, preservando decisoes, pedidos do usuario, fatos e estado atual. Maximo 400 palavras.'
            },
            { role: 'user', content: joined }
        ], { temperature: 0.3, maxTokens: 800 });
        return res.content;
    }
    /** Geracao de imagem (DALL-E compativel). Retorna URL ou null. */
    async generateImage(prompt, options = {}) {
        if (!this.client)
            return null;
        try {
            const imgModel = options.model || config_service_1.config.getOptional('MODELO_IMAGEM') || 'dall-e-3';
            const response = await this.client.images.generate({
                model: imgModel,
                prompt,
                size: options.size || '1024x1024',
                n: 1
            });
            return response?.data?.[0]?.url || null;
        }
        catch (error) {
            logger_service_1.logger.warn('Geracao de imagem indisponivel neste provedor:', { error: error?.message });
            return null;
        }
    }
    /** Text-to-speech. Retorna Buffer com audio (mp3 por default). */
    async textToSpeech(text, options = {}) {
        if (!this.client)
            return null;
        try {
            const ttsModel = options.model || config_service_1.config.getOptional('MODELO_TTS') || 'tts-1';
            const response = await this.client.audio.speech.create({
                model: ttsModel,
                voice: options.voice || 'alloy',
                input: text,
                response_format: options.format || 'mp3'
            });
            const arrayBuffer = await response.arrayBuffer();
            return Buffer.from(arrayBuffer);
        }
        catch (error) {
            logger_service_1.logger.warn('TTS indisponivel neste provedor:', { error: error?.message });
            return null;
        }
    }
    /** Gera schema de comando personalizado para Discord (compativel retro). */
    async generateCommandSchema(prompt, guildContext) {
        const systemPrompt = 'Voce e um Arquiteto de Comandos para Discord. Converta descricoes em linguagem natural em um esquema JSON completo e funcional.\n\n' +
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
    buildMessages(messages, imageUrl) {
        const out = [];
        messages.forEach((m, idx) => {
            const isLastUser = imageUrl && idx === messages.length - 1 && m.role === 'user';
            if (isLastUser) {
                out.push({
                    role: 'user',
                    content: [
                        { type: 'text', text: m.content || 'Analise esta imagem.' },
                        { type: 'image_url', image_url: { url: imageUrl } }
                    ]
                });
            }
            else {
                out.push({
                    role: m.role,
                    content: m.content
                });
            }
        });
        return out;
    }
    /** Tenta parsear JSON de varias formas antes de desistir. */
    parseJsonRobust(raw) {
        if (!raw)
            return null;
        const direct = this.safeJsonParse(raw);
        if (direct)
            return direct;
        const fenced = raw
            .replace(/```json\s*([\s\S]*?)```/gi, '$1')
            .replace(/```([\s\S]*?)```/g, '$1');
        const fencedParse = this.safeJsonParse(fenced);
        if (fencedParse)
            return fencedParse;
        const extracted = this.extractBalancedJson(raw);
        if (extracted) {
            const ext = this.safeJsonParse(extracted);
            if (ext)
                return ext;
            const cleaned = extracted
                .replace(/,\s*([}\]])/g, '$1')
                .replace(/[\n\r\t]/g, ' ');
            const cleanedParse = this.safeJsonParse(cleaned);
            if (cleanedParse)
                return cleanedParse;
        }
        return null;
    }
    /** Extrai o primeiro objeto/array JSON balanceado do texto. */
    extractBalancedJson(text) {
        const first = text.search(/[\[{]/);
        if (first < 0)
            return null;
        const open = text[first];
        const close = open === '{' ? '}' : ']';
        let depth = 0;
        let inStr = false;
        let esc = false;
        for (let i = first; i < text.length; i++) {
            const c = text[i];
            if (esc) {
                esc = false;
                continue;
            }
            if (c === '\\' && inStr) {
                esc = true;
                continue;
            }
            if (c === '"') {
                inStr = !inStr;
                continue;
            }
            if (inStr)
                continue;
            if (c === open)
                depth++;
            else if (c === close) {
                depth--;
                if (depth === 0)
                    return text.slice(first, i + 1);
            }
        }
        return null;
    }
    /** Pede ao modelo para consertar um JSON quebrado. */
    async repairJson(broken) {
        if (!this.client)
            return null;
        try {
            const res = await this.chat([
                {
                    role: 'system',
                    content: 'Voce recebe um JSON quebrado ou com markdown. Retorne APENAS o JSON valido correspondente, sem texto extra, sem markdown.'
                },
                { role: 'user', content: broken.slice(0, 8000) }
            ], { temperature: 0, maxTokens: 4000, jsonMode: true });
            return this.parseJsonRobust(res.content);
        }
        catch {
            return null;
        }
    }
    safeJsonParse(raw) {
        if (typeof raw !== 'string' || !raw.trim())
            return null;
        try {
            return JSON.parse(raw);
        }
        catch {
            return null;
        }
    }
    cacheKey(messages, options) {
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
    backoffMs(attempt, base = 800, isRateLimit = false) {
        const exp = Math.pow(2, attempt);
        const jitter = Math.random() * 250;
        return Math.min(isRateLimit ? base * exp * 2 : base * exp, 15_000) + jitter;
    }
    delay(ms) {
        return new Promise(r => setTimeout(r, ms));
    }
    defaultAgentPrompt() {
        return ('Voce e o Agente CoreBot: inteligente, cuidadoso e proativo.\n' +
            'Seu trabalho e alcancar o OBJETIVO usando as ferramentas disponiveis.\n\n' +
            'PRINCIPIOS:\n' +
            '1. Sempre pense antes de agir; explique brevemente o raciocinio.\n' +
            '2. Execute uma ou mais ferramentas em sequencia logica.\n' +
            '3. Apos cada resultado, reflita se ainda falta algo.\n' +
            '4. Evite repetir chamadas identicas. Se uma ferramenta falha, adapte-se.\n' +
            '5. Quando o objetivo estiver cumprido, responda em portugues e PARE.\n' +
            '6. Nunca invente IDs, nomes ou permissoes que nao foram retornados por ferramentas.');
    }
}
exports.LLMService = LLMService;
// Singleton global
exports.llmService = new LLMService();
//# sourceMappingURL=llm.service.js.map