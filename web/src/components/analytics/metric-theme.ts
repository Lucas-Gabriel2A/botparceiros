/**
 * Centralized Theme config for Analytics Metrics.
 * PurgeCSS friendly (no dynamic Tailwind class strings with template literals).
 */

export type MetricKey =
    | 'messages_count'
    | 'members_joined'
    | 'members_left'
    | 'tickets_opened'
    | 'tickets_closed'
    | 'automod_actions'
    | 'commands_used'
    | 'ai_responses';

export interface MetricThemeDef {
    borderColor: string;
    textGlow: string;
    bgGradient: string;
    svgStops: [string, string];
    label: string;
}

export const METRIC_THEME: Record<MetricKey, MetricThemeDef> = {
    messages_count: {
        borderColor: 'group-hover:border-teal-500/50 border-teal-500/20',
        textGlow: 'text-teal-400 drop-shadow-[0_0_8px_rgba(45,212,191,0.5)]',
        bgGradient: 'from-teal-500/10 to-transparent',
        svgStops: ['#14b8a6', 'rgba(20, 184, 166, 0.1)'], // Teal-500
        label: 'Mensagens'
    },
    members_joined: {
        borderColor: 'group-hover:border-blue-500/50 border-blue-500/20',
        textGlow: 'text-blue-400 drop-shadow-[0_0_8px_rgba(96,165,250,0.5)]',
        bgGradient: 'from-blue-500/10 to-transparent',
        svgStops: ['#3b82f6', 'rgba(59, 130, 246, 0.1)'], // Blue-500
        label: 'Membros (+)'
    },
    members_left: {
        borderColor: 'group-hover:border-rose-500/50 border-rose-500/20',
        textGlow: 'text-rose-400 drop-shadow-[0_0_8px_rgba(251,113,133,0.5)]',
        bgGradient: 'from-rose-500/10 to-transparent',
        svgStops: ['#f43f5e', 'rgba(244, 63, 94, 0.1)'], // Rose-500
        label: 'Membros (-)'
    },
    tickets_opened: {
        borderColor: 'group-hover:border-indigo-500/50 border-indigo-500/20',
        textGlow: 'text-indigo-400 drop-shadow-[0_0_8px_rgba(129,140,248,0.5)]',
        bgGradient: 'from-indigo-500/10 to-transparent',
        svgStops: ['#6366f1', 'rgba(99, 102, 241, 0.1)'], // Indigo-500
        label: 'Tickets Abertos'
    },
    tickets_closed: {
        borderColor: 'group-hover:border-violet-500/50 border-violet-500/20',
        textGlow: 'text-violet-400 drop-shadow-[0_0_8px_rgba(167,139,250,0.5)]',
        bgGradient: 'from-violet-500/10 to-transparent',
        svgStops: ['#8b5cf6', 'rgba(139, 92, 246, 0.1)'], // Violet-500
        label: 'Tickets Fechados'
    },
    automod_actions: {
        borderColor: 'group-hover:border-amber-500/50 border-amber-500/20',
        textGlow: 'text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]',
        bgGradient: 'from-amber-500/10 to-transparent',
        svgStops: ['#f59e0b', 'rgba(245, 158, 11, 0.1)'], // Amber-500
        label: 'AutoMod Ações'
    },
    commands_used: {
        borderColor: 'group-hover:border-cyan-500/50 border-cyan-500/20',
        textGlow: 'text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]',
        bgGradient: 'from-cyan-500/10 to-transparent',
        svgStops: ['#06b6d4', 'rgba(6, 182, 212, 0.1)'], // Cyan-500
        label: 'Comandos Usados'
    },
    ai_responses: {
        borderColor: 'group-hover:border-pink-500/50 border-pink-500/20',
        textGlow: 'text-pink-400 drop-shadow-[0_0_8px_rgba(244,114,182,0.5)]',
        bgGradient: 'from-pink-500/10 to-transparent',
        svgStops: ['#ec4899', 'rgba(236, 72, 153, 0.1)'], // Pink-500
        label: 'Respostas IA'
    }
};
