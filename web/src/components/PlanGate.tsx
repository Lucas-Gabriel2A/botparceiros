'use client';

import { useState, useEffect, ReactNode } from 'react';
import { Lock, ArrowUpRight } from 'lucide-react';

type PlanTier = 'free' | 'starter' | 'pro' | 'ultimate';
type Feature = 'automod_ia' | 'analytics' | 'partnerships' | 'whitelabel' | 'sem_marca' | 'server_builder' | 'tickets' | 'custom_commands' | 'private_calls';

const PLAN_HIERARCHY: Record<PlanTier, number> = {
    free: 0,
    starter: 1,
    pro: 2,
    ultimate: 3
};

const FEATURE_PLAN_MAP: Record<Feature, PlanTier> = {
    tickets: 'starter',
    custom_commands: 'starter',
    private_calls: 'starter',
    automod_ia: 'pro',
    sem_marca: 'pro',
    server_builder: 'pro',
    analytics: 'ultimate',
    partnerships: 'ultimate',
    whitelabel: 'ultimate',
};

const PLAN_NAMES: Record<PlanTier, string> = {
    free: 'Free',
    starter: 'Starter',
    pro: 'Pro',
    ultimate: 'Ultimate'
};

const PLAN_COLORS: Record<PlanTier, string> = {
    free: 'zinc',
    starter: 'blue',
    pro: 'purple',
    ultimate: 'amber'
};

export function usePlan() {
    const [plan, setPlan] = useState<PlanTier>('free');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch('/api/user/subscription')
            .then(r => r.json())
            .then(data => {
                if (data.subscription?.status === 'authorized') {
                    setPlan(data.subscription.plan || 'free');
                }
            })
            .catch(() => { })
            .finally(() => setLoading(false));
    }, []);

    const canUse = (feature: Feature) => {
        const required = FEATURE_PLAN_MAP[feature];
        return PLAN_HIERARCHY[plan] >= PLAN_HIERARCHY[required];
    };

    const getRequiredPlan = (feature: Feature) => FEATURE_PLAN_MAP[feature];

    return { plan, loading, canUse, getRequiredPlan };
}

/**
 * Bloqueia o conteúdo se o plano do usuário não atender o requisito.
 * Mostra um overlay com mensagem de upgrade.
 */
export function PlanGate({
    feature,
    children,
    plan,
    className = ''
}: {
    feature: Feature;
    children: ReactNode;
    plan: PlanTier;
    className?: string;
}) {
    const required = FEATURE_PLAN_MAP[feature];
    const hasAccess = PLAN_HIERARCHY[plan] >= PLAN_HIERARCHY[required];

    if (hasAccess) return <>{children}</>;

    return (
        <div className={`relative ${className}`}>
            {/* Blurred Content */}
            <div className="pointer-events-none select-none filter blur-[2px] opacity-50">
                {children}
            </div>

            {/* Lock Overlay */}
            <div className="absolute inset-0 flex items-center justify-center z-10">
                <div className="bg-[#0A0A0C]/90 border border-white/10 rounded-2xl p-8 text-center max-w-sm mx-4 backdrop-blur-xl shadow-2xl">
                    <div className="w-14 h-14 bg-amber-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Lock className="w-7 h-7 text-amber-400" />
                    </div>
                    <h3 className="text-white font-medium text-lg mb-2">
                        Plano {PLAN_NAMES[required]} necessário
                    </h3>
                    <p className="text-zinc-400 text-sm mb-5">
                        Esta funcionalidade requer o plano <strong className="text-white">{PLAN_NAMES[required]}</strong> ou superior.
                        Seu plano atual: <strong className="text-zinc-300">{PLAN_NAMES[plan]}</strong>.
                    </p>
                    <a
                        href="/dashboard/billing"
                        className="inline-flex items-center gap-2 px-6 py-3 bg-linear-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black font-medium rounded-xl transition-all text-sm"
                    >
                        Fazer Upgrade
                        <ArrowUpRight className="w-4 h-4" />
                    </a>
                </div>
            </div>
        </div>
    );
}

/**
 * Badge de plano para usar em toggles/labels.
 */
export function PlanBadge({ plan }: { plan: PlanTier }) {
    const colors: Record<PlanTier, string> = {
        free: 'bg-zinc-500/20 text-zinc-300',
        starter: 'bg-blue-500/20 text-blue-300',
        pro: 'bg-purple-500/20 text-purple-300',
        ultimate: 'bg-amber-500/20 text-amber-300'
    };

    return (
        <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold tracking-wider ${colors[plan]}`}>
            {PLAN_NAMES[plan]}
        </span>
    );
}
