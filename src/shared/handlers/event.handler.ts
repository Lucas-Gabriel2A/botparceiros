/**
 * 🎉 Event Handler - Carrega e registra eventos dinamicamente
 */

import * as fs from 'fs';
import * as path from 'path';
import { Client } from 'discord.js';
import { logger } from '../services/logger.service';
import type { BotEvent } from '../../types';

export class EventHandler {
    private client: Client;
    private events: Map<string, BotEvent> = new Map();

    constructor(client: Client) {
        this.client = client;
    }

    /**
     * Carrega eventos de um diretório
     */
    async loadEvents(eventsDir: string): Promise<void> {
        if (!fs.existsSync(eventsDir)) {
            logger.warn(`Diretório de eventos não existe: ${eventsDir}`);
            return;
        }

        const files = fs.readdirSync(eventsDir).filter(
            file => file.endsWith('.ts') || file.endsWith('.js')
        );

        for (const file of files) {
            try {
                const filePath = path.join(eventsDir, file);
                const event = await import(filePath);
                
                if (event.default) {
                    const eventData = event.default as BotEvent;
                    this.events.set(eventData.name, eventData);

                    if (eventData.once) {
                        this.client.once(eventData.name, (...args) => 
                            eventData.execute(...args)
                        );
                    } else {
                        this.client.on(eventData.name, (...args) => 
                            eventData.execute(...args)
                        );
                    }

                    logger.debug(`Evento registrado: ${eventData.name}`);
                }
            } catch (error) {
                logger.error(`Erro ao carregar evento ${file}:`, { error });
            }
        }

        logger.info(`${this.events.size} eventos registrados`);
    }

    /**
     * Lista todos os eventos carregados
     */
    list(): string[] {
        return Array.from(this.events.keys());
    }
}

export function createEventHandler(client: Client): EventHandler {
    return new EventHandler(client);
}
