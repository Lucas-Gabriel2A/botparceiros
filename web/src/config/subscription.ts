export const SUBSCRIPTION_PLANS = {
    starter: {
        id: 'starter',
        name: 'Starter',
        price: 19.90,
        price_yearly: 15.90, // Monthly equivalent
        title: 'Starter'
    },
    pro: {
        id: 'pro',
        name: 'Pro',
        price: 29.90,
        price_yearly: 23.90, // Monthly equivalent
        title: 'Pro'
    },
    ultimate: {
        id: 'ultimate',
        name: 'Ultimate',
        price: 49.90,
        price_yearly: 39.90, // Monthly equivalent
        title: 'Ultimate'
    }
} as const;

export const BILLING_CYCLES = {
    MONTHLY: 'monthly',
    YEARLY: 'yearly'
} as const;

export type PlanId = keyof typeof SUBSCRIPTION_PLANS;
export type BillingCycle = typeof BILLING_CYCLES[keyof typeof BILLING_CYCLES];

export const ANNUAL_DISCOUNT_MULTIPLIER = 0.8;
