/**
 * 🧠 LLM Service - Abstração para OpenAI/Groq/HuggingFace
 * 
 * Fornece interface unificada para comunicação com APIs de LLM.
 */

import OpenAI from 'openai';
import { config } from './config.service';
import { logger } from './logger.service';
import type { LLMMessage } from '../../types';

export class LLMService {
    private client: OpenAI | null = null;
    private model: string;
    private baseUrl: string;

    constructor() {
        // Force config validation/loading if not already done
        const apiKey = config.getOptional('OPENAI_API_KEY');
        this.baseUrl = config.getOptional('LLM_BASE_URL') || 'https://api.openai.com/v1';
        this.model = config.getOptional('MODELO_IA') || 'gpt-3.5-turbo';

        if (apiKey) {
            this.client = new OpenAI({
                apiKey,
                baseURL: this.baseUrl
            });
            logger.info(`🧠 LLM Service iniciado (${this.baseUrl})`);
        } else {
            logger.warn('⚠️ LLM Service: Sem API key, modo mock ativado');
        }
    }

    /**
     * Gera resposta do LLM
     */
    async generateResponse(
        messages: LLMMessage[],
        systemPrompt?: string
    ): Promise<string> {
        if (!this.client) {
            return '[Mock] Resposta simulada - API key não configurada';
        }

        try {
            const formattedMessages: OpenAI.ChatCompletionMessageParam[] = [];

            // Adiciona system prompt se fornecido
            if (systemPrompt) {
                formattedMessages.push({ role: 'system', content: systemPrompt });
            }

            // Adiciona mensagens do usuário
            for (const msg of messages) {
                formattedMessages.push({
                    role: msg.role as 'user' | 'assistant' | 'system',
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
        } catch (error) {
            logger.error('❌ Erro LLM:', { error });
            throw error;
        }
    }

    /**
     * Gera e valida JSON estruturado
     */
    async generateJson<T>(
        systemPrompt: string,
        userMessage: string,
        retryCount = 0
    ): Promise<T | null> {
        if (!this.client) {
            logger.warn('⚠️ Mock JSON response');
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
            return JSON.parse(content) as T;
        } catch (error) {
            logger.error('❌ Erro ao gerar JSON:', { error });
            if (retryCount < 2) {
                logger.info(`🔄 Tentando novamente (${retryCount + 1})...`);
                return this.generateJson(systemPrompt, userMessage, retryCount + 1);
            }
            return null;
        }
    }

    /**
     * Parseia comando admin usando LLM
     */
    async parseAdminCommand(
        userMessage: string,
        adminPrompt: string
    ): Promise<{ action: string; params: Record<string, unknown> }> {
        try {
            const response = await this.generateResponse(
                [{ role: 'user', content: userMessage }],
                adminPrompt
            );

            // Extrai JSON da resposta
            const jsonMatch = response.match(/\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/);
            if (jsonMatch) {
                try {
                    return JSON.parse(jsonMatch[0]);
                } catch {
                    // Tenta limpar JSON malformado
                    const cleaned = jsonMatch[0]
                        .replace(/[\n\r]/g, '')
                        .replace(/,\s*}/g, '}');
                    return JSON.parse(cleaned);
                }
            }

            return { action: 'none', params: {} };
        } catch (error) {
            logger.error('❌ Erro ao parsear comando:', { error });
            return { action: 'none', params: {} };
        }
    }

    /**
     * Transcreve áudio usando Whisper
     */
    async transcribeAudio(_audioBuffer: Buffer): Promise<string> {
        if (!this.client) {
            return '[Mock] Transcrição simulada';
        }

        try {
            // Nota: Implementação de upload de arquivo para Whisper
            // Requer FormData e File polyfill no Node
            logger.info('🎤 Transcrevendo áudio...');
            // TODO: Implementar transcrição real
            return '';
        } catch (error) {
            logger.error('❌ Erro na transcrição:', { error });
            throw error;
        }
    }

    /**
     * Verifica se o serviço está pronto
     */
    isReady(): boolean {
        return this.client !== null;
    }

    /**
     * Retorna informações do modelo em uso
     */
    getModelInfo(): { model: string; baseUrl: string } {
        return {
            model: this.model,
            baseUrl: this.baseUrl
        };
    }
}

// Singleton para uso global
export const llmService = new LLMService();
