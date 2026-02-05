"use client";

import { useTranslations } from "next-intl";
import { Check, ShieldCheck, Zap } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";

export default function BillingPage() {
    const t = useTranslations("dashboard.billing");
    // Também vamos precisar das traduções da landing page para as features, ou duplicar.
    // Como duplicamos a estrutura em 'dashboard.billing.{plan}', podemos usar de lá.
    // Mas as features em si não foram duplicadas no JSON anterior (apenas name e price).
    // Vou usar as keys do 'pricing' para features para evitar duplicar tudo, já que t() acessa globalmente se não scoped?
    // Não, useTranslations("dashboard.billing") scopeia. 
    // Vou usar um tGlobal para acessar 'pricing'.
    const tPricing = useTranslations("pricing");

    const [loading, setLoading] = useState<string | null>(null);
    const searchParams = useSearchParams();
    const planParam = searchParams.get('plan');
    const autoParam = searchParams.get('auto');
    const intervalParam = searchParams.get('interval');

    const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>(
        (intervalParam === 'yearly') ? 'yearly' : 'monthly'
    );

    const initializedRef = useRef(false);

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
            if (data.url) {
                window.location.href = data.url;
            }
        } catch (error) {
            console.error(error);
        } finally {
            // Se redirecionar, o finally pode rodar ou não, mas ok.
            // Se falhar, reseta.
            setLoading(null);
        }
    };

    return (
        <div>
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

            <div className="grid md:grid-cols-3 gap-6 max-w-7xl">
                {/* Starter Plan */}
                <div className={`relative bg-[#0A0A0C] border rounded-2xl p-6 flex flex-col transition-all ${planParam === 'starter' ? 'border-white/20 ring-2 ring-white/10' : 'border-white/5 opacity-80 hover:opacity-100'}`}>
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
                        {[0, 1, 2, 3].map((i) => (
                            <li key={i} className="flex items-center gap-3 text-zinc-400 text-sm">
                                <Check className="w-4 h-4 text-zinc-600" />
                                <span>{tPricing(`starter.features.${i}`)}</span>
                            </li>
                        ))}
                    </ul>

                    <button
                        onClick={() => handleSubscribe('starter')}
                        disabled={loading !== null}
                        className="w-full py-3 border border-white/10 hover:bg-white/5 text-white font-medium rounded-xl transition-all flex items-center justify-center gap-2 text-sm"
                    >
                        {loading === 'starter' ? (
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                            t("upgrade")
                        )}
                    </button>
                </div>

                {/* Pro Plan */}
                <div className={`relative bg-linear-to-b from-[#1a1c2e] to-[#0A0A0C] border rounded-2xl p-6 flex flex-col shadow-2xl shadow-purple-900/20 transform scale-105 z-10 ${planParam === 'pro' || !planParam ? 'border-purple-500/50 ring-2 ring-purple-500/20' : 'border-purple-500/30'}`}>
                    <div className="absolute top-0 right-0 p-4">
                        <Zap className="w-5 h-5 text-purple-400 fill-purple-400" />
                    </div>
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
                        {[0, 1, 2, 3, 4].map((i) => (
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
                        disabled={loading !== null}
                        className="w-full py-3 bg-white hover:bg-zinc-200 text-black font-bold uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-white/10 flex items-center justify-center gap-2 text-sm"
                    >
                        {loading === 'pro' ? (
                            <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
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
                <div className={`relative bg-[#0A0A0C] border rounded-2xl p-6 flex flex-col transition-all ${planParam === 'ultimate' ? 'border-amber-500/50 ring-2 ring-amber-500/20' : 'border-white/5 hover:border-amber-500/30'}`}>
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
                        disabled={loading !== null}
                        className="w-full py-3 border border-white/10 hover:border-amber-500/50 hover:bg-amber-500/10 hover:text-amber-500 text-white font-medium rounded-xl transition-all flex items-center justify-center gap-2 text-sm"
                    >
                        {loading === 'ultimate' ? (
                            <div className="w-4 h-4 border-2 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                            t("upgrade")
                        )}
                    </button>
                </div>

            </div>
        </div>
    );
}
