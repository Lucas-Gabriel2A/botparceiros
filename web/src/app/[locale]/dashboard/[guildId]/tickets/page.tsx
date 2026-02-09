import { TicketForm } from "@/components/forms/TicketForm";
import { getTicketCategories } from "@shared/services/database";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth-service";

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

    // Fetch data
    const categories = await getTicketCategories(guildId);

    return (
        <div className="space-y-6">
            <TicketForm
                guildId={guildId}
                userId={user.id}
                categories={categories}
            />
        </div>
    );
}
