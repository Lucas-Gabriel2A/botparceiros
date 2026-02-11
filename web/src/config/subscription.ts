export const SUBSCRIPTION_PLANS = {
    free: {
        id: 'free',
        name: 'Free',
        price: 0,
        price_yearly: 0,
        title: 'Free'
    },
    starter: {
        id: 'starter',
        name: 'Starter',
        price: 19.90,
        price_yearly: 15.90,
        title: 'Starter'
    },
    pro: {
        id: 'pro',
        name: 'Pro',
        price: 29.90,
        price_yearly: 23.90,
        title: 'Pro'
    },
    ultimate: {
        id: 'ultimate',
        name: 'Ultimate',
        price: 49.90,
        price_yearly: 39.90,
        title: 'Ultimate'
    }
} as const;

export const PLAN_LIMITS = {
    free: {
        ai_messages_per_user_per_day: 5,
        server_builds_total: 1,
        automod_level: 'basic',         // palavras proibidas apenas
        ticket_categories: 1,
        welcome_custom: false,           // mensagem padrão somente
        private_calls: false,
        max_modules: 2,                  // até 2 módulos configuráveis
        whitelabel: false,
        support: 'community',
        transcription: false,
    },
    starter: {
        ai_messages_per_user_per_day: 15,
        server_builds_total: 5,         // 5 por mês
        automod_level: 'advanced',       // links + caps + spam
        ticket_categories: 3,
        welcome_custom: true,
        private_calls: false,
        max_modules: -1,                 // ilimitado
        whitelabel: false,
        support: 'community',
        transcription: false,
    },
    pro: {
        ai_messages_per_user_per_day: -1, // ilimitado
        server_builds_total: -1,
        automod_level: 'ai',             // IA avançado
        ticket_categories: -1,
        welcome_custom: true,
        private_calls: true,
        max_modules: -1,
        whitelabel: false,
        support: 'priority',
        transcription: true,
    },
    ultimate: {
        ai_messages_per_user_per_day: -1,
        server_builds_total: -1,
        automod_level: 'ai',
        ticket_categories: -1,
        welcome_custom: true,
        private_calls: true,
        max_modules: -1,
        whitelabel: true,
        support: 'dedicated',
        transcription: true,
    }
} as const;

export const BILLING_CYCLES = {
    MONTHLY: 'monthly',
    YEARLY: 'yearly'
} as const;

export type PlanId = keyof typeof SUBSCRIPTION_PLANS;
export type BillingCycle = typeof BILLING_CYCLES[keyof typeof BILLING_CYCLES];

export const ANNUAL_DISCOUNT_MULTIPLIER = 0.8;
