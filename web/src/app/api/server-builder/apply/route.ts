import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";

const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN || process.env.DISCORD_TOKEN || "";

/**
 * Apply a server structure (schema) to a Discord server.
 * Uses Discord REST API directly to create roles, categories, and channels.
 */
export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
        }

        const { guildId, schema } = await req.json();

        if (!guildId || !schema) {
            return NextResponse.json({ error: "guildId e schema são obrigatórios" }, { status: 400 });
        }

        if (!schema.categories || !Array.isArray(schema.categories)) {
            return NextResponse.json({ error: "Schema inválido" }, { status: 400 });
        }

        if (!BOT_TOKEN) {
            return NextResponse.json({ error: "Token do bot não configurado" }, { status: 500 });
        }

        // 🛑 Check Server Generation Limits
        // We import dynamically to avoid issues if shared libs fail, but here we use local lib
        const { checkServerGenLimit, incrementServerGenUsage } = await import("@/lib/server-limits");
        const limitCheck = await checkServerGenLimit(session.user.id);

        if (!limitCheck.allowed) {
            return NextResponse.json({
                error: `Limite de geração excedido (${limitCheck.limit}/mês no plano ${limitCheck.plan})`,
                limitReached: true
            }, { status: 403 });
        }

        const messages: string[] = [];

        const discordFetch = async (endpoint: string, options: RequestInit = {}) => {
            const res = await fetch(`https://discord.com/api/v10${endpoint}`, {
                ...options,
                headers: {
                    'Authorization': `Bot ${BOT_TOKEN}`,
                    'Content-Type': 'application/json',
                    ...(options.headers || {}),
                },
            });
            if (!res.ok) {
                const errText = await res.text();
                throw new Error(`Discord API error ${res.status}: ${errText}`);
            }
            return res.json();
        };

        const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

        // 1. Create Roles
        const roleMap = new Map<string, string>();
        if (schema.roles && Array.isArray(schema.roles)) {
            for (const roleDef of schema.roles) {
                try {
                    const permissionsBits = resolvePermissions(roleDef.permissions || []);
                    const role = await discordFetch(`/guilds/${guildId}/roles`, {
                        method: 'POST',
                        body: JSON.stringify({
                            name: roleDef.name,
                            color: parseInt((roleDef.color || '#99AAB5').replace('#', ''), 16),
                            permissions: permissionsBits,
                            hoist: roleDef.hoist || false,
                            mentionable: roleDef.mentionable || false,
                        }),
                    });
                    roleMap.set(roleDef.id, role.id); // Map Schema ID to Discord Role ID
                    messages.push(`✅ Cargo criado: ${roleDef.name}`);
                    await delay(300);
                } catch (error: any) {
                    messages.push(`⚠️ Erro ao criar cargo ${roleDef.name}: ${error.message}`);
                }
            }
        }

        // 2. Create Categories and Channels
        if (schema.categories && Array.isArray(schema.categories)) {
            for (const catDef of schema.categories) {
                try {
                    const category = await discordFetch(`/guilds/${guildId}/channels`, {
                        method: 'POST',
                        body: JSON.stringify({
                            name: catDef.name,
                            type: 4,
                        }),
                    });
                    messages.push(`📁 Categoria criada: ${catDef.name}`);
                    await delay(300);

                    if (catDef.channels && Array.isArray(catDef.channels)) {
                        for (const chDef of catDef.channels) {
                            // try { (Removed)
                            const channelType = getChannelType(chDef.type);

                            // Base data
                            const channelData: any = {
                                name: chDef.name,
                                type: channelType,
                                parent_id: category.id,
                            };

                            // Add optional fields based on channel type
                            // Text (0), Announcement (5), Forum (15) support topic and nsfw
                            if ([0, 5, 15].includes(channelType)) {
                                if (chDef.description) channelData.topic = chDef.description;
                                if (chDef.nsfw) channelData.nsfw = chDef.nsfw;
                                if (chDef.slowmode) channelData.rate_limit_per_user = chDef.slowmode;
                            }

                            // Voice (2) and Stage (13) support user_limit
                            if ([2, 13].includes(channelType)) {
                                if (chDef.user_limit !== undefined) channelData.user_limit = chDef.user_limit;
                            }

                            // Handle Permissions (Private & Read-Only)
                            const permissionOverwrites: any[] = [];

                            // 1. Private Channel Logic
                            if (chDef.is_private) {
                                // Deny @everyone View Channel
                                permissionOverwrites.push({
                                    id: guildId, // @everyone role ID = guild ID
                                    type: 0, // Role
                                    allow: '0',
                                    deny: '1024' // VIEW_CHANNEL
                                });

                                // Allow specific roles (View)
                                if (chDef.allowed_roles && Array.isArray(chDef.allowed_roles)) {
                                    for (const schemaRoleId of chDef.allowed_roles) {
                                        const discordRoleId = roleMap.get(schemaRoleId);
                                        if (discordRoleId) {
                                            permissionOverwrites.push({
                                                id: discordRoleId,
                                                type: 0, // Role
                                                allow: '1024', // VIEW_CHANNEL
                                                deny: '0'
                                            });
                                        }
                                    }
                                }
                            }

                            // 2. Read-Only Logic
                            if (chDef.is_readonly) {
                                // Find existing overwrite for @everyone or create new
                                const everyoneOverwrite = permissionOverwrites.find(p => p.id === guildId);
                                if (everyoneOverwrite) {
                                    // Add SEND_MESSAGES (2048) to deny
                                    everyoneOverwrite.deny = (parseInt(everyoneOverwrite.deny) | 2048).toString();
                                } else {
                                    permissionOverwrites.push({
                                        id: guildId, // @everyone
                                        type: 0,
                                        allow: '0',
                                        deny: '2048' // SEND_MESSAGES
                                    });
                                }

                                // Allow specific roles (Write)
                                if (chDef.writable_roles && Array.isArray(chDef.writable_roles)) {
                                    for (const schemaRoleId of chDef.writable_roles) {
                                        const discordRoleId = roleMap.get(schemaRoleId);
                                        if (discordRoleId) {
                                            // Check if role already has an overwrite (e.g. from private logic)
                                            const roleOverwrite = permissionOverwrites.find(p => p.id === discordRoleId);
                                            if (roleOverwrite) {
                                                roleOverwrite.allow = (parseInt(roleOverwrite.allow) | 2048).toString();
                                            } else {
                                                permissionOverwrites.push({
                                                    id: discordRoleId,
                                                    type: 0,
                                                    allow: '2048', // SEND_MESSAGES
                                                    deny: '0'
                                                });
                                            }
                                        }
                                    }
                                }
                            }

                            if (permissionOverwrites.length > 0) {
                                channelData.permission_overwrites = permissionOverwrites;
                            }

                            try {
                                await discordFetch(`/guilds/${guildId}/channels`, {
                                    method: 'POST',
                                    body: JSON.stringify(channelData),
                                });
                                messages.push(`  💬 Canal criado: ${chDef.name}`);
                            } catch (error: any) {
                                // Fallback for non-community servers (Discord API throws 50024 or Invalid Form Body for Stage/Forum/News)
                                const errMsg = error.message || "";
                                if (errMsg.includes("50024") || errMsg.includes("Invalid Form Body")) {
                                    try {
                                        if (channelType === 5 || channelType === 15) {
                                            channelData.type = 0; // Fallback to Text
                                        } else if (channelType === 13) {
                                            channelData.type = 2; // Fallback to Voice
                                        } else {
                                            throw error; // If it's a different error that we can't fallback from
                                        }

                                        await discordFetch(`/guilds/${guildId}/channels`, {
                                            method: 'POST',
                                            body: JSON.stringify(channelData),
                                        });
                                        const typeName = channelData.type === 2 ? 'Voz' : 'Texto';
                                        messages.push(`  💬 Canal criado (Fallback ${typeName}): ${chDef.name}`);
                                        await delay(250);
                                        continue; // Skip the error log below
                                    } catch (retryError: any) {
                                        messages.push(`  ⚠️ Erro ao criar canal ${chDef.name} (Retry failed): ${retryError.message}`);
                                    }
                                } else {
                                    messages.push(`  ⚠️ Erro ao criar canal ${chDef.name}: ${error.message} (Payload: ${JSON.stringify(channelData)})`);
                                }
                            }
                            await delay(250);
                        }
                    }
                } catch (error: any) {
                    messages.push(`⚠️ Erro ao criar categoria ${catDef.name}: ${error.message}`);
                }
            }
        }

        messages.push(`\n🎉 Estrutura aplicada com sucesso!`);

        // ✅ Increment Usage
        await incrementServerGenUsage(session.user.id);

        return NextResponse.json({ success: true, messages });
    } catch (error) {
        console.error("[ServerBuilder Apply] Error:", error);
        return NextResponse.json({ error: "Erro interno" }, { status: 500 });
    }
}

