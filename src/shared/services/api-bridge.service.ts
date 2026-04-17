import fs from 'fs';
import path from 'path';
import { logger } from './logger.service';

export interface ApiConfig {
    url: string;
    method: string;
    embedMapping: {
        title?: string;
        description?: string;
        image?: string;
        color?: string;
    };
}

export class ApiBridgeService {
    private configs: Record<string, ApiConfig> = {};

    constructor() {
        this.loadConfigs();
    }

    private loadConfigs() {
        try {
            const configPath = path.join(process.cwd(), 'src/shared/configs/apis.config.json');
            if (fs.existsSync(configPath)) {
                const rawData = fs.readFileSync(configPath, 'utf8');
                this.configs = JSON.parse(rawData);
            }
        } catch (error) {
            logger.error('Erro ao carregar apis.config.json', { error });
        }
    }

    private resolveTemplate(template: string, data: any): string {
        if (!template) return '';
        return template.replace(/\{([^}]+)\}/g, (match, key) => {
            // allows nested object resolution like {current.temp_c}
            const keys = key.split('.');
            let value = data;
            for (const k of keys) {
                if (value && typeof value === 'object' && k in value) {
                    value = value[k];
                } else {
                    return match; // return original if not found
                }
            }
            return String(value);
        });
    }

    async fetchApi(providerId: string, queryParam: string = ''): Promise<any | null> {
        let config = this.configs[providerId];
        
        // Se for GIF fallback local (Nekos.best não exige Key)
        if (!config && providerId.startsWith('gif_')) return null;

        if (!config) {
            logger.warn(`API Provider ${providerId} não encontrado no JSON.`);
            return null;
        }

        // Recupera Chaves do .env process.env
        let apiKey = '';
        if (providerId === 'nasa_apod') apiKey = process.env.NASA_API_KEY || 'DEMO_KEY';
        if (providerId === 'movies') apiKey = process.env.OMDB_API_KEY || '';
        if (providerId === 'clima') apiKey = process.env.WEATHER_API_KEY || '';

        // Monta a URL Final
        let finalUrl = config.url
            .replace('{API_KEY}', apiKey)
            .replace('{query}', encodeURIComponent(queryParam));

        try {
            const response = await fetch(finalUrl, { method: config.method || 'GET' });
            if (!response.ok) {
                logger.error(`Erro na API ${providerId}: Status ${response.status}`);
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
        } catch (error) {
            logger.error(`Exceção ao fetchar ${providerId}`, { error });
            return null;
        }
    }
}

export const apiBridgeService = new ApiBridgeService();
