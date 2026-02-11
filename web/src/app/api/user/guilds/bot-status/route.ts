import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { database } from "@shared/services/database";

export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { guildIds } = await req.json();

        if (!Array.isArray(guildIds) || guildIds.length === 0) {
            return NextResponse.json({ error: "guildIds is required" }, { status: 400 });
        }

        // Buscar quais guilds já têm config (= bot está lá)
        const result = await database.query(
            `SELECT guild_id FROM guild_configs WHERE guild_id = ANY($1)`,
            [guildIds]
        );

        const botGuilds = new Set(result.rows.map((r: { guild_id: string }) => r.guild_id));

        const status: Record<string, boolean> = {};
        for (const id of guildIds) {
            status[id] = botGuilds.has(id);
        }

        return NextResponse.json(status);
    } catch (error) {
        console.error("Bot status error:", error);
        return NextResponse.json({ error: "Failed to fetch bot status" }, { status: 500 });
    }
}
