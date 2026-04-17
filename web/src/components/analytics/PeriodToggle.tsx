import { Calendar } from 'lucide-react';
import { motion } from 'framer-motion';
import { useReducedMotionSafe } from '@/hooks/useReducedMotionSafe';
import clsx from 'clsx';

interface PeriodToggleProps {
    period: number;
    setPeriod: (p: number) => void;
}

export function PeriodToggle({ period, setPeriod }: PeriodToggleProps) {
    const prefersReducedMotion = useReducedMotionSafe();
    const periods = [7, 14, 30, 90];

    return (
        <div className="flex justify-center w-full mb-8 z-20 relative">
            <div className="flex gap-2 p-1.5 bg-black/40 backdrop-blur-md rounded-2xl border border-white/5 shadow-inner">
                {periods.map(p => {
                    const isActive = period === p;
                    
                    return (
                        <button
                            key={p}
                            onClick={() => setPeriod(p)}
                            className={clsx(
                                "relative px-5 py-2.5 rounded-xl text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/50",
                                isActive ? "text-white" : "text-zinc-500 hover:text-zinc-300"
                            )}
                        >
                            {isActive && !prefersReducedMotion && (
                                <motion.div
                                    layoutId="period-indicator"
                                    className="absolute inset-0 bg-white/10 border border-white/10 rounded-xl pointer-events-none"
                                    transition={{ type: "spring", stiffness: 300, damping: 25 }}
                                />
                            )}
                            
                            {/* Fallback for reduced motion */}
                            {isActive && prefersReducedMotion && (
                                <div className="absolute inset-0 bg-white/10 border border-white/10 rounded-xl pointer-events-none" />
                            )}

                            <span className="relative z-10 flex items-center gap-2">
                                <Calendar className="w-4 h-4" />
                                {p}d
                            </span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
