import { Collection } from 'discord.js';

interface RateLimitConfig {
    limit: number;      // Number of actions
    window: number;     // Time window in ms
}

const rateLimits = new Collection<string, Collection<string, number[]>>();

/**
 * Checks if a user is rate limited for a specific command/context
 * @param userId The Discord User ID
 * @param contextKey A unique key for the command or action scope (e.g., 'cmd:ban')
 * @param config Rate limit configuration (default: 5 actions in 10s)
 * @returns { isRateLimited: boolean, timeRemaining: number }
 */
export function checkRateLimit(
    userId: string,
    contextKey: string,
    config: RateLimitConfig = { limit: 5, window: 10000 }
): { isRateLimited: boolean; timeRemaining: number } {
    if (!rateLimits.has(contextKey)) {
        rateLimits.set(contextKey, new Collection());
    }

    const contextLimits = rateLimits.get(contextKey)!;
    const now = Date.now();
    const timestamps = contextLimits.get(userId) || [];

    // Filter out timestamps that are outside the window
    const validTimestamps = timestamps.filter(t => now - t < config.window);

    if (validTimestamps.length >= config.limit) {
        const oldestTimestamp = validTimestamps[0];
        const timeRemaining = config.window - (now - oldestTimestamp);
        return { isRateLimited: true, timeRemaining };
    }

    // Add current timestamp
    validTimestamps.push(now);
    contextLimits.set(userId, validTimestamps);

    // Cleanup: Remove empty users occasionally could be added here, 
    // but Map handles memory reasonably well for active sessions.

    return { isRateLimited: false, timeRemaining: 0 };
}
