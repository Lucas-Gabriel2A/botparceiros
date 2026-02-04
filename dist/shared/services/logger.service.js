"use strict";
/**
 * 📝 Logger Service - Logging estruturado para produção
 *
 * Fornece logs coloridos no console e arquivo para debugging.
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
exports.Logger = exports.logger = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
class Logger {
    logDir;
    minLevel;
    levels = {
        debug: 0,
        info: 1,
        warn: 2,
        error: 3
    };
    colors = {
        debug: '\x1b[36m', // Cyan
        info: '\x1b[32m', // Green
        warn: '\x1b[33m', // Yellow
        error: '\x1b[31m' // Red
    };
    reset = '\x1b[0m';
    constructor(options) {
        this.logDir = options?.logDir || path.join(process.cwd(), 'logs');
        this.minLevel = options?.minLevel || 'info';
        // Cria diretório de logs se não existir
        if (!fs.existsSync(this.logDir)) {
            fs.mkdirSync(this.logDir, { recursive: true });
        }
    }
    shouldLog(level) {
        return this.levels[level] >= this.levels[this.minLevel];
    }
    formatMessage(level, message, meta) {
        return {
            timestamp: new Date().toISOString(),
            level,
            message,
            meta
        };
    }
    writeToConsole(entry) {
        const color = this.colors[entry.level];
        const prefix = `${color}[${entry.level.toUpperCase()}]${this.reset}`;
        const timestamp = `\x1b[90m${entry.timestamp}\x1b[0m`;
        let output = `${timestamp} ${prefix} ${entry.message}`;
        if (entry.meta) {
            output += ` ${JSON.stringify(entry.meta)}`;
        }
        console.log(output);
    }
    writeToFile(entry) {
        const today = new Date().toISOString().split('T')[0];
        const logFile = path.join(this.logDir, `${today}.log`);
        const line = JSON.stringify(entry) + '\n';
        fs.appendFileSync(logFile, line);
    }
    log(level, message, meta) {
        if (!this.shouldLog(level))
            return;
        const entry = this.formatMessage(level, message, meta);
        this.writeToConsole(entry);
        this.writeToFile(entry);
    }
    debug(message, meta) {
        this.log('debug', message, meta);
    }
    info(message, meta) {
        this.log('info', message, meta);
    }
    warn(message, meta) {
        this.log('warn', message, meta);
    }
    error(message, meta) {
        this.log('error', message, meta);
    }
    /**
     * Log específico para comandos admin com audit
     */
    adminAction(guildId, userId, action, params, result) {
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
    setLevel(level) {
        this.minLevel = level;
    }
}
exports.Logger = Logger;
// Singleton
exports.logger = new Logger({
    minLevel: process.env.NODE_ENV === 'production' ? 'info' : 'debug'
});
//# sourceMappingURL=logger.service.js.map