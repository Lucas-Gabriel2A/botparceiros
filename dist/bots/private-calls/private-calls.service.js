"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PRIVATE_CALLS_SERVICE = void 0;
const discord_js_1 = require("discord.js");
const database_1 = require("../../shared/services/database");
const logger_service_1 = require("../../shared/services/logger.service");
exports.PRIVATE_CALLS_SERVICE = {
    /**
     * Creates a new private voice channel for a user
     */
    async createPrivateChannel(guild, member, categoryId) {
        try {
            // Check if user already has a channel?
            const existingCall = await database_1.database.getPrivateCallByOwner(guild.id, member.id);
            if (existingCall) {
                // Return existing channel if distinct, or maybe just tell them they have one.
                // For now, let's allow 1 per user.
                const channel = guild.channels.cache.get(existingCall.channel_id);
                if (channel)
                    return channel;
                // If ID exists in DB but not in Discord, cleanup DB
                await database_1.database.deletePrivateCall(existingCall.channel_id);
            }
            const channelName = `🔊 Call de ${member.displayName}`;
            const channel = await guild.channels.create({
                name: channelName,
                type: discord_js_1.ChannelType.GuildVoice,
                parent: categoryId,
                permissionOverwrites: [
                    {
                        id: guild.id, // @everyone
                        allow: [discord_js_1.PermissionsBitField.Flags.ViewChannel],
                        deny: [discord_js_1.PermissionsBitField.Flags.Connect] // Only view, cannot connect
                    },
                    {
                        id: member.id,
                        allow: [
                            discord_js_1.PermissionsBitField.Flags.ViewChannel,
                            discord_js_1.PermissionsBitField.Flags.Connect,
                            discord_js_1.PermissionsBitField.Flags.Speak,
                            discord_js_1.PermissionsBitField.Flags.Stream,
                            discord_js_1.PermissionsBitField.Flags.UseVAD,
                            discord_js_1.PermissionsBitField.Flags.MoveMembers, // Allow them to move people out? Maybe too strong.
                            discord_js_1.PermissionsBitField.Flags.MuteMembers, // Moderate their own call
                            discord_js_1.PermissionsBitField.Flags.DeafenMembers,
                            discord_js_1.PermissionsBitField.Flags.ManageChannels // Edit name/limit
                        ]
                    }
                ]
            });
            // Save to DB
            await database_1.database.createPrivateCall(channel.id, guild.id, member.id, false, undefined);
            // Move member if they are in a voice channel
            if (member.voice.channel) {
                await member.voice.setChannel(channel);
            }
            logger_service_1.logger.info(`Private Call created for ${member.user.tag} in guild ${guild.name}`);
            return channel;
        }
        catch (error) {
            logger_service_1.logger.error('Error creating private call:', { error });
            return null;
        }
    },
    /**
     * Deletes a private voice channel
     */
    async deletePrivateChannel(channelId, guild) {
        try {
            const channel = guild.channels.cache.get(channelId);
            if (channel) {
                await channel.delete();
            }
            await database_1.database.deletePrivateCall(channelId);
            return true;
        }
        catch (error) {
            logger_service_1.logger.error(`Error deleting private call ${channelId}:`, { error });
            return false;
        }
    },
    /**
     * Checks if a channel is empty and deletes it if so
     */
    async checkAndCleanup(channelId, guild) {
        const call = await database_1.database.getPrivateCall(channelId);
        if (!call)
            return;
        const channel = guild.channels.cache.get(channelId);
        if (!channel) {
            // Channel deleted manually? cleanup DB
            await database_1.database.deletePrivateCall(channelId);
            return;
        }
        // Check if empty
        if (channel.members.size === 0) {
            await this.deletePrivateChannel(channelId, guild);
            logger_service_1.logger.info(`Deleted empty private call ${channelId}`);
        }
    }
};
//# sourceMappingURL=private-calls.service.js.map