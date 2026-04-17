import { useEffect, useState } from 'react';
import { motion, useMotionValue, useTransform, useSpring, animate } from 'framer-motion';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';
import { useReducedMotionSafe } from '@/hooks/useReducedMotionSafe';
import { MetricThemeDef } from './metric-theme';

export interface KpiCardProps {
    label: string;
    value: number;
    delta?: number;
    icon: React.ElementType;
    theme: MetricThemeDef;
    series: number[];
    delayIndex: number;
}

export function KpiCard({ label, value, delta = 0, icon: Icon, theme, series, delayIndex }: KpiCardProps) {
    const prefersReducedMotion = useReducedMotionSafe();
    
    // Animate Number Count Up
    const [displayValue, setDisplayValue] = useState("0");
    
    useEffect(() => {
        const controls = animate(0, value, {
            duration: prefersReducedMotion ? 0 : 0.8,
            ease: "easeOut",
            onUpdate(val) {
                setDisplayValue(Math.round(val).toLocaleString('pt-BR'));
            }
        });
        return () => controls.stop();
    }, [value, prefersReducedMotion]);

    // 3D Tilt Effect
    const mouseX = useMotionValue(0.5);
    const mouseY = useMotionValue(0.5);
    const springConfig = { damping: 25, stiffness: 300 };
    const springX = useSpring(mouseX, springConfig);
    const springY = useSpring(mouseY, springConfig);

    const rotateX = useTransform(springY, [0, 1], [4, -4]);
    const rotateY = useTransform(springX, [0, 1], [-4, 4]);

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        if (prefersReducedMotion) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const ax = (e.clientX - rect.left) / rect.width;
        const ay = (e.clientY - rect.top) / rect.height;
        mouseX.set(ax);
        mouseY.set(ay);
    };

    const handleMouseLeave = () => {
        if (prefersReducedMotion) return;
        mouseX.set(0.5);
        mouseY.set(0.5);
    };

    // Sparkline Data mapping
    const chartData = series.map((val, i) => ({ val, i }));
    const isPositiveDelta = delta >= 0;

    return (
        <motion.div
            initial={{ opacity: 0, y: prefersReducedMotion ? 0 : 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: prefersReducedMotion ? 0 : delayIndex * 0.06, type: "spring", bounce: 0, duration: 0.8 }}
            style={{ 
                rotateX: prefersReducedMotion ? 0 : rotateX, 
                rotateY: prefersReducedMotion ? 0 : rotateY,
                transformPerspective: 1000
            }}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            className={`group relative flex flex-col justify-between bg-white/[0.02] backdrop-blur overflow-hidden rounded-2xl border transition-colors duration-500 ${theme.borderColor} h-[130px] p-5 cursor-default hover:bg-white/[0.04] focus-visible:ring-2 focus-visible:outline-none`}
        >
            {/* Background Hover Glow */}
            <div className={`absolute inset-0 bg-linear-to-br ${theme.bgGradient} opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none`} />

            {/* Header */}
            <div className="flex items-center justify-between relative z-10 w-full mb-2">
                <div className="flex items-center gap-2">
                    <Icon className={`w-4 h-4 ${theme.textGlow}`} />
                    <span className="text-[10px] font-medium uppercase tracking-wider text-zinc-400 group-hover:text-zinc-300 transition-colors">
                        {label}
                    </span>
                </div>
                
                {delta !== 0 && (
                    <div className={`flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded ${isPositiveDelta ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                        {isPositiveDelta ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                        {Math.abs(delta)}%
                    </div>
                )}
            </div>

            {/* Value */}
            <div className="relative z-10 flex-1 flex items-end">
                <p className="text-3xl font-bold text-white tracking-tight">
                    {displayValue}
                </p>
            </div>

            {/* Sparkline */}
            {chartData.length > 0 && (
                <div className="absolute bottom-0 left-0 right-0 h-1/2 opacity-30 group-hover:opacity-60 transition-opacity duration-500 pointer-events-none -mb-1">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData}>
                            <defs>
                                <linearGradient id={`sparkline-${label}`} x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor={theme.svgStops[0]} stopOpacity={0.8}/>
                                    <stop offset="95%" stopColor={theme.svgStops[0]} stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            <Area 
                                type="monotone" 
                                dataKey="val" 
                                stroke={theme.svgStops[0]} 
                                strokeWidth={2}
                                fillOpacity={1} 
                                fill={`url(#sparkline-${label})`} 
                                isAnimationActive={!prefersReducedMotion}
                                animationDuration={700}
                                animationEasing="ease-out"
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            )}
        </motion.div>
    );
}
