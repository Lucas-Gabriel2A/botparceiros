/**
 * 🎯 Command Handler - Carrega e executa comandos dinamicamente
 */

import * as fs from 'fs';
import * as path from 'path';
import { Collection, Message } from 'discord.js';
import { logger } from '../services/logger.service';
import type { BotCommand } from '../../types';

export class CommandHandler {
    private commands: Collection<string, BotCommand> = new Collection();
    private cooldowns: Collection<string, Collection<string, number>> = new Collection();

    /**
     * Carrega comandos de um diretório
     */
    async loadCommands(commandsDir: string): Promise<void> {
        if (!fs.existsSync(commandsDir)) {
            logger.warn(`Diretório de comandos não existe: ${commandsDir}`);
            return;
        }

        const files = fs.readdirSync(commandsDir).filter(
            file => file.endsWith('.ts') || file.endsWith('.js')
        );

        for (const file of files) {
            try {
                const filePath = path.join(commandsDir, file);
                const command = await import(filePath);
                
                if (command.default) {
                    this.commands.set(command.default.name, command.default);
                    logger.debug(`Comando carregado: ${command.default.name}`);
                }
            } catch (error) {
                logger.error(`Erro ao carregar comando ${file}:`, { error });
            }
        }

        logger.info(`${this.commands.size} comandos carregados`);
    }

    /**
     * Obtém um comando pelo nome
     */
    get(name: string): BotCommand | undefined {
        return this.commands.get(name);
    }

    /**
     * Lista todos os comandos
     */
    list(): BotCommand[] {
        return Array.from(this.commands.values());
    }

    /**
     * Verifica cooldown de um comando
     */
    checkCooldown(commandName: string, userId: string): number {
        if (!this.cooldowns.has(commandName)) {
            this.cooldowns.set(commandName, new Collection());
        }

        const now = Date.now();
        const timestamps = this.cooldowns.get(commandName)!;
        const command = this.commands.get(commandName);
        const cooldownAmount = (command?.cooldown || 3) * 1000;

        if (timestamps.has(userId)) {
            const expirationTime = timestamps.get(userId)! + cooldownAmount;

            if (now < expirationTime) {
                return (expirationTime - now) / 1000;
            }
        }

        timestamps.set(userId, now);
        setTimeout(() => timestamps.delete(userId), cooldownAmount);

        return 0;
    }

    /**
     * Executa um comando
     */
    async execute(
        message: Message,
        commandName: string,
        args: string[]
    ): Promise<void> {
        const command = this.commands.get(commandName);

        if (!command) {
            logger.debug(`Comando não encontrado: ${commandName}`);
            return;
        }

        // Verifica cooldown
        const cooldownLeft = this.checkCooldown(commandName, message.author.id);
        if (cooldownLeft > 0) {
            await message.reply(
                `⏳ Aguarde ${cooldownLeft.toFixed(1)}s para usar este comando novamente.`
            );
            return;
        }

        // Verifica permissões
        if (command.permissions && message.member) {
            const hasPermission = command.permissions.every(
                perm => message.member?.permissions.has(perm)
            );

            if (!hasPermission) {
                await message.reply('❌ Você não tem permissão para usar este comando.');
                return;
            }
        }

        try {
            await command.execute(message, args);
            logger.info(`Comando executado: ${commandName}`, {
                user: message.author.tag,
                guild: message.guild?.name
            });
        } catch (error) {
            logger.error(`Erro ao executar ${commandName}:`, { error });
            await message.reply('❌ Ocorreu um erro ao executar o comando.');
        }
    }
}

// Singleton
export const commandHandler = new CommandHandler();
