"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.apiBridgeService = exports.ApiBridgeService = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const logger_service_1 = require("./logger.service");
class ApiBridgeService {
    configs = {};
    constructor() {
        this.loadConfigs();
    }
    loadConfigs() {
        try {
            const configPath = path_1.default.join(process.cwd(), 'src/shared/configs/apis.config.json');
            if (fs_1.default.existsSync(configPath)) {
                const rawData = fs_1.default.readFileSync(configPath, 'utf8');
                this.configs = JSON.parse(rawData);
            }
        }
        catch (error) {
            logger_service_1.logger.error('Erro ao carregar apis.config.json', { error });
        }
    }
    resolveTemplate(template, data) {
        if (!template)
            return '';
        return template.replace(/\{([^}]+)\}/g, (match, key) => {
            // allows nested object resolution like {current.temp_c}
            const keys = key.split('.');
            let value = data;
            for (const k of keys) {
                if (value && typeof value === 'object' && k in value) {
                    value = value[k];
                }
                else {
                    return match; // return original if not found
                }
            }
            return String(value);
        });
    }
    async fetchApi(providerId, queryParam = '') {
        let config = this.configs[providerId];
        // Se for GIF fallback local (Nekos.best não exige Key)
        if (!config && providerId.startsWith('gif_'))
            return null;
        if (!config) {
            logger_service_1.logger.warn(`API Provider ${providerId} não encontrado no JSON.`);
            return null;
        }
        // Recupera Chaves do .env process.env
        let apiKey = '';
        if (providerId === 'nasa_apod')
            apiKey = process.env.NASA_API_KEY || 'DEMO_KEY';
        if (providerId === 'movies')
            apiKey = process.env.OMDB_API_KEY || '';
        if (providerId === 'clima')
            apiKey = process.env.WEATHER_API_KEY || '';
        // Monta a URL Final
        let finalUrl = config.url
            .replace('{API_KEY}', apiKey)
            .replace('{query}', encodeURIComponent(queryParam));
        try {
            const response = await fetch(finalUrl, { method: config.method || 'GET' });
            if (!response.ok) {
                logger_service_1.logger.error(`Erro na API ${providerId}: Status ${response.status}`);
                return null;
            }
            const data = await response.json();
            // Mapeia para o Formato Embed esperado pelo Engine
            const result = {
                title: config.embedMapping.title ? this.resolveTemplate(config.embedMapping.title, data) : '',
                description: config.embedMapping.description ? this.resolveTemplate(config.embedMapping.description, data) : '',
                image: config.embedMapping.image ? this.resolveTemplate(config.embedMapping.image, data) : '',
                color: config.embedMapping.color || '#99AAB5'
            };
            return result;
        }
        catch (error) {
            logger_service_1.logger.error(`Exceção ao fetchar ${providerId}`, { error });
            return null;
        }
    }
}
exports.ApiBridgeService = ApiBridgeService;
exports.apiBridgeService = new ApiBridgeService();
//# sourceMappingURL=api-bridge.service.js.map