import { KpiCard } from './KpiCard';
import { METRIC_THEME, MetricKey } from './metric-theme';
import { MessageSquare, Users, Ticket, Shield, BarChart3, Bot } from 'lucide-react';
import { motion } from 'framer-motion';
import { useReducedMotionSafe } from '@/hooks/useReducedMotionSafe';

interface DailyData {
    messages_count: number;
    members_joined: number;
    members_left: number;
    tickets_opened: number;
    tickets_closed: number;
    automod_actions: number;
    commands_used: number;
    ai_responses: number;
}

interface SummaryData {
    messages_count: number;
    members_joined: number;
    members_left: number;
    tickets_opened: number;
    tickets_closed: number;
    automod_actions: number;
    commands_used: number;
    ai_responses: number;
}

interface KpiGridProps {
    summary: SummaryData;
    daily: DailyData[];
    // Delta implementation could be added later comparing periods
}

export function KpiGrid({ summary, daily }: KpiGridProps) {
    const prefersReducedMotion = useReducedMotionSafe();

    // Map the actual data to the cards
    const cards = [
        { key: 'messages_count' as MetricKey, value: summary?.messages_count || 0, icon: MessageSquare },
        { key: 'members_joined' as MetricKey, value: summary?.members_joined || 0, icon: Users },
        { key: 'members_left' as MetricKey, value: summary?.members_left || 0, icon: Users },
        { key: 'tickets_opened' as MetricKey, value: summary?.tickets_opened || 0, icon: Ticket },
        { key: 'tickets_closed' as MetricKey, value: summary?.tickets_closed || 0, icon: Ticket },
        { key: 'automod_actions' as MetricKey, value: summary?.automod_actions || 0, icon: Shield },
        { key: 'commands_used' as MetricKey, value: summary?.commands_used || 0, icon: BarChart3 },
        { key: 'ai_responses' as MetricKey, value: summary?.ai_responses || 0, icon: Bot },
    ];

    // Parent container with stagger children effect (only if motion is allowed)
    const containerVariants = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: {
                staggerChildren: 0.05
            }
        }
    };

    return (
        <motion.div 
            variants={prefersReducedMotion ? {} : containerVariants}
            initial="hidden"
            animate="show"
            className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 w-full mb-8 z-10"
        >
            {cards.map((card, i) => {
                const theme = METRIC_THEME[card.key];
                const series = daily ? daily.map(d => d[card.key]) : [];

                return (
                    <KpiCard
                        key={card.key}
                        label={theme.label}
                        value={card.value}
                        icon={card.icon}
                        theme={theme}
                        series={series}
                        delayIndex={i}
                    />
                );
            })}
        </motion.div>
    );
}
