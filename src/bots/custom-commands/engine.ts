import { ChatInputCommandInteraction, TextChannel, GuildMember } from 'discord.js';
import { logger } from '../../shared/services';

interface Action {
    type: 'REPLY' | 'ADD_ROLE' | 'REMOVE_ROLE' | 'SEND_DM' | 'SEND_CHANNEL' | 'KICK' | 'BAN';
    [key: string]: any;
}

export class CommandEngine {
    async execute(interaction: ChatInputCommandInteraction, actions: Action[]) {
        try {
            // Determine visibility based on the first REPLY action, default to public (false)
            // If no reply action, default to public? or ephemeral?
            // Let's look for a REPLY action to decide.
            const replyAction = actions.find(a => a.type === 'REPLY');
            const shouldBeEphemeral = replyAction?.ephemeral || false;

            // Defer immediately to prevent timeout
            if (!interaction.deferred && !interaction.replied) {
                await interaction.deferReply({ ephemeral: shouldBeEphemeral });
            }

            for (const action of actions) {
                await this.executeAction(interaction, action);
            }

            // If finished actions and still deferred but no reply sent (e.g. only roles added)
            // We should probably acknowledge if nothing else happened?
            // But usually there IS a reply action.

        } catch (error) {
            logger.error('Erro ao executar comando personalizado:', { error });
            const errorMessage = '❌ Erro ao executar comando.';

            try {
                if (interaction.deferred || interaction.replied) {
                    await interaction.followUp({ content: errorMessage, ephemeral: true });
                } else {
                    await interaction.reply({ content: errorMessage, ephemeral: true });
                }
            } catch (err) {
                // If we can't even reply error, just log
                logger.error('Erro ao enviar mensagem de erro:', err);
            }
        }
    }

    private async executeAction(interaction: ChatInputCommandInteraction, action: Action) {
        const member = interaction.member as GuildMember;
        const guild = interaction.guild;

        if (!guild) return;

        switch (action.type) {
            case 'REPLY':
                const content = action.content as string;
                const ephemeral = action.ephemeral as boolean || false;

                if (interaction.deferred) {
                    await interaction.editReply({ content });
                } else if (interaction.replied) {
                    await interaction.followUp({ content, ephemeral });
                } else {
                    await interaction.reply({ content, ephemeral });
                }
                break;

            case 'ADD_ROLE':
                const roleId = action.role_id;
                // TODO: Resolve role by name if needed, but ID is safer from AI
                if (roleId) {
                    await member.roles.add(roleId);
                }
                break;

            case 'REMOVE_ROLE':
                const removeRoleId = action.role_id;
                if (removeRoleId) {
                    await member.roles.remove(removeRoleId);
                }
                break;

            case 'SEND_DM':
                const dmContent = action.content;
                await member.send(dmContent);
                break;

            case 'SEND_CHANNEL':
                // ... implementation
                break;
        }
    }
}

export const commandEngine = new CommandEngine();
