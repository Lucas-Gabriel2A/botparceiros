/**
 * 🎉 Event Handler - Carrega e registra eventos dinamicamente
 */
import { Client } from 'discord.js';
export declare class EventHandler {
    private client;
    private events;
    constructor(client: Client);
    /**
     * Carrega eventos de um diretório
     */
    loadEvents(eventsDir: string): Promise<void>;
    /**
     * Lista todos os eventos carregados
     */
    list(): string[];
}
export declare function createEventHandler(client: Client): EventHandler;
//# sourceMappingURL=event.handler.d.ts.map