function getChannelType(type: string): number {
    const map: Record<string, number> = {
        text: 0,
        voice: 2,
        announcement: 5,
        forum: 15,
        stage: 13,
    };
    return map[type] ?? 0;
}

function resolvePermissions(perms: string[]): string {
    const map: Record<string, bigint> = {
        CreateInstantInvite: 1n << 0n,
        KickMembers: 1n << 1n,
        BanMembers: 1n << 2n,
        Administrator: 1n << 3n,
        ManageChannels: 1n << 4n,
        ManageGuild: 1n << 5n,
        AddReactions: 1n << 6n,
        ViewAuditLog: 1n << 7n,
        PrioritySpeaker: 1n << 8n,
        Stream: 1n << 9n,
        ViewChannel: 1n << 10n,
        SendMessages: 1n << 11n,
        SendTTSMessages: 1n << 12n,
        ManageMessages: 1n << 13n,
        EmbedLinks: 1n << 14n,
        AttachFiles: 1n << 15n,
        ReadMessageHistory: 1n << 16n,
        MentionEveryone: 1n << 17n,
        UseExternalEmojis: 1n << 18n,
        ViewGuildInsights: 1n << 19n,
        Connect: 1n << 20n,
        Speak: 1n << 21n,
        MuteMembers: 1n << 22n,
        DeafenMembers: 1n << 23n,
        MoveMembers: 1n << 24n,
        UseVAD: 1n << 25n,
        ChangeNickname: 1n << 26n,
        ManageNicknames: 1n << 27n,
        ManageRoles: 1n << 28n,
        ManageWebhooks: 1n << 29n,
        ManageEmojisAndStickers: 1n << 30n,
        UseApplicationCommands: 1n << 31n,
        RequestToSpeak: 1n << 32n,
        ManageEvents: 1n << 33n,
        ManageThreads: 1n << 34n,
        CreatePublicThreads: 1n << 35n,
        CreatePrivateThreads: 1n << 36n,
        UseExternalStickers: 1n << 37n,
        SendMessagesInThreads: 1n << 38n,
        UseEmbeddedActivities: 1n << 39n,
        ModerateMembers: 1n << 40n,
    };

    let bits = 0n;
    for (const p of perms) {
        if (map[p]) bits |= map[p];
    }
    return bits.toString();
}
