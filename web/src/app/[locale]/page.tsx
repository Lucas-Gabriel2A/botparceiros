"use client";

import Image from "next/image";
// Usar Link do Next por enquanto pois não configurei navigation.ts
import Link from "next/link";
import { ArrowRight, Globe, Check, Bot, Shield, Zap, Server } from "lucide-react";
import { useState, useEffect } from "react";
import { signIn } from "next-auth/react";
import { motion } from "framer-motion";
import { useTranslations, useLocale } from 'next-intl';
import { useRouter, usePathname } from 'next/navigation';

export default function Home() {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  const toggleLanguage = () => {
    const newLocale = locale === 'pt' ? 'en' : 'pt';
    // Remove o locale atual do path e adiciona o novo (gambiarra simples)
    // Se o path for /pt/dashboard -> /en/dashboard
    const newPath = pathname.replace(`/${locale}`, `/${newLocale}`);
    router.push(newPath);
  };

  // Helper para features (arrays não são suportados diretamente pelo t() simples)
  // Mas podemos usar t.raw() se configurado, ou chaves fixas.
  // Vou usar chaves fixas 0, 1, 2 para o array de features por simplicidade.
  const starterFeatures = [
    t('pricing.starter.features.0'),
    t('pricing.starter.features.1'), 
    t('pricing.starter.features.2')
  ];
  
  const premiumFeatures = [
    t('pricing.premium.features.0'),
    t('pricing.premium.features.1'),
    t('pricing.premium.features.2'),
    t('pricing.premium.features.3')
  ];

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
                        onClick={() => signIn('discord', { callbackUrl: '/dashboard' })} 
                        className="group w-full sm:w-64 h-14 bg-white hover:bg-zinc-200 text-black font-semibold flex items-center justify-between px-6 transition-all rounded-sm"
                    >
                        {t('hero.cta')}
                        <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                    </button>
                </div>
                
                
            </div>

             {/* Visual Abstract side */}
             <div className="hidden lg:flex justify-center relative h-[500px]">
                 <div className="relative w-full h-full border border-white/5 bg-white/[0.02] rounded-2xl overflow-hidden backdrop-blur-sm">
                    {/* Simulated Dashboard UI */}
                    <div className="absolute top-0 left-0 right-0 h-10 border-b border-white/5 bg-white/5 flex items-center px-4 gap-2">
                        <div className="w-3 h-3 rounded-full bg-red-500/20"></div>
                        <div className="w-3 h-3 rounded-full bg-yellow-500/20"></div>
                        <div className="w-3 h-3 rounded-full bg-green-500/20"></div>
                    </div>
                    <div className="p-8 mt-10 space-y-4">
                        <div className="h-8 w-1/3 bg-white/10 rounded animate-pulse"></div>
                        <div className="h-32 w-full bg-white/5 rounded border border-white/5"></div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="h-24 bg-primary/10 rounded border border-primary/20"></div>
                            <div className="h-24 bg-white/5 rounded"></div>
                        </div>
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
                        {t('features.title')} <br/>
                        <span className="text-zinc-600">{t('features.subtitle')}</span>
                    </h2>
                    <p className="text-zinc-500 max-w-xl text-lg">{t('features.desc')}</p>
                </div>

                <div className="grid md:grid-cols-3 gap-6 auto-rows-[300px]">
                    
                    {/* Card 1: AI Builder (Large) */}
                    <div className="md:col-span-2 row-span-1 bg-[#0A0A0C] border border-white/10 rounded-3xl p-10 relative overflow-hidden group hover:border-white/20 transition-all">
                        <div className="relative z-10 max-w-sm">
                            <div className="w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center mb-6">
                                <Bot className="text-white w-6 h-6" />
                            </div>
                            <h3 className="text-2xl font-medium mb-3">{t('features.items.ai_builder.title')}</h3>
                            <p className="text-zinc-500 leading-relaxed">{t('features.items.ai_builder.desc')}</p>
                        </div>
                        
                        {/* Visual for AI */}
                        <div className="absolute right-0 bottom-0 top-0 w-1/2 bg-gradient-to-l from-purple-900/10 to-transparent">
                           <div className="absolute top-[20%] right-[10%] w-64 h-full bg-[#1A1A1E] rounded-t-xl border-l border-t border-white/10 p-6 opacity-80 group-hover:translate-y-[-10px] transition-transform duration-500">
                                <div className="space-y-3">
                                    <div className="flex gap-2"><div className="w-2 h-2 rounded-full bg-red-500/50"></div><div className="w-2 h-2 rounded-full bg-yellow-500/50"></div></div>
                                    <div className="h-2 w-20 bg-white/10 rounded"></div>
                                    <div className="h-2 w-32 bg-white/5 rounded"></div>
                                    <div className="h-16 w-full bg-white/5 rounded mt-4 border border-dashed border-white/10 flex items-center justify-center text-[10px] text-zinc-700 font-mono">
                                        Generating Server...
                                    </div>
                                </div>
                           </div>
                        </div>
                    </div>

                    {/* Card 2: AutoMod (Tall) */}
                    <div className="md:col-span-1 row-span-1 bg-[#0A0A0C] border border-white/10 rounded-3xl p-8 relative overflow-hidden group hover:border-white/20 transition-all">
                        <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center mb-6">
                            <Shield className="text-white w-5 h-5" />
                        </div>
                        <h3 className="text-xl font-medium mb-2">{t('features.items.automod.title')}</h3>
                        <p className="text-sm text-zinc-500">{t('features.items.automod.desc')}</p>

                        <div className="absolute bottom-6 right-6 opacity-20 group-hover:opacity-40 transition-opacity">
                            <Shield className="w-32 h-32 text-white blur-[2px] rotate-12" />
                        </div>
                    </div>

                    {/* Card 3: Tickets (Normal) */}
                    <div className="md:col-span-1 row-span-1 bg-[#0A0A0C] border border-white/10 rounded-3xl p-8 relative overflow-hidden group hover:border-white/20 transition-all">
                         <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center mb-6">
                            <Zap className="text-white w-5 h-5" />
                        </div>
                        <h3 className="text-xl font-medium mb-2">{t('features.items.tickets.title')}</h3>
                        <p className="text-sm text-zinc-500">{t('features.items.tickets.desc')}</p>
                        
                        {/* Visual Tickets */}
                        <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-black/50 to-transparent">
                             <div className="absolute bottom-4 left-6 right-6 h-12 bg-white/5 border border-white/5 rounded flex items-center px-4 gap-3">
                                 <div className="w-6 h-6 rounded-full bg-indigo-500/20 flex items-center justify-center text-[10px] text-indigo-400">#</div>
                                 <div className="h-2 w-20 bg-white/10 rounded"></div>
                             </div>
                        </div>
                    </div>

                    {/* Card 4: Dashboard (Wide) */}
                    <div className="md:col-span-2 row-span-1 bg-[#0A0A0C] border border-white/10 rounded-3xl p-10 relative overflow-hidden group hover:border-white/20 transition-all flex flex-col justify-between">
                         <div className="relative z-10 max-w-sm">
                            <div className="w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center mb-6">
                                <Server className="text-white w-6 h-6" />
                            </div>
                            <h3 className="text-2xl font-medium mb-3">{t('features.items.dashboard.title')}</h3>
                            <p className="text-zinc-500 leading-relaxed">{t('features.items.dashboard.desc')}</p>
                        </div>

                         {/* Visual Dashboard */}
                        <div className="absolute top-8 right-8 w-64 h-64 bg-[#141416] border border-white/10 rounded-xl p-4 rotate-3 opacity-80 group-hover:rotate-0 transition-all duration-500 shadow-2xl">
                             <div className="flex justify-between items-center mb-6">
                                 <div className="h-3 w-20 bg-white/10 rounded"></div>
                                 <div className="h-6 w-16 bg-green-500/20 rounded-full flex items-center justify-center text-[10px] text-green-400">Online</div>
                             </div>
                             <div className="space-y-3">
                                 <div className="h-20 w-full bg-white/5 rounded border border-white/5"></div>
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

                <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto items-start">
                    {/* Starter Plan */}
                    <div className="p-8 rounded-3xl border border-white/10 bg-[#0A0A0C] hover:bg-white/[0.02] transition-colors relative group">
                        <div className="mb-8">
                            <h3 className="text-lg font-medium text-zinc-400 mb-4">{t('pricing.starter.name')}</h3>
                            <div className="flex items-baseline gap-1">
                                <span className="text-4xl font-serif text-white">{t('pricing.starter.price')}</span>
                                <span className="text-sm text-zinc-600">{t('pricing.monthly')}</span>
                            </div>
                            <p className="text-sm text-zinc-500 mt-4">{t('pricing.starter.desc')}</p>
                        </div>
                        
                        <div className="h-px w-full bg-white/5 mb-8"></div>

                        <ul className="space-y-4 mb-8">
                            {starterFeatures.map((feat, i) => (
                                <li key={i} className="flex items-center gap-3 text-sm text-zinc-400">
                                    <div className="w-5 h-5 rounded-full bg-white/5 flex items-center justify-center">
                                        <Check className="w-3 h-3 text-zinc-500" /> 
                                    </div>
                                    {feat}
                                </li>
                            ))}
                        </ul>
                        <button 
                            onClick={() => signIn('discord')}
                            className="w-full py-4 rounded-xl border border-white/10 text-white text-sm font-semibold hover:bg-white/5 transition-colors"
                        >
                            {t('nav.login')}
                        </button>
                    </div>

                    {/* Premium Plan */}
                    <div className="p-8 rounded-3xl border border-purple-500/30 bg-[#0A0A0C] relative group overflow-hidden">
                         {/* Glow Effect */}
                         <div className="absolute inset-0 bg-gradient-to-b from-purple-500/10 to-transparent opacity-50 pointer-events-none"></div>
                         
                         <div className="relative z-10">
                            <div className="flex justify-between items-start mb-8">
                                <div>
                                    <h3 className="text-lg font-medium text-purple-400 mb-4 flex items-center gap-2">
                                        {t('pricing.premium.name')}
                                        <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 text-[10px] font-bold uppercase tracking-wider">Popular</span>
                                    </h3>
                                    <div className="flex items-baseline gap-1">
                                        <span className="text-4xl font-serif text-white">{t('pricing.premium.price')}</span>
                                        <span className="text-sm text-zinc-600">{t('pricing.monthly')}</span>
                                    </div>
                                    <p className="text-sm text-zinc-500 mt-4">{t('pricing.premium.desc')}</p>
                                </div>
                            </div>
                            
                            <div className="h-px w-full bg-purple-500/20 mb-8"></div>

                            <ul className="space-y-4 mb-8">
                                {premiumFeatures.map((feat, i) => (
                                    <li key={i} className="flex items-center gap-3 text-sm text-zinc-300">
                                        <div className="w-5 h-5 rounded-full bg-purple-500/20 flex items-center justify-center">
                                            <Check className="w-3 h-3 text-purple-400" />
                                        </div>
                                        {feat}
                                    </li>
                                ))}
                            </ul>
                            <button 
                                onClick={() => signIn('discord')}
                                className="w-full py-4 rounded-xl bg-white text-black text-sm font-bold hover:bg-zinc-200 transition-colors shadow-[0_0_20px_-5px_rgba(255,255,255,0.3)]"
                            >
                                Assinar Agora
                            </button>
                         </div>
                    </div>
                </div>
            </div>
        </section>

        {/* Community/CTA */}
        <section id="community" className="py-32 border-t border-white/5 bg-gradient-to-b from-black to-zinc-900/50">
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
