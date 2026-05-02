interface RateLimitConfig {
    limit: number;
    window: number;
}
/**
 * Checks if a user is rate limited for a specific command/context
 * @param userId The Discord User ID
 * @param contextKey A unique key for the command or action scope (e.g., 'cmd:ban')
 * @param config Rate limit configuration (default: 5 actions in 10s)
 * @returns { isRateLimited: boolean, timeRemaining: number }
 */
export declare function checkRateLimit(userId: string, contextKey: string, config?: RateLimitConfig): {
    isRateLimited: boolean;
    timeRemaining: number;
};
export {};
//# sourceMappingURL=rate-limit.d.ts.map