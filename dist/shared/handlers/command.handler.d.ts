/**
 * 🎯 Command Handler - Carrega e executa comandos dinamicamente
 */
import { Message } from 'discord.js';
import type { BotCommand } from '../../types';
export declare class CommandHandler {
    private commands;
    private cooldowns;
    /**
     * Carrega comandos de um diretório
     */
    loadCommands(commandsDir: string): Promise<void>;
    /**
     * Obtém um comando pelo nome
     */
    get(name: string): BotCommand | undefined;
    /**
     * Lista todos os comandos
     */
    list(): BotCommand[];
    /**
     * Verifica cooldown de um comando
     */
    checkCooldown(commandName: string, userId: string): number;
    /**
     * Executa um comando
     */
    execute(message: Message, commandName: string, args: string[]): Promise<void>;
}
export declare const commandHandler: CommandHandler;
//# sourceMappingURL=command.handler.d.ts.map