import { BarChart3 } from 'lucide-react';
import { motion } from 'framer-motion';
import { useReducedMotionSafe } from '@/hooks/useReducedMotionSafe';

export function AnalyticsHeader() {
    const prefersReducedMotion = useReducedMotionSafe();

    return (
        <header className="relative text-center mb-10 w-full flex flex-col items-center">
            {/* Mesh Gradient Background (behind header) */}
            <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-linear-to-b from-teal-500/10 via-violet-500/5 to-transparent rounded-[100%] blur-3xl pointer-events-none" />

            {prefersReducedMotion ? (
                <div className="inline-block px-3 py-1 border border-cyan-500/30 bg-cyan-500/10 rounded text-[10px] tracking-widest uppercase text-cyan-300 mb-6 font-medium relative z-10 shadow-[0_0_15px_rgba(6,182,212,0.3)]">
                    Plano Ultimate
                </div>
            ) : (
                <motion.div 
                    animate={{ boxShadow: ['0 0 10px rgba(6,182,212,0.1)', '0 0 20px rgba(6,182,212,0.4)', '0 0 10px rgba(6,182,212,0.1)'] }}
                    transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                    className="inline-block px-3 py-1 border border-cyan-500/30 bg-cyan-500/10 rounded text-[10px] tracking-widest uppercase text-cyan-300 mb-6 font-medium relative z-10"
                >
                    Plano Ultimate
                </motion.div>
            )}
            
            <h1 className="text-4xl md:text-5xl font-serif font-medium text-transparent bg-clip-text bg-linear-to-r from-slate-100 to-teal-300 mb-4 flex items-center gap-4 relative z-10">
                <div className="hidden md:flex w-14 h-14 bg-white/5 border border-white/10 rounded-2xl items-center justify-center shadow-xl shadow-black/50 transform -rotate-6">
                    <BarChart3 className="w-7 h-7 text-teal-400 drop-shadow-md" />
                </div>
                Analytics
            </h1>
            
            <p className="text-slate-400 text-lg max-w-2xl mx-auto relative z-10">
                Métricas detalhadas do comportamento e engajamento do seu servidor.
            </p>
        </header>
    );
}
