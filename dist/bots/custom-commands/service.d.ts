import { CustomCommand } from '../../shared/services';
export declare class CustomCommandService {
    private cache;
    private getCacheKey;
    create(guildId: string, name: string, description: string, response: string | null, actions: any[], createdBy: string, options?: any[]): Promise<CustomCommand>;
    getAll(guildId: string): Promise<CustomCommand[]>;
    get(guildId: string, name: string): Promise<CustomCommand | null>;
    deleteWithGuild(id: string, guildId: string): Promise<boolean>;
    delete(id: string): Promise<boolean>;
    toggle(id: string, enabled: boolean): Promise<CustomCommand | null>;
}
export declare const customCommandService: CustomCommandService;
//# sourceMappingURL=service.d.ts.map