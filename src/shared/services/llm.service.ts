/**
 * 🧠 LLM Service - Abstração para OpenAI/Groq/HuggingFace
 * 
 * Fornece interface unificada para comunicação com APIs de LLM.
 */

import OpenAI from 'openai';
import type { LLMMessage } from '../../types';

export class LLMService {
    private client: OpenAI | null = null;
    private model: string;
    private baseUrl: string;

    constructor() {
        const apiKey = process.env.OPENAI_API_KEY;
        this.baseUrl = process.env.LLM_BASE_URL || 'https://api.openai.com/v1';
        this.model = process.env.MODELO_IA || 'gpt-3.5-turbo';

        if (apiKey) {
            this.client = new OpenAI({
                apiKey,
                baseURL: this.baseUrl
            });
            console.log(`🧠 LLM Service iniciado (${this.baseUrl})`);
        } else {
            console.warn('⚠️ LLM Service: Sem API key, modo mock ativado');
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
            console.error('❌ Erro LLM:', error);
            throw error;
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
            console.error('❌ Erro ao parsear comando:', error);
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
            console.log('🎤 Transcrevendo áudio...');
            // TODO: Implementar transcrição real
            return '';
        } catch (error) {
            console.error('❌ Erro na transcrição:', error);
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
