
import {
    ChannelType,
    Guild,
    GuildMember,
    PermissionsBitField,
    VoiceChannel
} from 'discord.js';
import { database } from '../../shared/services/database';
import { logger } from '../../shared/services/logger.service';

export const PRIVATE_CALLS_SERVICE = {
    /**
     * Creates a new private voice channel for a user
     */
    async createPrivateChannel(guild: Guild, member: GuildMember, categoryId: string): Promise<VoiceChannel | null> {
        try {
            // Check if user already has a channel?
            const existingCall = await database.getPrivateCallByOwner(guild.id, member.id);
            if (existingCall) {
                // Return existing channel if distinct, or maybe just tell them they have one.
                // For now, let's allow 1 per user.
                const channel = guild.channels.cache.get(existingCall.channel_id) as VoiceChannel;
                if (channel) return channel;

                // If ID exists in DB but not in Discord, cleanup DB
                await database.deletePrivateCall(existingCall.channel_id);
            }

            const channelName = `🔊 Call de ${member.displayName}`;

            const channel = await guild.channels.create({
                name: channelName,
                type: ChannelType.GuildVoice,
                parent: categoryId,
                permissionOverwrites: [
                    {
                        id: guild.id, // @everyone
                        allow: [PermissionsBitField.Flags.ViewChannel],
                        deny: [PermissionsBitField.Flags.Connect] // Only view, cannot connect
                    },
                    {
                        id: member.id,
                        allow: [
                            PermissionsBitField.Flags.ViewChannel,
                            PermissionsBitField.Flags.Connect,
                            PermissionsBitField.Flags.Speak,
                            PermissionsBitField.Flags.Stream,
                            PermissionsBitField.Flags.UseVAD,
                            PermissionsBitField.Flags.MoveMembers, // Allow them to move people out? Maybe too strong.
                            PermissionsBitField.Flags.MuteMembers, // Moderate their own call
                            PermissionsBitField.Flags.DeafenMembers,
                            PermissionsBitField.Flags.ManageChannels // Edit name/limit
                        ]
                    }
                ]
            });

            // Save to DB
            await database.createPrivateCall(channel.id, guild.id, member.id, false, undefined);

            // Move member if they are in a voice channel
            if (member.voice.channel) {
                await member.voice.setChannel(channel);
            }

            logger.info(`Private Call created for ${member.user.tag} in guild ${guild.name}`);
            return channel;

        } catch (error) {
            logger.error('Error creating private call:', { error });
            return null;
        }
    },

    /**
     * Deletes a private voice channel
     */
    async deletePrivateChannel(channelId: string, guild: Guild): Promise<boolean> {
        try {
            const channel = guild.channels.cache.get(channelId);
            if (channel) {
                await channel.delete();
            }
            await database.deletePrivateCall(channelId);
            return true;
        } catch (error) {
            logger.error(`Error deleting private call ${channelId}:`, { error });
            return false;
        }
    },

    /**
     * Checks if a channel is empty and deletes it if so
     */
    async checkAndCleanup(channelId: string, guild: Guild): Promise<void> {
        const call = await database.getPrivateCall(channelId);
        if (!call) return;

        const channel = guild.channels.cache.get(channelId) as VoiceChannel;
        if (!channel) {
            // Channel deleted manually? cleanup DB
            await database.deletePrivateCall(channelId);
            return;
        }

        // Check if empty
        if (channel.members.size === 0) {
            await this.deletePrivateChannel(channelId, guild);
            logger.info(`Deleted empty private call ${channelId}`);
        }
    }
};
