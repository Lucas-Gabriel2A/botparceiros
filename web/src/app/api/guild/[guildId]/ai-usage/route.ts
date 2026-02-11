import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { checkAiLimit, checkServerGenLimit } from "@shared/services/ai-limit.service";
import { config } from "@shared/services/config.service";

export async function GET(
    request: Request,
    { params }: { params: { guildId: string } }
) {
    const session = await getServerSession(authOptions);

    // @ts-ignore
    if (!session || !session.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { guildId } = await params;
    // @ts-ignore
    const userId = session.user.id;

    try {
        // 1. Fetch Guild Owner ID using Bot Token
        // We need the owner ID to check the plan limits effectively
        const botToken = config.getIAConfig().token;
        const guildRes = await fetch(`https://discord.com/api/guilds/${guildId}`, {
            headers: {
                Authorization: `Bot ${botToken}`,
            },
        });

        if (!guildRes.ok) {
            console.error("Failed to fetch guild details", await guildRes.text());
            return NextResponse.json({ error: "Failed to fetch guild details" }, { status: 500 });
        }

        const guildData = await guildRes.json();
        const ownerId = guildData.owner_id;

        // 2. Check Limits
        const [messageLimit, serverGenLimit] = await Promise.all([
            checkAiLimit(userId, guildId, ownerId),
            checkServerGenLimit(userId)
        ]);

        return NextResponse.json({
            messages: {
                current: messageLimit.current,
                limit: messageLimit.limit,
                plan: messageLimit.plan,
                allowed: messageLimit.allowed
            },
            serverGen: {
                current: serverGenLimit.current,
                limit: serverGenLimit.limit,
                plan: serverGenLimit.plan,
                allowed: serverGenLimit.allowed
            }
        });

    } catch (error) {
        console.error("Error fetching AI usage:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
// Force rebuild
