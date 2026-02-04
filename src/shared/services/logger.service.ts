/**
 * 📝 Logger Service - Logging estruturado para produção
 * 
 * Fornece logs coloridos no console e arquivo para debugging.
 */

import * as fs from 'fs';
import * as path from 'path';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
    timestamp: string;
    level: LogLevel;
    message: string;
    meta?: Record<string, unknown>;
}

class Logger {
    private logDir: string;
    private minLevel: LogLevel;
    private levels: Record<LogLevel, number> = {
        debug: 0,
        info: 1,
        warn: 2,
        error: 3
    };
    private colors: Record<LogLevel, string> = {
        debug: '\x1b[36m', // Cyan
        info: '\x1b[32m',  // Green
        warn: '\x1b[33m',  // Yellow
        error: '\x1b[31m'  // Red
    };
    private reset = '\x1b[0m';

    constructor(options?: { logDir?: string; minLevel?: LogLevel }) {
        this.logDir = options?.logDir || path.join(process.cwd(), 'logs');
        this.minLevel = options?.minLevel || 'info';

        // Cria diretório de logs se não existir
        if (!fs.existsSync(this.logDir)) {
            fs.mkdirSync(this.logDir, { recursive: true });
        }
    }

    private shouldLog(level: LogLevel): boolean {
        return this.levels[level] >= this.levels[this.minLevel];
    }

    private formatMessage(level: LogLevel, message: string, meta?: Record<string, unknown>): LogEntry {
        return {
            timestamp: new Date().toISOString(),
            level,
            message,
            meta
        };
    }

    private writeToConsole(entry: LogEntry): void {
        const color = this.colors[entry.level];
        const prefix = `${color}[${entry.level.toUpperCase()}]${this.reset}`;
        const timestamp = `\x1b[90m${entry.timestamp}\x1b[0m`;
        
        let output = `${timestamp} ${prefix} ${entry.message}`;
        
        if (entry.meta) {
            output += ` ${JSON.stringify(entry.meta)}`;
        }

        console.log(output);
    }

    private writeToFile(entry: LogEntry): void {
        const today = new Date().toISOString().split('T')[0];
        const logFile = path.join(this.logDir, `${today}.log`);
        const line = JSON.stringify(entry) + '\n';

        fs.appendFileSync(logFile, line);
    }

    private log(level: LogLevel, message: string, meta?: Record<string, unknown>): void {
        if (!this.shouldLog(level)) return;

        const entry = this.formatMessage(level, message, meta);
        this.writeToConsole(entry);
        this.writeToFile(entry);
    }

    debug(message: string, meta?: Record<string, unknown>): void {
        this.log('debug', message, meta);
    }

    info(message: string, meta?: Record<string, unknown>): void {
        this.log('info', message, meta);
    }

    warn(message: string, meta?: Record<string, unknown>): void {
        this.log('warn', message, meta);
    }

    error(message: string, meta?: Record<string, unknown>): void {
        this.log('error', message, meta);
    }

    /**
     * Log específico para comandos admin com audit
     */
    adminAction(
        guildId: string,
        userId: string,
        action: string,
        params: Record<string, unknown>,
        result: string
    ): void {
        this.info(`Admin action: ${action}`, {
            guildId,
            userId,
            params,
            result
        });
    }

    /**
     * Configura o nível mínimo de log
     */
    setLevel(level: LogLevel): void {
        this.minLevel = level;
    }
}

// Singleton
export const logger = new Logger({
    minLevel: process.env.NODE_ENV === 'production' ? 'info' : 'debug'
});

export { Logger };
