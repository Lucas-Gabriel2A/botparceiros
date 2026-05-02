import { Interaction, VoiceState, Client } from 'discord.js';
export declare function setupPrivateCallsEvents(client: Client): void;
export declare const PRIVATE_CALLS_EVENTS: {
    name: string;
    commands: import("discord.js").SlashCommandSubcommandsOnlyBuilder[];
    onInteractionCreate(interaction: Interaction): Promise<void>;
    onVoiceStateUpdate(oldState: VoiceState, _newState: VoiceState): Promise<void>;
};
//# sourceMappingURL=events.d.ts.map