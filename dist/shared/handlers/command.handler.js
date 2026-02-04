"use strict";
/**
 * 🎯 Command Handler - Carrega e executa comandos dinamicamente
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.commandHandler = exports.CommandHandler = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const discord_js_1 = require("discord.js");
const logger_service_1 = require("../services/logger.service");
class CommandHandler {
    commands = new discord_js_1.Collection();
    cooldowns = new discord_js_1.Collection();
    /**
     * Carrega comandos de um diretório
     */
    async loadCommands(commandsDir) {
        if (!fs.existsSync(commandsDir)) {
            logger_service_1.logger.warn(`Diretório de comandos não existe: ${commandsDir}`);
            return;
        }
        const files = fs.readdirSync(commandsDir).filter(file => file.endsWith('.ts') || file.endsWith('.js'));
        for (const file of files) {
            try {
                const filePath = path.join(commandsDir, file);
                const command = await Promise.resolve(`${filePath}`).then(s => __importStar(require(s)));
                if (command.default) {
                    this.commands.set(command.default.name, command.default);
                    logger_service_1.logger.debug(`Comando carregado: ${command.default.name}`);
                }
            }
            catch (error) {
                logger_service_1.logger.error(`Erro ao carregar comando ${file}:`, { error });
            }
        }
        logger_service_1.logger.info(`${this.commands.size} comandos carregados`);
    }
    /**
     * Obtém um comando pelo nome
     */
    get(name) {
        return this.commands.get(name);
    }
    /**
     * Lista todos os comandos
     */
    list() {
        return Array.from(this.commands.values());
    }
    /**
     * Verifica cooldown de um comando
     */
    checkCooldown(commandName, userId) {
        if (!this.cooldowns.has(commandName)) {
            this.cooldowns.set(commandName, new discord_js_1.Collection());
        }
        const now = Date.now();
        const timestamps = this.cooldowns.get(commandName);
        const command = this.commands.get(commandName);
        const cooldownAmount = (command?.cooldown || 3) * 1000;
        if (timestamps.has(userId)) {
            const expirationTime = timestamps.get(userId) + cooldownAmount;
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
    async execute(message, commandName, args) {
        const command = this.commands.get(commandName);
        if (!command) {
            logger_service_1.logger.debug(`Comando não encontrado: ${commandName}`);
            return;
        }
        // Verifica cooldown
        const cooldownLeft = this.checkCooldown(commandName, message.author.id);
        if (cooldownLeft > 0) {
            await message.reply(`⏳ Aguarde ${cooldownLeft.toFixed(1)}s para usar este comando novamente.`);
            return;
        }
        // Verifica permissões
        if (command.permissions && message.member) {
            const hasPermission = command.permissions.every(perm => message.member?.permissions.has(perm));
            if (!hasPermission) {
                await message.reply('❌ Você não tem permissão para usar este comando.');
                return;
            }
        }
        try {
            await command.execute(message, args);
            logger_service_1.logger.info(`Comando executado: ${commandName}`, {
                user: message.author.tag,
                guild: message.guild?.name
            });
        }
        catch (error) {
            logger_service_1.logger.error(`Erro ao executar ${commandName}:`, { error });
            await message.reply('❌ Ocorreu um erro ao executar o comando.');
        }
    }
}
exports.CommandHandler = CommandHandler;
// Singleton
exports.commandHandler = new CommandHandler();
//# sourceMappingURL=command.handler.js.map