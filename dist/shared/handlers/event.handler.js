"use strict";
/**
 * 🎉 Event Handler - Carrega e registra eventos dinamicamente
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
exports.EventHandler = void 0;
exports.createEventHandler = createEventHandler;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const logger_service_1 = require("../services/logger.service");
class EventHandler {
    client;
    events = new Map();
    constructor(client) {
        this.client = client;
    }
    /**
     * Carrega eventos de um diretório
     */
    async loadEvents(eventsDir) {
        if (!fs.existsSync(eventsDir)) {
            logger_service_1.logger.warn(`Diretório de eventos não existe: ${eventsDir}`);
            return;
        }
        const files = fs.readdirSync(eventsDir).filter(file => file.endsWith('.ts') || file.endsWith('.js'));
        for (const file of files) {
            try {
                const filePath = path.join(eventsDir, file);
                const event = await Promise.resolve(`${filePath}`).then(s => __importStar(require(s)));
                if (event.default) {
                    const eventData = event.default;
                    this.events.set(eventData.name, eventData);
                    if (eventData.once) {
                        this.client.once(eventData.name, (...args) => eventData.execute(...args));
                    }
                    else {
                        this.client.on(eventData.name, (...args) => eventData.execute(...args));
                    }
                    logger_service_1.logger.debug(`Evento registrado: ${eventData.name}`);
                }
            }
            catch (error) {
                logger_service_1.logger.error(`Erro ao carregar evento ${file}:`, { error });
            }
        }
        logger_service_1.logger.info(`${this.events.size} eventos registrados`);
    }
    /**
     * Lista todos os eventos carregados
     */
    list() {
        return Array.from(this.events.keys());
    }
}
exports.EventHandler = EventHandler;
function createEventHandler(client) {
    return new EventHandler(client);
}
//# sourceMappingURL=event.handler.js.map