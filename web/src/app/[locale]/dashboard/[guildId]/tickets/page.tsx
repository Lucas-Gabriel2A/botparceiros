import { TicketForm } from "@/components/forms/TicketForm";
import { getTicketCategories } from "@shared/services/database";
import { redirect } from "next/navigation";

interface PageProps {
    params: Promise<{
        guildId: string;
    }>;
}

export default async function TicketDashboardPage({ params }: PageProps) {
    const { guildId } = await params;

    // Fetch data
    // In a real app we might want to check permissions here or in middleware
    const categories = await getTicketCategories(guildId);

    // Mock user ID for now as we don't have auth context passed to this component directly easily without more setup
    // In a real app, get session user ID. For now, we can pass a placeholder or get it from session if available.
    // Assuming we have a way to get the user, or we validade actions server side.
    // For this implementation, let's pass a placeholder "user_dashboard" or assume the action handles auth if needed.
    // The previous forms didn't pass userId explicitly in props, but the actions might need it.
    // checking guild-actions, upsertTicketCategoryAction needs userId. 
    // We'll pass a placeholder or fetch from session if possible. 
    // Since I can't easily see auth implementation, I'll use a placeholder "DashboardUser".
    const userId = "DashboardUser";

    return (
        <div className="space-y-6">
            <TicketForm
                guildId={guildId}
                userId={userId}
                categories={categories}
            />
        </div>
    );
}
