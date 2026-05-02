"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.redisService = void 0;
const ioredis_1 = require("ioredis");
const config_service_1 = require("./config.service");
const logger_service_1 = require("./logger.service");
class RedisService {
    client = null;
    isConnected = false;
    constructor() {
        this.initialize();
    }
    initialize() {
        const redisConfig = config_service_1.config.getRedisConfig();
        if (!redisConfig.url) {
            logger_service_1.logger.warn('⚠️ REDIS_URL não configurada. Operando em modo de Fallback (Apenas PostgreSQL)');
            return;
        }
        try {
            this.client = new ioredis_1.Redis(redisConfig.url, {
                maxRetriesPerRequest: 3,
                retryStrategy: (times) => {
                    const delay = Math.min(times * 50, 2000);
                    return delay;
                }
            });
            this.client.on('connect', () => {
                logger_service_1.logger.info('🚀 Conexão com Redis estabelecida com sucesso');
                this.isConnected = true;
            });
            this.client.on('error', (err) => {
                logger_service_1.logger.warn('⚠️ Erro de conexão com Redis (Fallback acionado para PostgreSQL):', { error: err.message });
                this.isConnected = false;
            });
        }
        catch (error) {
            logger_service_1.logger.error('❌ Falha ao inicializar Redis:', { error: error.message });
            this.isConnected = false;
        }
    }
    /**
     * Tenta obter o cliente se estiver conectado.
     */
    getClient() {
        return this.isConnected ? this.client : null;
    }
}
exports.redisService = new RedisService();
//# sourceMappingURL=redis.service.js.map