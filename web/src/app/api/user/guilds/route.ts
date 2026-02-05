import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import { unstable_cache } from "next/cache";

// Cache guilds response for 60 seconds per user token
const getCachedGuilds = async (accessToken: string) => {
  return fetch("https://discord.com/api/users/@me/guilds", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    next: { revalidate: 60 } // Cache for 60s
  }).then(async (res) => {
    if (!res.ok) {
      // If rate limited, propagate error to be handled by caller (no cache)
      if (res.status === 429) {
        const errorText = await res.text();
        throw new Error(`429:${errorText}`);
      }
      throw new Error(`Failed to fetch guilds: ${res.status}`);
    }
    return res.json();
  });
};

export async function GET() {
  const session = await getServerSession(authOptions);

  // @ts-ignore
  if (!session || !session.accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // We cannot easily use unstable_cache with dynamic arguments (accessToken) in a way that is persistent comfortably across lambda instances without Redis, 
    // but Next.js data cache works if we fetch. 
    // However, unstable_cache requires a static key or arguments that can be serialized.
    // Let's rely on standard fetch caching first? 
    // Discord API requires Authorization header, so standard 'force-cache' might cache the same response for everyone if not careful with Vary.
    // Actually, 'fetch' in Next.js app router overrides global fetch.

    // Better approach for now: Simple Retry Logic
    let res = await fetch("https://discord.com/api/users/@me/guilds", {
      headers: {
        // @ts-ignore
        Authorization: `Bearer ${session.accessToken}`,
      },
    });

    if (res.status === 429) {
      console.warn("Rate limit hit, retrying in 1s...");
      await new Promise(r => setTimeout(r, 1000));
      res = await fetch("https://discord.com/api/users/@me/guilds", {
        headers: {
          // @ts-ignore
          Authorization: `Bearer ${session.accessToken}`,
        },
      });
    }

    if (!res.ok) {
      console.error(`Discord API Error: ${res.status} ${res.statusText}`);
      const errorText = await res.text();
      console.error(`Response body: ${errorText}`);
      throw new Error(`Failed to fetch guilds: ${res.status}`);
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
