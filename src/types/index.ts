/**
 * 📋 Type Definitions for Nexstar Discord Bots
 */

import { 
    Message, 
    ChatInputCommandInteraction
} from 'discord.js';

// ═══════════════════════════════════════════════════════════════════════════
// 🔐 ADMIN COMMANDS
// ═══════════════════════════════════════════════════════════════════════════

export type AdminAction = 
    | 'timeout' | 'kick' | 'ban' | 'unban' | 'warn' | 'clear'
    | 'create_category' | 'create_category_with_channels' | 'create_channel'
    | 'delete_channel' | 'rename_channel' | 'slowmode' | 'lock_channel' | 'unlock_channel'
    | 'give_role' | 'remove_role' | 'create_role'
    | 'server_info' | 'user_info' | 'announce' | 'send_message' | 'embed' | 'reminder'
    | 'none';

export interface AdminCommandParams {
    targetUser?: string;
    targetUserId?: string;
    duration?: number;
    reason?: string;
    count?: number;
    categoryName?: string;
    channelName?: string;
    channels?: string[];
    type?: 'text' | 'voice';
    staffOnly?: boolean;
    oldName?: string;
    newName?: string;
    seconds?: number;
    roleName?: string;
    color?: string;
    message?: string;
    prompt?: string;
    mentionEveryone?: boolean;
    title?: string;
    description?: string;
}

export interface ParsedAdminCommand {
    action: AdminAction;
    params: AdminCommandParams;
}

// ═══════════════════════════════════════════════════════════════════════════
// 🗄️ DATABASE
// ═══════════════════════════════════════════════════════════════════════════

export interface GuildConfig {
    guild_id: string;
    owner_role_id?: string;
    admin_role_ids?: string[];
    staff_role_id?: string;
    chat_geral_id?: string;
    prefix: string;
    features: GuildFeatures;
    created_at: Date;
    updated_at: Date;
}

export interface GuildFeatures {
    inactivity_monitor: boolean;
    admin_commands: boolean;
    voice_chat: boolean;
    auto_moderate: boolean;
}

export interface AuditLogEntry {
    id: number;
    guild_id: string;
    user_id: string;
    action: string;
    params: Record<string, unknown>;
    result: string;
    timestamp: Date;
}

// ═══════════════════════════════════════════════════════════════════════════
// 🤖 LLM SERVICE
// ═══════════════════════════════════════════════════════════════════════════

export interface LLMMessage {
    role: 'user' | 'assistant' | 'system';
    content: string;
}

export interface LLMResponse {
    content: string;
    usage?: {
        prompt_tokens: number;
        completion_tokens: number;
        total_tokens: number;
    };
}

// ═══════════════════════════════════════════════════════════════════════════
// 🎯 COMMANDS & EVENTS
// ═══════════════════════════════════════════════════════════════════════════

export interface BotCommand {
    name: string;
    description: string;
    category: 'admin' | 'utility' | 'moderation' | 'fun';
    cooldown?: number;
    permissions?: bigint[];
    execute: (message: Message, args: string[]) => Promise<void>;
}

export interface SlashCommand {
    name: string;
    description: string;
    options?: CommandOption[];
    execute: (interaction: ChatInputCommandInteraction) => Promise<void>;
}

export interface CommandOption {
    name: string;
    description: string;
    type: number;
    required?: boolean;
    choices?: { name: string; value: string }[];
}

export interface BotEvent {
    name: string;
    once?: boolean;
    execute: (...args: unknown[]) => Promise<void>;
}

// ═══════════════════════════════════════════════════════════════════════════
// 🔧 UTILITIES
// ═══════════════════════════════════════════════════════════════════════════

export interface ValidationResult {
    valid: boolean;
    errors: string[];
    warnings: string[];
}

export interface CleanupResult {
    deletedCount: number;
    freedBytes: number;
    errors: string[];
}
