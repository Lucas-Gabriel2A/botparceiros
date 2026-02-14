import { getTicketCategories, getGuildConfig } from "@shared/services/database";
import { getUserPlan } from "@shared/services/plan-features";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth-service";
import { TicketDashboardClient } from "./TicketDashboardClient";

interface PageProps {
    params: Promise<{
        guildId: string;
    }>;
}

export default async function TicketDashboardPage({ params }: PageProps) {
    const { guildId } = await params;
    const user = await getCurrentUser();

    if (!user) {
        redirect("/api/auth/signin");
    }

    // Fetch data in parallel
    const [categories, guildConfig, userPlan] = await Promise.all([
        getTicketCategories(guildId),
        getGuildConfig(guildId),
        getUserPlan(user.id)
    ]);

    return (
        <TicketDashboardClient
            guildId={guildId}
            userId={user.id}
            userPlan={userPlan}
            categories={categories}
            guildConfig={guildConfig || {}}
        />
    );
}
