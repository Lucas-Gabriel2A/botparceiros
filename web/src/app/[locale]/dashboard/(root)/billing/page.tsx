"use client";

import { useTranslations } from "next-intl";
import { Check, ShieldCheck, Zap, CreditCard, Calendar, Clock, ArrowUpRight, MessageSquare, Server, Sparkles, Lock, Unlock, TrendingUp } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { SUBSCRIPTION_PLANS } from "@/config/subscription";

interface SubscriptionData {
    id: string;
    plan: 'starter' | 'pro' | 'ultimate';
    status: 'pending' | 'authorized' | 'paused' | 'cancelled';
    nextPayment: string | null;
    createdAt: string;
    updatedAt: string;
}

interface UsageData {
    plan: string;
    aiMessages: { current: number; limit: number; period: string };
    serverBuilds: { current: number; limit: number; period: string };
    features: {
        welcome_custom: boolean;
        private_calls: boolean;
        whitelabel: boolean;
        transcription: boolean;
        automod_level: string;
        ticket_categories: number;
    };
}

export default function BillingPage() {
    const t = useTranslations("dashboard.billing");
    const tPricing = useTranslations("pricing");

    const [loading, setLoading] = useState<string | null>(null);
    const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
    const [subLoading, setSubLoading] = useState(true);
    const [usage, setUsage] = useState<UsageData | null>(null);
    const [usageLoading, setUsageLoading] = useState(true);
    const searchParams = useSearchParams();
    const planParam = searchParams.get('plan');
    const autoParam = searchParams.get('auto');
    const intervalParam = searchParams.get('interval');

    const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>(
        (intervalParam === 'yearly') ? 'yearly' : 'monthly'
    );

    const initializedRef = useRef(false);

    // Buscar assinatura ativa
    useEffect(() => {
        fetch("/api/user/subscription")
            .then((res) => res.json())
            .then((data) => {
                if (data.subscription) {
                    setSubscription(data.subscription);
                }
            })
            .catch(() => { })
            .finally(() => setSubLoading(false));
    }, []);

    // Buscar uso do plano
    useEffect(() => {
        fetch("/api/user/usage")
            .then((res) => res.json())
            .then((data) => {
                if (!data.error) {
                    setUsage(data);
                }
            })
            .catch(() => { })
            .finally(() => setUsageLoading(false));
    }, []);

    useEffect(() => {
        if (autoParam === 'true' && planParam && !initializedRef.current) {
            initializedRef.current = true;
            handleSubscribe(planParam);
        }
    }, [autoParam, planParam]);

    const handleSubscribe = async (plan: string) => {
        setLoading(plan);
        try {
            const res = await fetch("/api/checkout/subscription", {
                method: "POST",
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ plan, interval: billingCycle })
            });
            const data = await res.json();
            
            if (res.status === 401) {
                signIn('discord', { callbackUrl: window.location.href });
                return;
            }

            if (data.url) {
                window.location.href = data.url;
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(null);
        }
    };

    const getStatusInfo = (status: string) => {
        switch (status) {
            case 'authorized': return { label: 'Ativo', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' };
            case 'pending': return { label: 'Pendente', color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' };
            case 'paused': return { label: 'Pausado', color: 'text-blue-400 bg-blue-500/10 border-blue-500/20' };
            case 'cancelled': return { label: 'Cancelado', color: 'text-red-400 bg-red-500/10 border-red-500/20' };
            default: return { label: status, color: 'text-zinc-400 bg-zinc-800 border-white/5' };
        }
    };

    const getPlanColor = (plan: string) => {
        switch (plan) {
            case 'starter': return 'border-white/10';
            case 'pro': return 'border-purple-500/50';
            case 'ultimate': return 'border-amber-500/50';
            default: return 'border-white/10';
        }
    };

    return (
        <div className="h-full overflow-y-auto p-8 md:p-12">
            <div className="max-w-7xl mx-auto">

                {/* ═══════════════════════════════════════════ */}
                {/* 📋 PAGE HEADER                              */}
                {/* ═══════════════════════════════════════════ */}
                <header className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div>
                        <h1 className="text-3xl font-serif font-medium mb-2">{t("title")}</h1>
                        <p className="text-zinc-500">{t("subtitle")}</p>
                    </div>

                    {/* Toggle */}
                    <div className="flex items-center gap-1 p-1 bg-white/5 rounded-full border border-white/5 relative">
                        <button
                            onClick={() => setBillingCycle('monthly')}
                            className={`relative z-10 px-6 py-2 rounded-full text-sm font-medium transition-all duration-300 ${billingCycle === 'monthly' ? 'text-black' : 'text-zinc-400 hover:text-white'}`}
                        >
                            {tPricing('monthly')}
                        </button>
                        <button
                            onClick={() => setBillingCycle('yearly')}
                            className={`relative z-10 px-6 py-2 rounded-full text-sm font-medium transition-all duration-300 ${billingCycle === 'yearly' ? 'text-black' : 'text-zinc-400 hover:text-white'}`}
                        >
                            {tPricing('yearly')}
                        </button>
                        <div
                            className={`absolute top-1 bottom-1 w-[calc(50%-4px)] bg-white rounded-full transition-all duration-300 shadow-lg ${billingCycle === 'yearly' ? 'translate-x-[calc(100%+4px)]' : 'translate-x-0'}`}
                        ></div>
                    </div>
                </header>


                {/* ═══════════════════════════════════════════ */}
                {/* 📋 ACTIVE SUBSCRIPTION CARD                */}
                {/* ═══════════════════════════════════════════ */}
                {!subLoading && subscription && (
                    <div className={`mb-12 p-6 rounded-2xl bg-[#0A0A0C] border-2 ${getPlanColor(subscription.plan)} relative overflow-hidden`}>
                        <div className="absolute inset-0 bg-linear-to-r from-purple-500/5 via-transparent to-transparent pointer-events-none" />

                        <div className="relative z-10">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                                <div>
                                    <div className="flex items-center gap-3 mb-2">
                                        <h2 className="text-xl font-bold text-white">Sua Assinatura</h2>
                                        <span className={`px-3 py-1 rounded-full text-xs font-bold border ${getStatusInfo(subscription.status).color}`}>
                                            {getStatusInfo(subscription.status).label}
                                        </span>
                                    </div>
                                    <p className="text-zinc-500 text-sm">Gerencie seu plano e informações de cobrança</p>
                                </div>

                                <div className="flex items-center gap-2">
                                    <span className={`text-2xl font-serif font-bold ${subscription.plan === 'pro' ? 'text-purple-400' : subscription.plan === 'ultimate' ? 'text-amber-400' : 'text-white'}`}>
                                        {SUBSCRIPTION_PLANS[subscription.plan]?.name || subscription.plan}
                                    </span>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
                                <div className="bg-zinc-900/50 p-4 rounded-xl border border-white/5 flex items-center gap-3">
                                    <CreditCard className="w-5 h-5 text-zinc-500" />
                                    <div>
                                        <p className="text-xs text-zinc-500 uppercase tracking-wider">Plano</p>
                                        <p className="text-white font-medium">
                                            R$ {SUBSCRIPTION_PLANS[subscription.plan]?.price.toFixed(2) || '—'}/mês
                                        </p>
                                    </div>
                                </div>

                                <div className="bg-zinc-900/50 p-4 rounded-xl border border-white/5 flex items-center gap-3">
                                    <Calendar className="w-5 h-5 text-zinc-500" />
                                    <div>
                                        <p className="text-xs text-zinc-500 uppercase tracking-wider">Próxima Cobrança</p>
                                        <p className="text-white font-medium">
                                            {subscription.nextPayment
                                                ? new Date(subscription.nextPayment).toLocaleDateString('pt-BR')
                                                : '—'}
                                        </p>
                                    </div>
                                </div>

                                <div className="bg-zinc-900/50 p-4 rounded-xl border border-white/5 flex items-center gap-3">
                                    <Clock className="w-5 h-5 text-zinc-500" />
                                    <div>
                                        <p className="text-xs text-zinc-500 uppercase tracking-wider">Membro Desde</p>
                                        <p className="text-white font-medium">
                                            {new Date(subscription.createdAt).toLocaleDateString('pt-BR')}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* ═══════════════════════════════════════════ */}
                {/* 📊 PLAN USAGE DASHBOARD                     */}
                {/* ═══════════════════════════════════════════ */}
                {!usageLoading && usage && (() => {
                    const currentPlan = usage.plan;
                    const planColorMap: Record<string, string> = {
                        free: 'emerald', starter: 'blue', pro: 'purple', ultimate: 'amber'
                    };
                    const accent = planColorMap[currentPlan] || 'zinc';

                    const getPercentage = (current: number, limit: number) => {
                        if (limit === -1) return 5; // "Unlimited" = tiny bar
                        if (limit === 0) return 100;
                        return Math.min((current / limit) * 100, 100);
                    };

                    const getBarColor = (pct: number, unlimited: boolean) => {
                        if (unlimited) return 'bg-gradient-to-r from-purple-500 to-cyan-400';
                        if (pct >= 90) return 'bg-gradient-to-r from-red-500 to-orange-500';
                        if (pct >= 60) return 'bg-gradient-to-r from-amber-500 to-yellow-400';
                        return `bg-gradient-to-r from-${accent}-500 to-${accent}-400`;
                    };

                    const aiPct = getPercentage(usage.aiMessages.current, usage.aiMessages.limit);
                    const sgPct = getPercentage(usage.serverBuilds.current, usage.serverBuilds.limit);
                    const aiUnlimited = usage.aiMessages.limit === -1;
                    const sgUnlimited = usage.serverBuilds.limit === -1;

                    const nextPlan: Record<string, string> = { free: 'Starter', starter: 'Pro', pro: 'Ultimate' };
                    const showUpgrade = currentPlan !== 'ultimate';
                    const upgradePlanKey: Record<string, string> = { free: 'starter', starter: 'pro', pro: 'ultimate' };

                    const featureList = [
                        { label: 'Boas-vindas Personalizadas', enabled: usage.features.welcome_custom, icon: Sparkles },
                        { label: 'Calls Privadas', enabled: usage.features.private_calls, icon: MessageSquare },
                        { label: 'Transcrição de Áudio', enabled: usage.features.transcription, icon: MessageSquare },
                        { label: 'Whitelabel (Bot Próprio)', enabled: usage.features.whitelabel, icon: Zap },
                    ];

                    return (
                        <div className="mb-12 p-6 rounded-2xl bg-[#0A0A0C] border border-white/10 relative overflow-hidden">
                            <div className={`absolute inset-0 bg-gradient-to-br from-${accent}-500/5 via-transparent to-transparent pointer-events-none`} />

                            <div className="relative z-10">
                                {/* Header */}
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2 rounded-xl bg-${accent}-500/10 border border-${accent}-500/20`}>
                                            <TrendingUp className={`w-5 h-5 text-${accent}-400`} />
                                        </div>
                                        <div>
                                            <h2 className="text-lg font-bold text-white">Uso do Plano</h2>
                                            <p className="text-xs text-zinc-500">Acompanhe seus limites e recursos disponíveis</p>
                                        </div>
                                    </div>
                                    <span className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider bg-${accent}-500/10 text-${accent}-400 border border-${accent}-500/20`}>
                                        {currentPlan}
                                    </span>
                                </div>

                                {/* Usage Bars */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                                    {/* AI Messages */}
                                    <div className="bg-zinc-900/60 p-4 rounded-xl border border-white/5">
                                        <div className="flex items-center justify-between mb-3">
                                            <div className="flex items-center gap-2">
                                                <MessageSquare className="w-4 h-4 text-cyan-400" />
                                                <span className="text-sm font-medium text-white">Mensagens IA</span>
                                            </div>
                                            <span className="text-xs text-zinc-500">
                                                {aiUnlimited
                                                    ? '∞ / dia'
                                                    : `${usage.aiMessages.current} / ${usage.aiMessages.limit} por dia`
                                                }
                                            </span>
                                        </div>
                                        <div className="w-full h-2.5 bg-zinc-800 rounded-full overflow-hidden">
                                            <div
                                                className={`h-full rounded-full transition-all duration-1000 ease-out ${aiUnlimited ? 'bg-gradient-to-r from-purple-500 to-cyan-400' : aiPct >= 90 ? 'bg-gradient-to-r from-red-500 to-orange-500' : aiPct >= 60 ? 'bg-gradient-to-r from-amber-500 to-yellow-400' : 'bg-gradient-to-r from-emerald-500 to-emerald-400'}`}
                                                style={{ width: `${aiUnlimited ? 100 : aiPct}%` }}
                                            />
                                        </div>
                                        {aiUnlimited && (
                                            <p className="text-[10px] text-purple-400 mt-1.5">✨ Ilimitado no seu plano</p>
                                        )}
                                        {!aiUnlimited && aiPct >= 80 && (
                                            <p className="text-[10px] text-amber-400 mt-1.5">⚠️ Quase no limite diário</p>
                                        )}
                                    </div>

                                    {/* Server Builds */}
                                    <div className="bg-zinc-900/60 p-4 rounded-xl border border-white/5">
                                        <div className="flex items-center justify-between mb-3">
                                            <div className="flex items-center gap-2">
                                                <Server className="w-4 h-4 text-blue-400" />
                                                <span className="text-sm font-medium text-white">Gerações de Servidor</span>
                                            </div>
                                            <span className="text-xs text-zinc-500">
                                                {sgUnlimited
                                                    ? '∞ / mês'
                                                    : `${usage.serverBuilds.current} / ${usage.serverBuilds.limit} por mês`
                                                }
                                            </span>
                                        </div>
                                        <div className="w-full h-2.5 bg-zinc-800 rounded-full overflow-hidden">
                                            <div
                                                className={`h-full rounded-full transition-all duration-1000 ease-out ${sgUnlimited ? 'bg-gradient-to-r from-purple-500 to-cyan-400' : sgPct >= 90 ? 'bg-gradient-to-r from-red-500 to-orange-500' : sgPct >= 60 ? 'bg-gradient-to-r from-amber-500 to-yellow-400' : 'bg-gradient-to-r from-blue-500 to-blue-400'}`}
                                                style={{ width: `${sgUnlimited ? 100 : sgPct}%` }}
                                            />
                                        </div>
                                        {sgUnlimited && (
                                            <p className="text-[10px] text-purple-400 mt-1.5">✨ Ilimitado no seu plano</p>
                                        )}
                                        {!sgUnlimited && sgPct >= 80 && (
                                            <p className="text-[10px] text-amber-400 mt-1.5">⚠️ Quase no limite mensal</p>
                                        )}
                                    </div>
                                </div>

                                {/* Feature Access */}
                                <div className="bg-zinc-900/40 p-4 rounded-xl border border-white/5 mb-4">
                                    <h3 className="text-xs uppercase tracking-wider text-zinc-500 mb-3 font-medium">Recursos do Plano</h3>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                        {featureList.map((f) => (
                                            <div key={f.label} className={`flex items-center gap-2 p-2 rounded-lg ${f.enabled ? 'bg-emerald-500/5 border border-emerald-500/10' : 'bg-zinc-900/50 border border-white/5 opacity-50'}`}>
                                                {f.enabled
                                                    ? <Unlock className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                                                    : <Lock className="w-3.5 h-3.5 text-zinc-600 shrink-0" />
                                                }
                                                <span className={`text-xs ${f.enabled ? 'text-white' : 'text-zinc-500'}`}>{f.label}</span>
                                            </div>
                                        ))}
                                    </div>
                                    {/* AutoMod + Tickets inline */}
                                    <div className="mt-3 flex flex-wrap gap-3">
                                        <span className="text-xs text-zinc-500">
                                            AutoMod: <span className={`font-medium ${usage.features.automod_level === 'ai' ? 'text-purple-400' : usage.features.automod_level === 'advanced' ? 'text-blue-400' : 'text-zinc-400'}`}>
                                                {usage.features.automod_level === 'ai' ? 'IA Avançado' : usage.features.automod_level === 'advanced' ? 'Avançado' : 'Básico'}
                                            </span>
                                        </span>
                                        <span className="text-xs text-zinc-500">
                                            Categorias de Ticket: <span className="font-medium text-white">
                                                {usage.features.ticket_categories === -1 ? 'Ilimitadas' : usage.features.ticket_categories}
                                            </span>
                                        </span>
                                    </div>
                                </div>

                                {/* Upgrade CTA */}
                                {showUpgrade && (
                                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-xl bg-gradient-to-r from-purple-500/10 via-blue-500/5 to-transparent border border-purple-500/20">
                                        <div className="flex items-center gap-3">
                                            <Zap className="w-5 h-5 text-purple-400" />
                                            <div>
                                                <p className="text-sm font-medium text-white">Quer mais limites e recursos?</p>
                                                <p className="text-xs text-zinc-400">Faça upgrade para o <span className="text-purple-400 font-bold">{nextPlan[currentPlan]}</span> e desbloqueie mais poder.</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => handleSubscribe(upgradePlanKey[currentPlan])}
                                            disabled={loading !== null}
                                            className="px-6 py-2.5 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white text-sm font-bold rounded-xl transition-all shadow-lg shadow-purple-500/20 flex items-center gap-2 shrink-0"
                                        >
                                            {loading ? (
                                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                            ) : (
                                                <>
                                                    <ArrowUpRight className="w-4 h-4" />
                                                    Fazer Upgrade
                                                </>
                                            )}
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })()}

                {/* ═══════════════════════════════════════════ */}
                {/* 💰 PRICING CARDS                           */}
                {/* ═══════════════════════════════════════════ */}

                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {/* Free Plan */}
                    <div className={`relative bg-[#0A0A0C] border rounded-2xl p-6 flex flex-col transition-all ${!subscription ? 'border-emerald-500/50 ring-2 ring-emerald-500/20' : 'border-white/5 opacity-80 hover:opacity-100'}`}>
                        {!subscription && (
                            <div className="absolute -top-3 left-6 px-3 py-1 bg-emerald-500 text-black text-[10px] font-bold uppercase tracking-wider rounded-full">
                                Seu Plano
                            </div>
                        )}
                        <div className="mb-6">
                            <span className="text-sm font-bold uppercase tracking-widest text-emerald-400">{t("free.name")}</span>
                            <h2 className="text-3xl font-serif text-white mt-2">Grátis<span className="text-sm text-zinc-600 font-sans ml-1">/sempre</span></h2>
                        </div>

                        <ul className="space-y-3 mb-8 flex-1">
                            {[0, 1, 2, 3, 4].map((i) => (
                                <li key={i} className="flex items-center gap-3 text-zinc-400 text-sm">
                                    <Check className="w-4 h-4 text-emerald-500" />
                                    <span>{tPricing(`free.features.${i}`)}</span>
                                </li>
                            ))}
                        </ul>

                        <button
                            disabled
                            className={`w-full py-3 border font-medium rounded-xl text-sm ${!subscription ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 cursor-default' : 'border-white/10 text-zinc-500 cursor-default'}`}
                        >
                            {!subscription ? 'Plano Atual' : 'Free'}
                        </button>
                    </div>

                    {/* Starter Plan */}
                    <div className={`relative bg-[#0A0A0C] border rounded-2xl p-6 flex flex-col transition-all ${subscription?.plan === 'starter' ? 'border-emerald-500/50 ring-2 ring-emerald-500/20' : planParam === 'starter' ? 'border-white/20 ring-2 ring-white/10' : 'border-white/5 opacity-80 hover:opacity-100'}`}>
                        {subscription?.plan === 'starter' && (
                            <div className="absolute -top-3 left-6 px-3 py-1 bg-emerald-500 text-black text-[10px] font-bold uppercase tracking-wider rounded-full">
                                Seu Plano
                            </div>
                        )}
                        <div className="mb-6">
                            <span className="text-sm font-bold uppercase tracking-widest text-zinc-500">{t("starter.name")}</span>
                            <h2 className="text-3xl font-serif text-white mt-2">{billingCycle === 'monthly' ? t("starter.price") : tPricing("starter.price_yearly_total")}<span className="text-sm text-zinc-600 font-sans ml-1">{billingCycle === 'monthly' ? tPricing("monthly") : tPricing("yearly")}</span></h2>
                            {billingCycle === 'yearly' && (
                                <div className="flex flex-col mt-1">
                                    <span className="text-[10px] text-zinc-500">{tPricing('billed_yearly', { price: tPricing('starter.price_yearly') })}</span>
                                    <span className="text-[10px] text-green-400">{tPricing('save_text')}</span>
                                </div>
                            )}
                        </div>

                        <ul className="space-y-3 mb-8 flex-1">
                            {[0, 1, 2, 3, 4, 5].map((i) => (
                                <li key={i} className="flex items-center gap-3 text-zinc-400 text-sm">
                                    <Check className="w-4 h-4 text-zinc-600" />
                                    <span>{tPricing(`starter.features.${i}`)}</span>
                                </li>
                            ))}
                        </ul>

                        <button
                            onClick={() => handleSubscribe('starter')}
                            disabled={loading !== null || subscription?.plan === 'starter'}
                            className={`w-full py-3 border border-white/10 font-medium rounded-xl transition-all flex items-center justify-center gap-2 text-sm ${subscription?.plan === 'starter' ? 'bg-emerald-500/10 text-emerald-400 cursor-default' : 'hover:bg-white/5 text-white'}`}
                        >
                            {loading === 'starter' ? (
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            ) : subscription?.plan === 'starter' ? (
                                'Plano Atual'
                            ) : (
                                t("upgrade")
                            )}
                        </button>
                    </div>

                    {/* Pro Plan */}
                    <div className={`relative bg-linear-to-b from-[#1a1c2e] to-[#0A0A0C] border rounded-2xl p-6 flex flex-col shadow-2xl shadow-purple-900/20 transform scale-105 z-10 ${subscription?.plan === 'pro' ? 'border-emerald-500/50 ring-2 ring-emerald-500/20' : planParam === 'pro' || !planParam ? 'border-purple-500/50 ring-2 ring-purple-500/20' : 'border-purple-500/30'}`}>
                        {subscription?.plan === 'pro' ? (
                            <div className="absolute -top-3 left-6 px-3 py-1 bg-emerald-500 text-black text-[10px] font-bold uppercase tracking-wider rounded-full">
                                Seu Plano
                            </div>
                        ) : (
                            <div className="absolute top-0 right-0 p-4">
                                <Zap className="w-5 h-5 text-purple-400 fill-purple-400" />
                            </div>
                        )}
                        <div className="mb-6">
                            <span className="text-sm font-bold uppercase tracking-widest text-purple-400">{t("pro.name")}</span>
                            <h2 className="text-3xl font-serif text-white mt-2">{billingCycle === 'monthly' ? t("pro.price") : tPricing("pro.price_yearly_total")}<span className="text-sm text-zinc-500 font-sans ml-1">{billingCycle === 'monthly' ? tPricing("monthly") : tPricing("yearly")}</span></h2>
                            {billingCycle === 'yearly' && (
                                <div className="flex flex-col mt-1">
                                    <span className="text-[10px] text-zinc-400">{tPricing('billed_yearly', { price: tPricing('pro.price_yearly') })}</span>
                                    <span className="text-[10px] text-green-400">{tPricing('save_text')}</span>
                                </div>
                            )}
                        </div>

                        <ul className="space-y-3 mb-8 flex-1">
                            {[0, 1, 2, 3, 4, 5].map((i) => (
                                <li key={i} className="flex items-center gap-3 text-zinc-300 text-sm">
                                    <div className="w-4 h-4 rounded-full bg-purple-500/20 flex items-center justify-center">
                                        <Check className="w-3 h-3 text-purple-400" />
                                    </div>
                                    <span>{tPricing(`pro.features.${i}`)}</span>
                                </li>
                            ))}
                        </ul>

                        <button
                            onClick={() => handleSubscribe('pro')}
                            disabled={loading !== null || subscription?.plan === 'pro'}
                            className={`w-full py-3 font-bold uppercase tracking-wider rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 text-sm ${subscription?.plan === 'pro' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 cursor-default' : 'bg-white hover:bg-zinc-200 text-black shadow-white/10'}`}
                        >
                            {loading === 'pro' ? (
                                <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                            ) : subscription?.plan === 'pro' ? (
                                'Plano Atual'
                            ) : (
                                t("upgrade")
                            )}
                        </button>
                        <div className="mt-4 flex items-center justify-center gap-2 text-[10px] text-zinc-500">
                            <ShieldCheck className="w-3 h-3" />
                            {t("secure_payment")}
                        </div>
                    </div>

                    {/* Ultimate Plan */}
                    <div className={`relative bg-[#0A0A0C] border rounded-2xl p-6 flex flex-col transition-all ${subscription?.plan === 'ultimate' ? 'border-emerald-500/50 ring-2 ring-emerald-500/20' : planParam === 'ultimate' ? 'border-amber-500/50 ring-2 ring-amber-500/20' : 'border-white/5 hover:border-amber-500/30'}`}>
                        {subscription?.plan === 'ultimate' && (
                            <div className="absolute -top-3 left-6 px-3 py-1 bg-emerald-500 text-black text-[10px] font-bold uppercase tracking-wider rounded-full">
                                Seu Plano
                            </div>
                        )}
                        <div className="mb-6">
                            <span className="text-sm font-bold uppercase tracking-widest text-amber-500">{t("ultimate.name")}</span>
                            <h2 className="text-3xl font-serif text-white mt-2">{billingCycle === 'monthly' ? t("ultimate.price") : tPricing("ultimate.price_yearly_total")}<span className="text-sm text-zinc-600 font-sans ml-1">{billingCycle === 'monthly' ? tPricing("monthly") : tPricing("yearly")}</span></h2>
                            {billingCycle === 'yearly' && (
                                <div className="flex flex-col mt-1">
                                    <span className="text-[10px] text-zinc-500">{tPricing('billed_yearly', { price: tPricing('ultimate.price_yearly') })}</span>
                                    <span className="text-[10px] text-green-400">{tPricing('save_text')}</span>
                                </div>
                            )}
                        </div>

                        <ul className="space-y-3 mb-8 flex-1">
                            {[0, 1, 2, 3, 4].map((i) => (
                                <li key={i} className="flex items-center gap-3 text-zinc-400 text-sm">
                                    <div className="w-4 h-4 rounded-full bg-white/5 flex items-center justify-center">
                                        <Check className="w-3 h-3 text-zinc-500" />
                                    </div>
                                    <span>{tPricing(`ultimate.features.${i}`)}</span>
                                </li>
                            ))}
                        </ul>

                        <button
                            onClick={() => handleSubscribe('ultimate')}
                            disabled={loading !== null || subscription?.plan === 'ultimate'}
                            className={`w-full py-3 border font-medium rounded-xl transition-all flex items-center justify-center gap-2 text-sm ${subscription?.plan === 'ultimate' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 cursor-default' : 'border-white/10 hover:border-amber-500/50 hover:bg-amber-500/10 hover:text-amber-500 text-white'}`}
                        >
                            {loading === 'ultimate' ? (
                                <div className="w-4 h-4 border-2 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
                            ) : subscription?.plan === 'ultimate' ? (
                                'Plano Atual'
                            ) : (
                                t("upgrade")
                            )}
                        </button>
                    </div>

                </div>
            </div>
        </div>
    );
}
