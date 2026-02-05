import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";

export async function GET() {
  const session = await getServerSession(authOptions);

  // @ts-ignore - accessToken is added in the updated session callback
  if (!session || !session.accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const res = await fetch("https://discord.com/api/users/@me/guilds", {
      headers: {
        // @ts-ignore
        Authorization: `Bearer ${session.accessToken}`,
      },
    });

    if (!res.ok) {
      throw new Error("Failed to fetch guilds");
    }

    const guilds = await res.json();
    
    // 0x20 = MANAGE_GUILD (32)
    const adminGuilds = guilds.filter((guild: any) => (parseInt(guild.permissions) & 0x20) === 0x20);

    return NextResponse.json(adminGuilds);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to fetch guilds" }, { status: 500 });
  }
}
