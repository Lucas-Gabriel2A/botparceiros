import { Redis } from 'ioredis';
import { config } from './config.service';
import { logger } from './logger.service';

class RedisService {
    public client: Redis | null = null;
    public isConnected: boolean = false;

    constructor() {
        this.initialize();
    }

    private initialize() {
        const redisConfig = config.getRedisConfig();
        
        if (!redisConfig.url) {
            logger.warn('⚠️ REDIS_URL não configurada. Operando em modo de Fallback (Apenas PostgreSQL)');
            return;
        }

        try {
            this.client = new Redis(redisConfig.url, {
                maxRetriesPerRequest: 3,
                retryStrategy: (times) => {
                    const delay = Math.min(times * 50, 2000);
                    return delay;
                }
            });

            this.client.on('connect', () => {
                logger.info('🚀 Conexão com Redis estabelecida com sucesso');
                this.isConnected = true;
            });

            this.client.on('error', (err) => {
                logger.warn('⚠️ Erro de conexão com Redis (Fallback acionado para PostgreSQL):', { error: err.message });
                this.isConnected = false;
            });

        } catch (error: any) {
            logger.error('❌ Falha ao inicializar Redis:', { error: error.message });
            this.isConnected = false;
        }
    }

    /**
     * Tenta obter o cliente se estiver conectado.
     */
    public getClient(): Redis | null {
        return this.isConnected ? this.client : null;
    }
}

export const redisService = new RedisService();
