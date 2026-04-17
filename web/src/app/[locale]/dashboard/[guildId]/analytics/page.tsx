'use client';

import { useState, useEffect } from 'react';
import { usePlan, PlanGate } from '@/components/PlanGate';
import { AnalyticsHeader } from '@/components/analytics/AnalyticsHeader';
import { PeriodToggle } from '@/components/analytics/PeriodToggle';
import { KpiGrid } from '@/components/analytics/KpiGrid';
import { MessagesChart } from '@/components/analytics/MessagesChart';
import { AnalyticsSkeleton } from '@/components/analytics/Skeleton';
import { AnalyticsEmptyState } from '@/components/analytics/EmptyState';

interface AnalyticsData {
    daily: Array<{
        date: string;
        messages_count: number;
        members_joined: number;
        members_left: number;
        tickets_opened: number;
        tickets_closed: number;
        automod_actions: number;
        commands_used: number;
        ai_responses: number;
    }>;
    summary: {
        messages_count: number;
        members_joined: number;
        members_left: number;
        tickets_opened: number;
        tickets_closed: number;
        automod_actions: number;
        commands_used: number;
        ai_responses: number;
    } | null;
    period: number;
}

interface Props {
    params: Promise<{ guildId: string }>;
}

export default function AnalyticsPage({ params }: Props) {
    const { plan } = usePlan();
    const [guildId, setGuildId] = useState('');
    const [data, setData] = useState<AnalyticsData | null>(null);
    const [period, setPeriod] = useState(7);
    const [loading, setLoading] = useState(true);

    // Resolve URL params
    useEffect(() => {
        params.then(p => setGuildId(p.guildId));
    }, [params]);

    // Data Fetching
    useEffect(() => {
        if (!guildId) return;
        setLoading(true);
        fetch(`/api/guild/${guildId}/analytics?period=${period}`)
            .then(r => r.json())
            .then(d => { 
                setData(d); 
                setLoading(false); 
            })
            .catch(() => setLoading(false));
    }, [guildId, period]);

    const isCompletelyEmpty = data?.summary && Object.values(data.summary).every(val => val === 0);

    return (
        <div className="space-y-4 flex flex-col items-center w-full max-w-7xl mx-auto px-4 pb-12">
            
            <AnalyticsHeader />

            <PlanGate feature="analytics" plan={plan}>
                {loading ? (
                    <AnalyticsSkeleton />
                ) : (
                    <div className="w-full relative">
                        <PeriodToggle period={period} setPeriod={setPeriod} />

                        {isCompletelyEmpty ? (
                            <AnalyticsEmptyState />
                        ) : (
                            <div className="w-full flex flex-col items-center gap-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                                {data?.summary && data?.daily && (
                                    <KpiGrid 
                                        summary={data.summary} 
                                        daily={data.daily} 
                                    />
                                )}

                                {data?.daily && (
                                    <MessagesChart data={data.daily} />
                                )}
                            </div>
                        )}
                    </div>
                )}
            </PlanGate>
        </div>
    );
}
