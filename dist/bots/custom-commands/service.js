"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.customCommandService = exports.CustomCommandService = void 0;
const services_1 = require("../../shared/services");
const registration_1 = require("./registration");
class CustomCommandService {
    cache = new Map();
    getCacheKey(guildId, name) {
        return `${guildId}:${name}`;
    }
    async create(guildId, name, description, response, actions, createdBy, options = []) {
        // Normalize name: lowercase, replace spaces with hyphens, remove special chars
        const normalizedName = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
        const cmd = await (0, services_1.createCustomCommand)(crypto.randomUUID(), guildId, normalizedName, description, response, actions, createdBy, options);
        // Update Cache
        this.cache.set(this.getCacheKey(guildId, normalizedName), cmd);
        await (0, registration_1.refreshGuildCommands)(guildId);
        return cmd;
    }
    async getAll(guildId) {
        return await (0, services_1.getCustomCommands)(guildId);
    }
    async get(guildId, name) {
        const key = this.getCacheKey(guildId, name);
        if (this.cache.has(key)) {
            return this.cache.get(key);
        }
        const cmd = await (0, services_1.getCustomCommand)(guildId, name);
        if (cmd) {
            this.cache.set(key, cmd);
        }
        return cmd;
    }
    async deleteWithGuild(id, guildId) {
        // We can't easily invalidate by ID without iterating or fetching first.
        // Let's iterate to find the key for this ID to remove it from cache.
        for (const [key, cmd] of this.cache.entries()) {
            if (cmd.id === id) {
                this.cache.delete(key);
                break;
            }
        }
        const result = await (0, services_1.deleteCustomCommand)(id);
        if (result) {
            await (0, registration_1.refreshGuildCommands)(guildId);
        }
        return result;
    }
    // Deprecated/Legacy delete (if used elsewhere)
    async delete(id) {
        for (const [key, cmd] of this.cache.entries()) {
            if (cmd.id === id) {
                this.cache.delete(key);
                break;
            }
        }
        return await (0, services_1.deleteCustomCommand)(id);
    }
    async toggle(id, enabled) {
        const cmd = await (0, services_1.toggleCustomCommand)(id, enabled);
        if (cmd) {
            this.cache.set(this.getCacheKey(cmd.guild_id, cmd.name), cmd);
            await (0, registration_1.refreshGuildCommands)(cmd.guild_id);
        }
        return cmd;
    }
}
exports.CustomCommandService = CustomCommandService;
exports.customCommandService = new CustomCommandService();
//# sourceMappingURL=service.js.map