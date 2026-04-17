import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";

/**
 * Verifica na API do Discord se a sessão autenticada possui token e tem a permissão MANAGE_GUILD
 * para o guildId fornecido. 
 * Isso previne vulnerabilidades do tipo IDOR nas Server Actions e garantem que 
 * ações destrutivas ou de configuração apenas passem por Admins.
 */
export async function verifyUserGuildAccess(guildId: string): Promise<boolean> {
    try {
        const session = await getServerSession(authOptions);

        // @ts-ignore - accessToken é injetado nas authOptions callbacks
        const accessToken = session?.accessToken;

        if (!accessToken) {
            return false;
        }

        const res = await fetch("https://discord.com/api/users/@me/guilds", {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
            // Não cacheamos rigorosamente aqui pois permissões podem mudar
            cache: "no-store", 
        });

        if (!res.ok) {
            console.error("[Discord API] Erro ao buscar guilds do usuário:", res.status, res.statusText);
            const text = await res.text();
            console.error("[Discord API] Body:", text);
            return false;
        }

        const guilds = await res.json();

        // Encontrar a respectiva Guild
        const targetGuild = guilds.find((g: any) => g.id === guildId);
        
        if (!targetGuild) {
            return false;
        }

        // 0x20 = MANAGE_GUILD (32)
        // 0x8 = ADMINISTRATOR (8)
        const permissions = BigInt(targetGuild.permissions || 0);
        const MANAGE_GUILD = BigInt(0x20);
        const ADMINISTRATOR = BigInt(0x8);

        const hasManageServer = (permissions & MANAGE_GUILD) === MANAGE_GUILD;
        const hasAdmin = (permissions & ADMINISTRATOR) === ADMINISTRATOR;

        return targetGuild.owner || hasManageServer || hasAdmin;

    } catch (error) {
        console.error("verifyUserGuildAccess error:", error);
        return false;
    }
}
