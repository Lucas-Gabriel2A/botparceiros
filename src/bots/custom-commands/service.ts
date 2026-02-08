import {
    createCustomCommand,
    getCustomCommands,
    getCustomCommand,
    deleteCustomCommand,
    toggleCustomCommand,
    CustomCommand
} from '../../shared/services';

export class CustomCommandService {
    async create(
        guildId: string,
        name: string,
        description: string,
        response: string | null,
        actions: any[],
        createdBy: string
    ): Promise<CustomCommand> {
        // Normalize name: lowercase, replace spaces with hyphens, remove special chars
        const normalizedName = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

        return await createCustomCommand(
            crypto.randomUUID(),
            guildId,
            normalizedName,
            description,
            response,
            actions,
            createdBy
        );
    }

    async getAll(guildId: string): Promise<CustomCommand[]> {
        return await getCustomCommands(guildId);
    }

    async get(guildId: string, name: string): Promise<CustomCommand | null> {
        return await getCustomCommand(guildId, name);
    }

    async delete(id: string): Promise<boolean> {
        return await deleteCustomCommand(id);
    }

    async toggle(id: string, enabled: boolean): Promise<CustomCommand | null> {
        return await toggleCustomCommand(id, enabled);
    }
}

export const customCommandService = new CustomCommandService();
