/**
 * 📝 Logger Service - Logging estruturado para produção
 *
 * Fornece logs coloridos no console e arquivo para debugging.
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';
declare class Logger {
    private logDir;
    private minLevel;
    private levels;
    private colors;
    private reset;
    constructor(options?: {
        logDir?: string;
        minLevel?: LogLevel;
    });
    private shouldLog;
    private formatMessage;
    private writeToConsole;
    private writeToFile;
    private log;
    debug(message: string, meta?: Record<string, unknown>): void;
    info(message: string, meta?: Record<string, unknown>): void;
    warn(message: string, meta?: Record<string, unknown>): void;
    error(message: string, meta?: Record<string, unknown>): void;
    /**
     * Log específico para comandos admin com audit
     */
    adminAction(guildId: string, userId: string, action: string, params: Record<string, unknown>, result: string): void;
    /**
     * Configura o nível mínimo de log
     */
    setLevel(level: LogLevel): void;
}
export declare const logger: Logger;
export { Logger };
//# sourceMappingURL=logger.service.d.ts.map