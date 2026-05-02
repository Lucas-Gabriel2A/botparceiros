import { Redis } from 'ioredis';
declare class RedisService {
    client: Redis | null;
    isConnected: boolean;
    constructor();
    private initialize;
    /**
     * Tenta obter o cliente se estiver conectado.
     */
    getClient(): Redis | null;
}
export declare const redisService: RedisService;
export {};
//# sourceMappingURL=redis.service.d.ts.map