import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { database } from "@shared/services/database";

export async function GET() {
    const session = await getServerSession(authOptions);

    // @ts-ignore - accessToken is added by NextAuth callbacks
    if (!session || !session.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const subscription = await database.getSubscriptionByUser(session.user.id);

        if (!subscription) {
            return NextResponse.json({ subscription: null });
        }

        return NextResponse.json({
            subscription: {
                id: subscription.id,
                plan: subscription.plan,
                status: subscription.status,
                nextPayment: subscription.next_payment,
                createdAt: subscription.created_at,
                updatedAt: subscription.updated_at
            }
        });
    } catch (error) {
        console.error("Subscription fetch error:", error);
        return NextResponse.json({ error: "Failed to fetch subscription" }, { status: 500 });
    }
}
