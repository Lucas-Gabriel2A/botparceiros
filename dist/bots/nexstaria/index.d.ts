/**
 * ╔═══════════════════════════════════════════════════════════════════════════╗
 * ║                      NEXSTAR IA - ASSISTENTE INTELIGENTE                  ║
 * ║                        Chat IA + Admin Commands                           ║
 * ╚═══════════════════════════════════════════════════════════════════════════╝
 *
 * Features:
 * - LLM Service (OpenAI/Groq) para chat
 * - Comandos admin via linguagem natural
 * - Monitor de inatividade
 */
interface ChatMessage {
    role: 'system' | 'user' | 'assistant';
    content: string | Array<{
        type: string;
        text?: string;
        image_url?: {
            url: string;
        };
    }>;
}
declare class LLMService {
    private client;
    private mode;
    constructor();
    gerarResposta(mensagens: ChatMessage[], systemPrompt?: string, imageUrl?: string | null): Promise<string>;
}
declare const llmService: LLMService;
export { LLMService, llmService };
//# sourceMappingURL=index.d.ts.map