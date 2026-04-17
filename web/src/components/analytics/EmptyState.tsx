import { Sparkles, Bot } from 'lucide-react';
import { motion } from 'framer-motion';
import { useReducedMotionSafe } from '@/hooks/useReducedMotionSafe';

export function AnalyticsEmptyState() {
    const prefersReducedMotion = useReducedMotionSafe();

    return (
        <motion.div 
            initial={{ opacity: 0, scale: prefersReducedMotion ? 1 : 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 20 }}
            className="w-full flex justify-center py-12"
        >
            <div className="bg-[#0A0A0C] border border-white/5 rounded-3xl p-10 flex flex-col items-center text-center max-w-lg shadow-[0_0_40px_-15px_rgba(20,184,166,0.1)] relative overflow-hidden group">
                <div className="absolute inset-0 bg-linear-to-b from-teal-500/5 to-transparent opacity-50 pointer-events-none" />
                
                <div className="w-20 h-20 bg-white/5 rounded-2xl flex items-center justify-center bg-linear-to-br from-teal-500/20 to-blue-500/20 mb-6 group-hover:scale-105 transition-transform duration-500">
                    <Bot className="w-10 h-10 text-teal-400" />
                </div>
                
                <h3 className="text-2xl font-serif font-medium text-white mb-3 flex items-center gap-2">
                    Nenhum Dado Encontrado <Sparkles className="w-5 h-5 text-teal-400" />
                </h3>
                
                <p className="text-zinc-400 text-sm leading-relaxed mb-8">
                    Seu servidor ainda não gerou métricas para o período selecionado. 
                    Convide o bot, comece a interagir com os comandos ou aguarde 
                    novos membros entrarem para ver este painel ganhar vida!
                </p>

                <div className="inline-block px-4 py-2 border border-teal-500/30 bg-teal-500/10 rounded-xl text-xs font-medium text-teal-300">
                    Dica: Envie uma mensagem no canal da IA para testar.
                </div>
            </div>
        </motion.div>
    );
}
