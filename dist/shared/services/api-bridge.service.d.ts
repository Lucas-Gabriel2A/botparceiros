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
export declare class ApiBridgeService {
    private configs;
    constructor();
    private loadConfigs;
    private resolveTemplate;
    fetchApi(providerId: string, queryParam?: string): Promise<any | null>;
}
export declare const apiBridgeService: ApiBridgeService;
//# sourceMappingURL=api-bridge.service.d.ts.map