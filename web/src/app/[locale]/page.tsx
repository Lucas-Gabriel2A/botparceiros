"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Globe, Check, Bot, Shield, Zap, Server } from "lucide-react";
import { useState, useEffect } from "react";
import { signIn, useSession } from "next-auth/react";
import { motion } from "framer-motion";
import { useTranslations, useLocale } from 'next-intl';
import { useRouter, usePathname } from 'next/navigation';

export default function Home() {
    const t = useTranslations();
    const locale = useLocale();
    const router = useRouter();
    const pathname = usePathname();
    const { data: session } = useSession();
    const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            setMousePosition({ x: e.clientX, y: e.clientY });
        };
        window.addEventListener("mousemove", handleMouseMove);
        return () => window.removeEventListener("mousemove", handleMouseMove);
    }, []);

    const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');

    const toggleLanguage = () => {
        const newLocale = locale === 'pt' ? 'en' : 'pt';
        const newPath = pathname.replace(`/${locale}`, `/${newLocale}`);
        router.push(newPath);
    };

    const handlePlanClick = (plan: string) => {
        if (session) {
            router.push(`/dashboard/billing?plan=${plan}&auto=true&interval=${billingCycle}`);
        } else {
            signIn('discord', { callbackUrl: `/dashboard/billing?plan=${plan}&auto=true&interval=${billingCycle}` });
        }
    };

    const handleStartNow = () => {
        if (session) {
            router.push('/dashboard');
        } else {
            signIn('discord', { callbackUrl: '/dashboard' });
        }
    };


    return (
        <div className="min-h-screen bg-[#060609] text-white font-sans overflow-hidden selection:bg-purple-500/30 selection:text-white">

            {/* Animated Background Particles */}
            <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
                <motion.div
                    animate={{ x: mousePosition.x * 0.02, y: mousePosition.y * 0.02 }}
                    className="absolute top-[-20%] left-[-10%] w-[70%] h-[80%] bg-[radial-gradient(ellipse_at_center,var(--tw-gradient-stops))] from-[#1e2030] via-[#0a0a0c] to-transparent opacity-40 blur-3xl"
                />
                <motion.div
                    animate={{ x: mousePosition.x * -0.02, y: mousePosition.y * -0.02 }}
                    className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[60%] bg-[radial-gradient(ellipse_at_center,var(--tw-gradient-stops))] from-[#13111C] via-[#0a0a0c] to-transparent opacity-30 blur-3xl"
                />

                {/* Stars / Dust */}
                <div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.03] mix-blend-overlay"></div>
            </div>

            <div className="relative z-10">
                {/* Navbar */}
                <nav className="fixed w-full z-50 bg-[#060609]/80 backdrop-blur-md border-b border-white/5 top-0 transition-all duration-300">
                    <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="relative w-8 h-8">
                                <Image src="/CoreBot.png" alt="CoreBot Logo" fill className="object-contain" />
                            </div>
                            <span className="font-semibold tracking-tight text-sm">CoreBot&apos;s</span>
                        </div>

                        <div className="hidden md:flex items-center gap-8 text-xs font-medium text-zinc-400">
                            <Link href="#features" className="hover:text-white transition-colors uppercase tracking-wide">{t('nav.features')}</Link>
                            <Link href="#pricing" className="hover:text-white transition-colors uppercase tracking-wide">{t('nav.pricing')}</Link>
                            <Link href="#community" className="hover:text-white transition-colors uppercase tracking-wide">{t('nav.community')}</Link>
                        </div>

                        <div className="flex items-center gap-4">
                            <button
                                onClick={toggleLanguage}
                                className="flex items-center gap-1 text-xs font-medium text-zinc-400 hover:text-white transition-colors uppercase tracking-wide"
                            >
                                <Globe className="w-3 h-3" />
                                {locale === 'pt' ? 'EN' : 'PT'}
                            </button>

                            <button
                                onClick={() => signIn('discord', { callbackUrl: '/dashboard' })}
                                className="px-5 py-2 bg-white text-black text-xs font-bold uppercase tracking-wider hover:bg-zinc-200 transition-colors rounded-sm"
                            >
                                {t('nav.login')}
                            </button>
                        </div>
                    </div>
                </nav>

                {/* Hero Section */}
                <main className="max-w-7xl mx-auto px-8 pt-48 pb-32">

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8 }}
                        className="grid lg:grid-cols-2 gap-16 items-center"
                    >
                        <div>
                            <div className="inline-block px-3 py-1 border border-zinc-800 bg-zinc-900/50 rounded text-[10px] tracking-widest uppercase text-zinc-400 mb-8 font-medium">
                                {t('hero.badge')}
                            </div>

                            <h1 className="text-5xl md:text-7xl font-serif font-medium leading-[1.1] mb-8 text-white">
                                {t('hero.title')} <br />
                                <span className="text-zinc-500">{t('hero.subtitle')}</span>
                            </h1>

                            <p className="text-lg text-zinc-400 mb-10 max-w-lg leading-relaxed" dangerouslySetInnerHTML={{ __html: t.raw('hero.desc') }}>
                            </p>

                            <div className="flex flex-col sm:flex-row items-center gap-6">
                                <button
                                    onClick={handleStartNow}
                                    className="group w-full sm:w-64 h-14 bg-white hover:bg-zinc-200 text-black font-semibold flex items-center justify-between px-6 transition-all rounded-sm shadow-[0_0_30px_-5px_rgba(255,255,255,0.3)] hover:shadow-[0_0_40px_-5px_rgba(255,255,255,0.5)]"
                                >
                                    {t('hero.cta')}
                                    <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                                </button>
                            </div>


                        </div>

                        {/* Visual Abstract side */}
                        <div className="hidden lg:flex justify-center relative h-[500px]">
                            <div className="relative w-full h-full border border-white/5 bg-[#0e0e11] rounded-2xl overflow-hidden shadow-2xl shadow-indigo-500/10">
                                {/* Terminal Header */}
                                <div className="h-10 border-b border-white/5 bg-white/5 flex items-center px-4 justify-between">
                                    <div className="flex gap-2">
                                        <div className="w-3 h-3 rounded-full bg-red-500/20"></div>
                                        <div className="w-3 h-3 rounded-full bg-yellow-500/20"></div>
                                        <div className="w-3 h-3 rounded-full bg-green-500/20"></div>
                                    </div>
                                    <div className="text-[10px] text-zinc-500 font-mono">corebot_terminal.exe</div>
                                </div>

                                {/* Terminal Body */}
                                <div className="p-6 font-mono text-xs md:text-sm space-y-4">
                                    {/* Command 1 */}
                                    <motion.div
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 1 }}
                                    >
                                        <span className="text-green-400">user@discord:~$</span> <span className="text-white">/construir-servidor</span>
                                    </motion.div>

                                    {/* Input Prompt */}
                                    <motion.div
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        transition={{ delay: 2 }}
                                        className="pl-4 border-l-2 border-white/10"
                                    >
                                        <span className="text-purple-400">prompt:</span> <span className="text-zinc-300">"Comunidade de Gaming Setup com área VIP e cargos por nível"</span>
                                    </motion.div>

                                    {/* Bot Response Processing */}
                                    <motion.div
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        transition={{ delay: 4 }}
                                        className="text-blue-400 mt-4 flex items-center gap-2"
                                    >
                                        <span>🤖 CoreBot AI:</span>
                                        <span className="text-zinc-400">Analisando prompt...</span>
                                    </motion.div>


                                    {/* Bot Response Success */}
                                    <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        transition={{ delay: 6 }}
                                        className="bg-white/5 p-3 rounded border border-white/5 text-zinc-300 mt-2"
                                    >
                                        <p className="text-green-400 font-bold mb-2">✅ Estrutura Gerada com Sucesso!</p>
                                        <ul className="space-y-1 text-zinc-400 pl-4 list-disc">
                                            <li>5 Categorias Criadas (Boas-vindas, Geral, Gaming, VIP, Staff)</li>
                                            <li>12 Canais de Texto & Voz</li>
                                            <li>Cargos configurados: @Membro, @VIP, @Admin</li>
                                        </ul>
                                    </motion.div>

                                    <motion.div
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        transition={{ delay: 9 }}
                                        className="text-zinc-500 mt-4 animate-pulse"
                                    >
                                        _ Aguardando confirmação...
                                    </motion.div>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </main>

                {/* Features Section - Bento Grid Style */}
                <section id="features" className="py-32 border-t border-white/5 relative z-10">
                    <div className="max-w-7xl mx-auto px-8">
                        <div className="mb-20">
                            <h2 className="text-4xl md:text-5xl font-serif mb-6 leading-tight">
                                {t('features.title')} <br />
                                <span className="text-zinc-600">{t('features.subtitle')}</span>
                            </h2>
                            <p className="text-zinc-500 max-w-xl text-lg">{t('features.desc')}</p>
                        </div>

                        <div className="grid md:grid-cols-3 gap-6 auto-rows-[300px]">

                            {/* Card 1: AI Builder (Large) */}
                            <div className="md:col-span-2 row-span-1 bg-[#0A0A0C] border border-purple-500/30 rounded-3xl p-10 relative overflow-hidden group hover:border-purple-500/30 transition-all">
                                <div className="relative z-10 max-w-sm">
                                    <div className="w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform bg-linear-to-br from-purple-500/20 to-blue-500/20">
                                        <Bot className="text-white w-6 h-6" />
                                    </div>
                                    <h3 className="text-2xl font-medium mb-3 group-hover:text-purple-300 transition-colors">{t('features.items.ai_builder.title')}</h3>
                                    <p className="text-zinc-500 leading-relaxed">{t('features.items.ai_builder.desc')}</p>
                                </div>

                                {/* Visual for AI */}
                                <div className="absolute right-0 bottom-0 top-0 w-1/2 bg-linear-to-l from-purple-900/10 to-transparent">
                                    <div className="absolute top-[20%] right-[10%] w-64 h-full bg-[#1A1A1E] rounded-t-xl border-l border-t border-white/10 p-6 opacity-80 group-hover:translate-y-[-20px] transition-transform duration-700 shadow-2xl">
                                        <div className="space-y-3">
                                            <div className="flex gap-2"><div className="w-2 h-2 rounded-full bg-red-500/50"></div><div className="w-2 h-2 rounded-full bg-yellow-500/50"></div></div>
                                            <div className="h-2 w-20 bg-white/10 rounded"></div>
                                            <div className="h-2 w-32 bg-white/5 rounded"></div>
                                            <motion.div
                                                animate={{ opacity: [0.5, 1, 0.5] }}
                                                transition={{ duration: 2, repeat: Infinity }}
                                                className="h-16 w-full bg-purple-500/5 rounded mt-4 border border-dashed border-purple-500/20 flex items-center justify-center text-[10px] text-purple-300 font-mono"
                                            >
                                                Generating Server...
                                            </motion.div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Card 2: AutoMod (Tall) */}
                            <div className="md:col-span-1 row-span-1 bg-[#0A0A0C] border border-red-500/30 rounded-3xl p-8 relative overflow-hidden group hover:border-red-500/30 transition-all">
                                <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center mb-6 group-hover:bg-red-500/10 transition-colors">
                                    <Shield className="text-white w-5 h-5 group-hover:text-red-400" />
                                </div>
                                <h3 className="text-xl font-medium mb-2">{t('features.items.automod.title')}</h3>
                                <p className="text-sm text-zinc-500">{t('features.items.automod.desc')}</p>

                                <div className="absolute bottom-6 right-6 opacity-20 group-hover:opacity-40 transition-opacity">
                                    <Shield className="w-32 h-32 text-white blur-[2px] rotate-12 group-hover:rotate-0 transition-transform duration-500" />
                                </div>
                                {/* Scan Effect */}
                                <motion.div
                                    animate={{ top: ['0%', '100%'] }}
                                    transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                                    className="absolute left-0 right-0 h-[2px] bg-red-500/50 shadow-[0_0_10px_rgba(239,68,68,0.5)] opacity-0 group-hover:opacity-100"
                                />
                            </div>

                            {/* Card 3: Tickets (Normal) */}
                            <div className="md:col-span-1 row-span-1 bg-[#0A0A0C] border border-blue-500/30 rounded-3xl p-8 relative overflow-hidden group hover:border-blue-500/30 transition-all">
                                <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center mb-6 group-hover:bg-blue-500/10 transition-colors">
                                    <Zap className="text-white w-5 h-5 group-hover:text-blue-400" />
                                </div>
                                <h3 className="text-xl font-medium mb-2">{t('features.items.tickets.title')}</h3>
                                <p className="text-sm text-zinc-500">{t('features.items.tickets.desc')}</p>

                                {/* Visual Tickets */}
                                <div className="absolute bottom-0 left-0 right-0 h-24 bg-linear-to-t from-black/50 to-transparent">
                                    <motion.div
                                        whileHover={{ y: -5 }}
                                        className="absolute bottom-4 left-6 right-6 h-12 bg-white/5 border border-white/5 rounded flex items-center px-4 gap-3 backdrop-blur-md"
                                    >
                                        <div className="w-6 h-6 rounded-full bg-indigo-500/20 flex items-center justify-center text-[10px] text-indigo-400">#</div>
                                        <div className="h-2 w-20 bg-white/10 rounded"></div>
                                        <div className="ml-auto w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                                    </motion.div>
                                </div>
                            </div>

                            {/* Card 4: Dashboard (Wide) */}
                            <div className="md:col-span-2 row-span-1 bg-[#0A0A0C] border border-green-500/30 rounded-3xl p-10 relative overflow-hidden group hover:border-green-500/30 transition-all flex flex-col justify-between">
                                <div className="relative z-10 max-w-sm">
                                    <div className="w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center mb-6 group-hover:bg-green-500/10 transition-colors">
                                        <Server className="text-white w-6 h-6 group-hover:text-green-400" />
                                    </div>
                                    <h3 className="text-2xl font-medium mb-3">{t('features.items.dashboard.title')}</h3>
                                    <p className="text-zinc-500 leading-relaxed">{t('features.items.dashboard.desc')}</p>
                                </div>

                                {/* Visual Dashboard */}
                                <div className="absolute top-8 right-8 w-64 h-64 bg-[#141416] border border-white/10 rounded-xl p-4 rotate-3 opacity-60 group-hover:rotate-0 group-hover:opacity-100 transition-all duration-500 shadow-2xl group-hover:shadow-green-900/10 group-hover:scale-105">
                                    <div className="flex justify-between items-center mb-6">
                                        <div className="h-3 w-20 bg-white/10 rounded"></div>
                                        <div className="h-6 w-16 bg-green-500/20 rounded-full flex items-center justify-center text-[10px] text-green-400 font-bold tracking-wider">ONLINE</div>
                                    </div>
                                    <div className="space-y-3">
                                        <div className="flex gap-2 items-end h-20 w-full bg-white/5 rounded border border-white/5 p-2 overflow-hidden">
                                            {[30, 50, 40, 70, 60, 80, 50, 70].map((h, i) => (
                                                <motion.div
                                                    key={i}
                                                    initial={{ height: '10%' }}
                                                    animate={{ height: `${h}%` }}
                                                    transition={{ duration: 1, delay: i * 0.1, repeat: Infinity, repeatType: "reverse" }}
                                                    className="flex-1 bg-green-500/20 rounded-t-sm"
                                                />
                                            ))}
                                        </div>
                                        <div className="h-20 w-full bg-white/5 rounded border border-white/5"></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Pricing Section - Premium Glass Style */}
                <section id="pricing" className="py-32 border-t border-white/5 relative z-10">
                    <div className="max-w-7xl mx-auto px-8">
                        <div className="text-center mb-20">
                            <h2 className="text-4xl md:text-5xl font-serif mb-6">{t('pricing.title')}</h2>
                            <p className="text-zinc-500">{t('pricing.subtitle')}</p>
                        </div>

                        <div className="flex flex-col items-center mb-12">
                            <div className="flex items-center gap-1 p-1 bg-white/5 rounded-full border border-white/5 relative">
                                <button
                                    onClick={() => setBillingCycle('monthly')}
                                    className={`relative z-10 px-6 py-2 rounded-full text-sm font-medium transition-all duration-300 ${billingCycle === 'monthly' ? 'text-black' : 'text-zinc-400 hover:text-white'}`}
                                >
                                    {t('pricing.monthly')}
                                </button>
                                <button
                                    onClick={() => setBillingCycle('yearly')}
                                    className={`relative z-10 px-6 py-2 rounded-full text-sm font-medium transition-all duration-300 ${billingCycle === 'yearly' ? 'text-black' : 'text-zinc-400 hover:text-white'}`}
                                >
                                    {t('pricing.yearly')}
                                </button>
                                <div
                                    className={`absolute top-1 bottom-1 w-[calc(50%-4px)] bg-white rounded-full transition-all duration-300 shadow-lg ${billingCycle === 'yearly' ? 'translate-x-[calc(100%+4px)]' : 'translate-x-0'}`}
                                ></div>
                            </div>
                            <span className="mt-4 text-[10px] text-green-400 font-bold bg-green-500/10 px-3 py-1 rounded-full border border-green-500/20">{t('pricing.save_text')}</span>
                        </div>

                        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto items-start">

                            {/* Free Plan */}
                            <div className="p-8 rounded-3xl border border-white/10 bg-[#0A0A0C] hover:bg-white/2 transition-colors relative group">
                                <div className="mb-8">
                                    <h3 className="text-lg font-medium text-emerald-400 mb-4">{t('pricing.free.name')}</h3>
                                    <div className="flex items-baseline gap-1">
                                        <span className="text-4xl font-serif text-white">{t('pricing.free.price')}</span>
                                        <span className="text-sm text-zinc-600">/sempre</span>
                                    </div>
                                    <p className="text-sm text-zinc-500 mt-4">{t('pricing.free.desc')}</p>
                                </div>

                                <div className="h-px w-full bg-white/5 mb-8"></div>

                                <ul className="space-y-4 mb-8">
                                    {[0, 1, 2, 3, 4].map((i) => (
                                        <li key={i} className="flex items-center gap-3 text-sm text-zinc-400">
                                            <div className="w-5 h-5 rounded-full bg-emerald-500/10 flex items-center justify-center">
                                                <Check className="w-3 h-3 text-emerald-500" />
                                            </div>
                                            {t(`pricing.free.features.${i}`)}
                                        </li>
                                    ))}
                                </ul>
                                <button
                                    onClick={handleStartNow}
                                    className="w-full py-4 rounded-xl border border-emerald-500/30 text-emerald-400 text-sm font-semibold hover:bg-emerald-500/10 transition-colors"
                                >
                                    Começar Grátis
                                </button>
                            </div>

                            {/* Starter Plan */}
                            <div className="p-8 rounded-3xl border border-white/10 bg-[#0A0A0C] hover:bg-white/2 transition-colors relative group">
                                <div className="mb-8">
                                    <h3 className="text-lg font-medium text-zinc-400 mb-4">{t('pricing.starter.name')}</h3>
                                    <div className="flex items-baseline gap-1">
                                        <span className="text-4xl font-serif text-white">{billingCycle === 'monthly' ? t('pricing.starter.price') : t('pricing.starter.price_yearly_total')}</span>
                                        <span className="text-sm text-zinc-600">{billingCycle === 'monthly' ? t('pricing.monthly') : t('pricing.yearly')}</span>
                                    </div>
                                    {billingCycle === 'yearly' && (
                                        <p className="text-[10px] text-zinc-500 mt-1">{t('pricing.billed_yearly', { price: t('pricing.starter.price_yearly') })}</p>
                                    )}
                                    <p className="text-sm text-zinc-500 mt-4">{t('pricing.starter.desc')}</p>
                                </div>

                                <div className="h-px w-full bg-white/5 mb-8"></div>

                                <ul className="space-y-4 mb-8">
                                    {[0, 1, 2, 3].map((i) => (
                                        <li key={i} className="flex items-center gap-3 text-sm text-zinc-400">
                                            <div className="w-5 h-5 rounded-full bg-white/5 flex items-center justify-center">
                                                <Check className="w-3 h-3 text-zinc-500" />
                                            </div>
                                            {t(`pricing.starter.features.${i}`)}
                                        </li>
                                    ))}
                                </ul>
                                <button
                                    onClick={() => handlePlanClick('starter')}
                                    className="w-full py-4 rounded-xl border border-white/10 text-white text-sm font-semibold hover:bg-white/5 transition-colors"
                                >
                                    Assinar Starter
                                </button>
                            </div>

                            {/* Pro Plan (Popular) */}
                            <div className="p-8 rounded-3xl border border-purple-500/30 bg-[#0A0A0C] relative group overflow-hidden transform lg:-translate-y-4">
                                {/* Glow Effect */}
                                <div className="absolute inset-0 bg-linear-to-b from-purple-500/10 to-transparent opacity-50 pointer-events-none"></div>

                                <div className="relative z-10">
                                    <div className="flex justify-between items-start mb-8">
                                        <div>
                                            <h3 className="text-lg font-medium text-purple-400 mb-4 flex items-center gap-2">
                                                {t('pricing.pro.name')}
                                                <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 text-[10px] font-bold uppercase tracking-wider">Popular</span>
                                            </h3>
                                            <div className="flex items-baseline gap-1">
                                                <span className="text-4xl font-serif text-white">{billingCycle === 'monthly' ? t('pricing.pro.price') : t('pricing.pro.price_yearly_total')}</span>
                                                <span className="text-sm text-zinc-600">{billingCycle === 'monthly' ? t('pricing.monthly') : t('pricing.yearly')}</span>
                                            </div>
                                            {billingCycle === 'yearly' && (
                                                <p className="text-[10px] text-zinc-400 mt-1">{t('pricing.billed_yearly', { price: t('pricing.pro.price_yearly') })}</p>
                                            )}
                                            <p className="text-sm text-zinc-500 mt-4">{t('pricing.pro.desc')}</p>
                                        </div>
                                    </div>

                                    <div className="h-px w-full bg-purple-500/20 mb-8"></div>

                                    <ul className="space-y-4 mb-8">
                                        {[0, 1, 2, 3, 4].map((i) => (
                                            <li key={i} className="flex items-center gap-3 text-sm text-zinc-300">
                                                <div className="w-5 h-5 rounded-full bg-purple-500/20 flex items-center justify-center">
                                                    <Check className="w-3 h-3 text-purple-400" />
                                                </div>
                                                {t(`pricing.pro.features.${i}`)}
                                            </li>
                                        ))}
                                    </ul>
                                    <button
                                        onClick={() => handlePlanClick('pro')}
                                        className="w-full py-4 rounded-xl bg-white text-black text-sm font-bold hover:bg-zinc-200 transition-colors shadow-[0_0_20px_-5px_rgba(255,255,255,0.3)]"
                                    >
                                        Assinar Pro
                                    </button>
                                </div>
                            </div>

                            {/* Ultimate Plan */}
                            <div className="p-8 rounded-3xl border border-white/10 bg-[#0A0A0C] hover:border-amber-500/30 transition-colors relative group">
                                <div className="mb-8">
                                    <h3 className="text-lg font-medium text-amber-500 mb-4">{t('pricing.ultimate.name')}</h3>
                                    <div className="flex items-baseline gap-1">
                                        <span className="text-4xl font-serif text-white">{billingCycle === 'monthly' ? t('pricing.ultimate.price') : t('pricing.ultimate.price_yearly_total')}</span>
                                        <span className="text-sm text-zinc-600">{billingCycle === 'monthly' ? t('pricing.monthly') : t('pricing.yearly')}</span>
                                    </div>
                                    {billingCycle === 'yearly' && (
                                        <p className="text-[10px] text-zinc-500 mt-1">{t('pricing.billed_yearly', { price: t('pricing.ultimate.price_yearly') })}</p>
                                    )}
                                    <p className="text-sm text-zinc-500 mt-4">{t('pricing.ultimate.desc')}</p>
                                </div>

                                <div className="h-px w-full bg-white/5 mb-8"></div>

                                <ul className="space-y-4 mb-8">
                                    {[0, 1, 2, 3, 4].map((i) => (
                                        <li key={i} className="flex items-center gap-3 text-sm text-zinc-400">
                                            <div className="w-5 h-5 rounded-full bg-white/5 flex items-center justify-center">
                                                <Check className="w-3 h-3 text-zinc-500 group-hover:text-amber-500 transition-colors" />
                                            </div>
                                            {t(`pricing.ultimate.features.${i}`)}
                                        </li>
                                    ))}
                                </ul>
                                <button
                                    onClick={() => handlePlanClick('ultimate')}
                                    className="w-full py-4 rounded-xl border border-white/10 text-white text-sm font-semibold hover:bg-amber-500/10 hover:text-amber-500 hover:border-amber-500/50 transition-all"
                                >
                                    Assinar Ultimate
                                </button>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Community/CTA */}
                <section id="community" className="py-32 border-t border-white/5 bg-linear-to-b from-black to-zinc-900/50">
                    <div className="max-w-4xl mx-auto px-8 text-center">
                        <h2 className="text-4xl md:text-5xl font-serif mb-8">{t('community.title')}</h2>
                        <p className="text-zinc-400 text-lg mb-10 whitespace-pre-line">
                            {t('community.desc')}
                        </p>
                        <div className="flex justify-center gap-4">
                            <Link
                                href="https://discord.gg/QJGEmqqz"
                                target="_blank"
                                className="px-8 py-4 bg-[#5865F2] hover:bg-[#4752C4] text-white font-bold uppercase tracking-wider flex items-center gap-2 transition-colors rounded-sm"
                            >
                                {t('community.cta')}
                                <ArrowRight className="w-4 h-4" />
                            </Link>
                        </div>
                    </div>
                </section>

                <footer className="py-12 border-t border-white/5 bg-black text-center text-zinc-600 text-xs uppercase tracking-widest">
                    <p>&copy; 2026 CoreBot&apos;s AI. All rights served.</p>
                </footer>
            </div>
        </div>
    );
}
