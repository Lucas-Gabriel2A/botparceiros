import {
    createCustomCommand,
    getCustomCommands,
    getCustomCommand,
    deleteCustomCommand,
    toggleCustomCommand,
    CustomCommand
} from '../../shared/services';
import { refreshGuildCommands } from './registration';

export class CustomCommandService {
    private cache = new Map<string, CustomCommand>();

    private getCacheKey(guildId: string, name: string): string {
        return `${guildId}:${name}`;
    }

    async create(
        guildId: string,
        name: string,
        description: string,
        response: string | null,
        actions: any[],
        createdBy: string,
        options: any[] = []
    ): Promise<CustomCommand> {
        // Normalize name: lowercase, replace spaces with hyphens, remove special chars
        const normalizedName = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

        const cmd = await createCustomCommand(
            crypto.randomUUID(),
            guildId,
            normalizedName,
            description,
            response,
            actions,
            createdBy,
            options
        );

        // Update Cache
        this.cache.set(this.getCacheKey(guildId, normalizedName), cmd);

        await refreshGuildCommands(guildId);
        return cmd;
    }

    async getAll(guildId: string): Promise<CustomCommand[]> {
        return await getCustomCommands(guildId);
    }

    async get(guildId: string, name: string): Promise<CustomCommand | null> {
        const key = this.getCacheKey(guildId, name);
        if (this.cache.has(key)) {
            return this.cache.get(key)!;
        }

        const cmd = await getCustomCommand(guildId, name);
        if (cmd) {
            this.cache.set(key, cmd);
        }
        return cmd;
    }

    async deleteWithGuild(id: string, guildId: string): Promise<boolean> {
        // We can't easily invalidate by ID without iterating or fetching first.
        // Let's iterate to find the key for this ID to remove it from cache.
        for (const [key, cmd] of this.cache.entries()) {
            if (cmd.id === id) {
                this.cache.delete(key);
                break;
            }
        }

        const result = await deleteCustomCommand(id);
        if (result) {
            await refreshGuildCommands(guildId);
        }
        return result;
    }

    // Deprecated/Legacy delete (if used elsewhere)
    async delete(id: string): Promise<boolean> {
        for (const [key, cmd] of this.cache.entries()) {
            if (cmd.id === id) {
                this.cache.delete(key);
                break;
            }
        }
        return await deleteCustomCommand(id);
    }

    async toggle(id: string, enabled: boolean): Promise<CustomCommand | null> {
        const cmd = await toggleCustomCommand(id, enabled);
        if (cmd) {
            this.cache.set(this.getCacheKey(cmd.guild_id, cmd.name), cmd);
            await refreshGuildCommands(cmd.guild_id);
        }
        return cmd;
    }
}

export const customCommandService = new CustomCommandService();
