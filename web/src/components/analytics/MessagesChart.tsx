import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, MessageSquare } from 'lucide-react';
import { useReducedMotionSafe } from '@/hooks/useReducedMotionSafe';

interface DailyData {
    date: string;
    messages_count: number;
}

interface MessagesChartProps {
    data: DailyData[];
}

export function MessagesChart({ data }: MessagesChartProps) {
    const prefersReducedMotion = useReducedMotionSafe();

    if (!data || data.length === 0) {
        return (
            <div className="w-full bg-[#0A0A0C] border border-white/10 rounded-2xl p-6 h-[400px] flex flex-col items-center justify-center relative overflow-hidden group">
                <div className="absolute inset-0 bg-linear-to-b from-teal-500/5 to-transparent opacity-50 pointer-events-none" />
                <MessageSquare className="w-8 h-8 text-teal-500/30 mb-4" />
                <div className="text-zinc-500 text-sm">Nenhum dado de mensagens no período selecionado.</div>
            </div>
        );
    }

    // Format Data
    const chartData = data.map(day => {
        const dateObj = new Date(day.date);
        return {
            dateStr: dateObj.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }),
            messages: day.messages_count
        };
    });

    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-glass px-4 py-3 rounded-xl shadow-2xl border border-white/10 text-sm relative z-50">
                    <div className="text-zinc-400 mb-1 font-medium">{label}</div>
                    <div className="text-white flex items-center gap-2 font-bold text-lg">
                        <span className="w-2 h-2 rounded-full bg-teal-400" />
                        {payload[0].value.toLocaleString('pt-BR')} <span className="text-xs font-normal text-zinc-500">msgs</span>
                    </div>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="w-full bg-[#0A0A0C] border border-white/10 rounded-2xl p-6 h-[400px] flex flex-col hover:border-white/20 transition-colors z-10 relative">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-teal-400" />
                    <h3 className="text-lg font-medium text-white">Mensagens por Dia</h3>
                </div>
            </div>
            
            <div className="flex-1 w-full relative">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                        data={chartData}
                        margin={{ top: 10, right: 0, left: -20, bottom: 0 }}
                    >
                        <defs>
                            <linearGradient id="colorMessages" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.4}/>
                                <stop offset="95%" stopColor="#14b8a6" stopOpacity={0}/>
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                        <XAxis 
                            dataKey="dateStr" 
                            stroke="#52525b" 
                            fontSize={12}
                            tickLine={false}
                            axisLine={false}
                            tick={{ fill: '#71717a' }}
                            dy={10}
                        />
                        <YAxis 
                            stroke="#52525b" 
                            fontSize={12}
                            tickLine={false}
                            axisLine={false}
                            tick={{ fill: '#71717a' }}
                        />
                        <Tooltip 
                            content={<CustomTooltip />} 
                            cursor={{ stroke: '#3f3f46', strokeWidth: 1, strokeDasharray: '4 4' }}
                            isAnimationActive={!prefersReducedMotion}
                        />
                        <Area 
                            type="monotone" 
                            dataKey="messages" 
                            stroke="#2dd4bf" 
                            strokeWidth={2}
                            fillOpacity={1} 
                            fill="url(#colorMessages)" 
                            isAnimationActive={!prefersReducedMotion}
                            animationDuration={1000}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
