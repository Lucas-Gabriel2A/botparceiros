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

                {/* Features Section - Modern Pro Style */}
                <section id="features" className="py-32 border-t border-white/5 relative z-10 overflow-hidden">
                    {/* Subtle ambient glows */}
                    <div className="absolute top-10 left-[20%] w-[600px] h-[300px] bg-purple-500/10 blur-[150px] rounded-full pointer-events-none"></div>
                    
                    <div className="max-w-7xl mx-auto px-8">
                        <motion.div 
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.8 }}
                            className="mb-20 text-left"
                        >
                            <h2 className="text-5xl md:text-6xl font-serif text-white font-medium tracking-tight mb-6 leading-tight">
                                {t('features.title')}<br />
                                <span className="bg-clip-text text-transparent bg-linear-to-r from-zinc-400 to-zinc-600">{t('features.subtitle')}</span>
                            </h2>
                            <p className="text-lg text-zinc-400 max-w-xl">
                                {t('features.desc')}
                            </p>
                        </motion.div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 auto-rows-[340px]">

                            {/* Card 1: AI Builder (Large) */}
                            <motion.div 
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.5, delay: 0.1 }}
                                className="md:col-span-2 row-span-1 bg-[#0A0A0C] border border-white/5 hover:border-purple-500/30 transition-all duration-500 rounded-[20px] p-8 relative overflow-hidden group shadow-lg hover:shadow-purple-500/10 flex flex-col justify-between"
                            >
                                <div className="absolute inset-0 bg-linear-to-br from-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
                                
                                <div className="relative z-10 max-w-[300px] pt-2">
                                    <div className="w-12 h-12 bg-white/5 border border-white/10 rounded-[12px] flex items-center justify-center mb-6 group-hover:scale-110 group-hover:bg-purple-500/20 group-hover:border-purple-500/40 transition-all duration-500">
                                        <Bot className="text-zinc-300 group-hover:text-purple-400 w-6 h-6 transition-colors" />
                                    </div>
                                    <h3 className="text-xl font-semibold text-white mb-3 group-hover:text-purple-50 transition-colors">{t('features.items.ai_builder.title')}</h3>
                                    <p className="text-[15px] text-zinc-400 leading-relaxed">{t('features.items.ai_builder.desc')}</p>
                                </div>

                                <div className="absolute right-[32px] top-[32px] bottom-[32px] w-1/2 flex items-center justify-end">
                                    <div className="w-full max-w-[340px] h-[180px] bg-[#050505] border border-white/10 rounded-[12px] flex items-center justify-center shadow-2xl relative translate-x-4 group-hover:translate-x-0 transition-transform duration-700 ease-out overflow-hidden">
                                        <div className="absolute inset-0 bg-linear-to-tr from-white/5 to-transparent opacity-50"></div>
                                        
                                        <div className="absolute top-0 left-0 right-0 h-10 flex items-center px-4 gap-2 border-b border-white/5 bg-white/[0.02]">
                                            <div className="w-2.5 h-2.5 rounded-full bg-red-500/80"></div>
                                            <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/80"></div>
                                            <div className="w-2.5 h-2.5 rounded-full bg-green-500/80"></div>
                                        </div>
                                        
                                        <motion.span 
                                            animate={{ opacity: [1, 0.5, 1] }}
                                            transition={{ duration: 2, repeat: Infinity }}
                                            className="font-mono text-[13px] text-purple-400 mt-6 drop-shadow-[0_0_8px_rgba(168,85,247,0.4)]"
                                        >
                                            Generating server...<span className="animate-pulse">_</span>
                                        </motion.span>
                                    </div>
                                </div>
                            </motion.div>

                            {/* Card 2: AutoMod (Tall) */}
                            <motion.div 
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.5, delay: 0.2 }}
                                className="md:col-span-1 row-span-1 bg-[#0A0A0C] border border-white/5 hover:border-red-500/30 transition-all duration-500 rounded-[20px] p-8 relative overflow-hidden group shadow-lg hover:shadow-red-500/10"
                            >
                                <div className="absolute inset-0 bg-linear-to-br from-red-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>

                                <div className="relative z-10 w-full pt-2">
                                    <div className="w-12 h-12 bg-white/5 border border-white/10 rounded-[12px] flex items-center justify-center mb-6 group-hover:bg-red-500/20 group-hover:border-red-500/40 transition-all duration-500">
                                        <Shield className="text-zinc-300 group-hover:text-red-400 w-6 h-6 transition-colors" />
                                    </div>
                                    <h3 className="text-xl font-semibold text-white mb-3">{t('features.items.automod.title')}</h3>
                                    <p className="text-[15px] text-zinc-400 leading-relaxed">{t('features.items.automod.desc')}</p>
                                </div>

                                <div className="absolute bottom-[-10%] right-[-10%] opacity-20 group-hover:opacity-60 transition-all duration-700 pointer-events-none">
                                    <Shield className="w-56 h-56 text-red-500 blur-lg group-hover:blur-xl transition-all duration-700" strokeWidth={0.5} style={{ fill: 'none' }} />
                                    <Shield className="w-56 h-56 text-red-400 absolute inset-0" strokeWidth={1} style={{ fill: 'none' }} />
                                </div>
                                
                                {/* Scan line animation on hover */}
                                <motion.div 
                                    className="absolute left-0 right-0 h-[1px] bg-linear-to-r from-transparent via-red-500/80 to-transparent opacity-0 group-hover:opacity-100 drop-shadow-[0_0_5px_rgba(239,68,68,0.8)]"
                                    animate={{ top: ["10%", "90%", "10%"] }}
                                    transition={{ duration: 3, ease: "linear", repeat: Infinity }}
                                />
                            </motion.div>

                            {/* Card 3: Tickets (Normal) */}
                            <motion.div 
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.5, delay: 0.3 }}
                                className="md:col-span-1 row-span-1 bg-[#0A0A0C] border border-white/5 hover:border-blue-500/30 transition-all duration-500 rounded-[20px] p-8 relative overflow-hidden group shadow-lg hover:shadow-blue-500/10 flex flex-col justify-between"
                            >
                                <div className="absolute inset-0 bg-linear-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>

                                <div className="relative z-10 w-full pt-2">
                                    <div className="w-12 h-12 bg-white/5 border border-white/10 rounded-[12px] flex items-center justify-center mb-6 group-hover:bg-blue-500/20 group-hover:border-blue-500/40 transition-all duration-500">
                                        <Zap className="text-zinc-300 group-hover:text-blue-400 w-6 h-6 transition-colors" />
                                    </div>
                                    <h3 className="text-xl font-semibold text-white mb-3">{t('features.items.tickets.title')}</h3>
                                    <p className="text-[15px] text-zinc-400 leading-relaxed">{t('features.items.tickets.desc')}</p>
                                </div>
                                
                                <div className="absolute bottom-8 left-8 right-8">
                                    <motion.div 
                                        whileHover={{ y: -6 }}
                                        className="bg-[#141416] border border-white/10 rounded-[14px] p-3 flex  items-center gap-4 shadow-2xl backdrop-blur-md relative"
                                    >
                                       <div className="w-8 h-8 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-sm font-bold text-blue-400">#</div>
                                       <div className="flex-1 h-2 rounded-full bg-zinc-800"></div>
                                       <motion.div 
                                           animate={{ scale: [1, 1.3, 1] }} 
                                           transition={{ duration: 2, repeat: Infinity }}
                                           className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.6)]"
                                       ></motion.div>
                                    </motion.div>
                                </div>
                            </motion.div>

                            {/* Card 4: Dashboard (Wide) */}
                            <motion.div 
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.5, delay: 0.4 }}
                                className="md:col-span-2 row-span-1 bg-[#0A0A0C] border border-white/5 hover:border-emerald-500/30 transition-all duration-500 rounded-[20px] p-8 relative overflow-hidden group shadow-lg hover:shadow-emerald-500/10"
                            >
                                <div className="absolute inset-0 bg-linear-to-br from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>

                                <div className="relative z-10 max-w-[300px] pt-2">
                                    <div className="w-12 h-12 bg-white/5 border border-white/10 rounded-[12px] flex items-center justify-center mb-6 group-hover:bg-emerald-500/20 group-hover:border-emerald-500/40 transition-all duration-500">
                                        <Server className="text-zinc-300 group-hover:text-emerald-400 w-6 h-6 transition-colors" />
                                    </div>
                                    <h3 className="text-xl font-semibold text-white mb-3">{t('features.items.dashboard.title')}</h3>
                                    <p className="text-[15px] text-zinc-400 leading-relaxed">{t('features.items.dashboard.desc')}</p>
                                </div>
                                
                                <div className="absolute right-[32px] top-[32px] bottom-[32px] w-1/2 flex items-center justify-end">
                                     <div className="w-full max-w-[340px] h-full bg-[#050505] border border-white/10 rounded-[12px] p-5 flex flex-col justify-between shadow-2xl relative translate-y-4 group-hover:translate-y-0 transition-transform duration-700 ease-out">
                                         <div className="absolute inset-0 bg-linear-to-b from-white/5 to-transparent opacity-20 pointer-events-none rounded-xl"></div>
                                         
                                         <div className="flex justify-between items-center relative z-10">
                                            <div className="h-2 w-16 bg-zinc-800 rounded-full"></div>
                                            <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] uppercase font-bold px-2 py-1 rounded-[6px] flex items-center gap-1.5">
                                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                                                ONLINE
                                            </div>
                                         </div>
                                         <div className="h-[75px] bg-[#111] rounded-lg border border-white/5 p-3 flex items-end justify-between gap-1.5 relative z-10">
                                            {[40, 70, 50, 90, 60, 30, 80, 45, 60, 100].map((h, i) => (
                                                <motion.div 
                                                    key={i} 
                                                    initial={{ height: '30%' }}
                                                    whileInView={{ height: `${h}%` }}
                                                    transition={{ duration: 1, delay: i * 0.1, type: "spring" }}
                                                    className="w-full bg-emerald-500/30 group-hover:bg-emerald-400/80 rounded-t-sm transition-colors duration-500" 
                                                ></motion.div>
                                            ))}
                                         </div>
                                         <div className="h-8 bg-[#111] border border-white/5 rounded-lg relative z-10 flex items-center px-4">
                                            <div className="w-1/2 h-1.5 bg-zinc-800 rounded-full"></div>
                                         </div>
                                     </div>
                                </div>
                            </motion.div>
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
                                   Comece Agora
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
