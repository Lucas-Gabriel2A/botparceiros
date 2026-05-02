import { Guild, GuildMember, VoiceChannel } from 'discord.js';
export declare const PRIVATE_CALLS_SERVICE: {
    /**
     * Creates a new private voice channel for a user
     */
    createPrivateChannel(guild: Guild, member: GuildMember, categoryId: string): Promise<VoiceChannel | null>;
    /**
     * Deletes a private voice channel
     */
    deletePrivateChannel(channelId: string, guild: Guild): Promise<boolean>;
    /**
     * Checks if a channel is empty and deletes it if so
     */
    checkAndCleanup(channelId: string, guild: Guild): Promise<void>;
};
//# sourceMappingURL=private-calls.service.d.ts.map