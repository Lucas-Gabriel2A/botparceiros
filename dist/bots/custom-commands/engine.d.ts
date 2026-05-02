import { ChatInputCommandInteraction } from 'discord.js';
interface Action {
    type: 'REPLY' | 'ADD_ROLE' | 'REMOVE_ROLE' | 'SEND_DM' | 'SEND_CHANNEL' | 'KICK' | 'BAN' | 'RANDOM_IMAGE' | 'SET_NICKNAME' | 'EXTERNAL_API';
    [key: string]: any;
}
export declare class CommandEngine {
    execute(interaction: ChatInputCommandInteraction, actions: Action[]): Promise<void>;
    private getTargetMember;
    private interpolate;
    private executeAction;
}
export declare const commandEngine: CommandEngine;
export {};
//# sourceMappingURL=engine.d.ts.map