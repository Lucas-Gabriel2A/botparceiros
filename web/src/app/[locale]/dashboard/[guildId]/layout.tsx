import { ReactNode } from "react";
import { getServerSession } from "next-auth";
import { redirect, notFound } from "next/navigation";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import Link from "next/link";
import { ServerSidebar } from "@/components/ServerSidebar";

interface Props {
    children: ReactNode;
    params: Promise<{
        locale: string;
        guildId: string;
    }>;
}

async function getMemberPermissions(guildId: string, accessToken: string) {
    const res = await fetch(`https://discord.com/api/users/@me/guilds`, {
        headers: {
            Authorization: `Bearer ${accessToken}`,
        },
        // Cache por pouco tempo para garantir segurança
        next: { revalidate: 60 }
    });

    if (!res.ok) return null;
    const guilds = await res.json();
    return guilds.find((g: any) => g.id === guildId);
}

export default async function ServerLayout({ children, params }: Props) {
    const { guildId, locale } = await params;
    const session = await getServerSession(authOptions);

    if (!session?.accessToken) {
        redirect("/");
    }

    // 🔒 Segurança: Verificar se o usuário realmente está na guilda e tem permissão
    // Permission bit 0x20 é MANAGE_GUILD (32)
    const guild = await getMemberPermissions(guildId, session.accessToken as string);

    if (!guild || (parseInt(guild.permissions) & 0x20) !== 0x20) {
        // Se não achou a guilda ou não tem permissão, nega acesso.
        redirect("/dashboard?error=access_denied");
    }

    return (
        <div className="flex h-screen bg-black text-white overflow-hidden">
            <ServerSidebar guild={guild} locale={locale} />

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto bg-[#060609] relative h-full">
                <div className="fixed inset-0 z-0 pointer-events-none opacity-20">
                    <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-purple-900/20 blur-[100px] rounded-full"></div>
                </div>

                <div className="relative z-10 w-full min-h-full">
                    <div className="p-8 max-w-6xl mx-auto">
                        {children}
                    </div>
                </div>
            </main>
        </div>
    );
}
