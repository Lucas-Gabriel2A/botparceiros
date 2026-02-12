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

    /**
     * Gera schema de comando personalizado via IA
     */
    async generateCommandSchema(
        prompt: string,
        guildContext?: string
    ): Promise<{ name: string; description: string; response?: string; actions: any[] } | null> {
        const systemPrompt = `
Você é um Arquiteto de Comandos para Discord. Sua função é converter descrições em linguagem natural em um esquema JSON de comando.

CONTEXTO:
${guildContext || 'Servidor genérico'}

AÇÕES SUPORTADAS:
- REPLY: Responder ao usuário (params: content, ephemeral). Use {nome_opcao} para citar opções.
- ADD_ROLE: Adicionar cargo (params: role_id, user_id?). Se user_id omitido, aplica a quem rodou o comando.
- REMOVE_ROLE: Remover cargo (params: role_id, user_id?).
- SEND_DM: Enviar DM (params: content, user_id?).
- SEND_CHANNEL: Enviar msg em canal (params: channel_id, content).
- SET_NICKNAME: Mudar apelido (params: nickname, user_id?). Use {nome_opcao} para o novo nome.
- RANDOM_IMAGE: Enviar GIF/Imagem aleatória (params: category). Categorias: anime_kiss, anime_hug, anime_slap, anime_pat, anime_dance.
            - Se a ação envolve interação física/anime (abraçar, beijar, bater, dançar), use type: 'RANDOM_IMAGE'.
            - As categorias VÁLIDAS para RANDOM_IMAGE são APENAS:
              'bite' (morder), 'blush' (corar), 'cry' (chorar), 'cuddle' (conchinha), 'dance' (dançar), 
              'facepalm', 'feed' (alimentar), 'happy' (feliz), 'highfive', 'hug' (abraçar), 
              'kiss' (beijar), 'laugh' (rir), 'pat' (afagar/carinho), 'poke' (cutucar), 
              'pout' (bico), 'slap' (tapa/bater), 'sleep' (dormir), 'smile' (sorrir), 
              'smug', 'stare' (encarar), 'think', 'thumbsup', 'tickle' (cócegas), 
              'wave' (tchau), 'wink' (piscar), 'yeet' (arremessar).
            - Mapeie o pedido do usuário para a categoria mais próxima (ex: "bater" -> "slap", "chutar" -> "yeet" ou "kick" se houver).
            - Se não houver correspondência exata, use 'neko' ou 'random'.
            
            Exemplos:
            - "Crie um comando de bater" -> { type: 'RANDOM_IMAGE', category: 'slap' }
            - "Comando de carinho" -> { type: 'RANDOM_IMAGE', category: 'pat' }
            - "Mandar oi" -> { type: 'RANDOM_IMAGE', category: 'wave' }
- KICK: Expulsar usuário (params: user_id, reason)
- BAN: Banir usuário (params: user_id, reason)

OPÇÕES (Slash Command Options):
- Defina 'options' para argumentos do comando.
- Types: STRING, USER, CHANNEL, ROLE, INTEGER, BOOLEAN, NUMBER, ATTACHMENT.

REGRAS CRÍTICAS PARA TIPO DE COMANDO:
1. Se o comando envolve uma ação em um usuário (banir, mudar apelido), DEVE haver uma option do tipo USER, se possível 'required: true'.
   - Opções auxiliares (ex: "novo apelido", "cargo a dar") devem ser 'required: false' para permitir que o comando seja flexível.
   - Se o usuário pedir "Adicionar ou Remover", crie opções com nomes claros.
   - Para comandos de "mudar apelido", a opção DEVE ser STRING.
   - Para comandos de "dar cargo", a opção DEVE ser ROLE.
   - Se o comando envolve INTERAGIR COM OUTRO USUÁRIO (beijar, banir, mudar apelido, dar cargo), VOCÊ DEVE CRIAR UMA OPÇÃO 'type: USER'.
   - Ex: "Comando para mudar apelido" -> options: [{name: "usuario", type: "USER"}, {name: "novo_apelido", type: "STRING"}]
   - Ex: "Banir alguém" -> options: [{name: "alvo", type: "USER", required: true}]

2. Se o comando precisa de TEXTO ou MENSAGEM (falar, dm, aviso), use 'type: STRING'.
   - Ex: "Falar no canal" -> options: [{name: "mensagem", type: "STRING"}]

3. "name" do comando: kebab-case, minúsculo, sem acentos (ex: mudar-cargo).

4. "description": Curta e direta.

5. USO DE VARIÁVEIS NAS AÇÕES:
   - Use {nome_da_opcao} para substituir valores.
   - Para opções USER, use <@{nome_da_opcao}> para mencionar na mensagem.
   - IMPRESCINDÍVEL: Se o comando afeta OUTRO usuário (ex: banir alvo), passe "user_id": "{nome_da_opcao}" na ação. SÓ ASSIM O BOT SABE QUEM ALVO É.

EXEMPLO COMPLEXO: "Crie um comando que muda o apelido e dá um cargo" (Alvo explícito)
SAÍDA ESPERADA:
{
  "name": "alterar-status",
  "description": "Altera apelido e cargo de um membro",
  "options": [
    { "name": "membro", "description": "O membro alvo", "type": "USER", "required": true },
    { "name": "novo_apelido", "description": "O novo apelido", "type": "STRING", "required": true },
    { "name": "cargo", "description": "O cargo a adicionar", "type": "ROLE", "required": true }
  ],
  "actions": [
    { "type": "REPLY", "content": "Alterando {membro} para {novo_apelido} e dando cargo {cargo}...", "ephemeral": true },
    { "type": "SET_NICKNAME", "nickname": "{novo_apelido}", "user_id": "{membro}" },
    { "type": "ADD_ROLE", "role_id": "{cargo}", "user_id": "{membro}" }
  ]
}

REGRAS GERAIS:
1. "name" deve ser kebab-case, sem espaços, max 32 chars.
2. "description" deve ser curta e clara.
3. Se precisar mencionar usuário, crie uma option do type USER e use <@{nome_opcao}> no content ou {nome_opcao} nas actions.

EXEMPLO DE SAÍDA:
{
  "name": "beijar",
  "description": "Dê um beijo em alguém",
  "options": [
    { "name": "usuario", "description": "Quem você quer beijar?", "type": "USER", "required": true }
  ],
  "actions": [
    { "type": "REPLY", "content": "Dando um beijo em <@{usuario}>! 💋", "ephemeral": false },
    { "type": "RANDOM_IMAGE", "category": "anime_kiss" }
  ]
}`;

        return this.generateJson(systemPrompt, prompt);
    }
}

// Singleton para uso global
export const llmService = new LLMService();
