import { NextAuthOptions } from "next-auth";
import DiscordProvider from "next-auth/providers/discord";

/** URL base de produção (sem porta) */
const PROD_URL = process.env.NEXTAUTH_URL || '';

export const authOptions: NextAuthOptions = {
    providers: [
        DiscordProvider({
            clientId: process.env.DISCORD_CLIENT_ID ?? "",
            clientSecret: process.env.DISCORD_CLIENT_SECRET ?? "",
            authorization: { params: { scope: 'identify email guilds' } },
        }),
    ],
    callbacks: {
        async redirect({ url, baseUrl }) {
            // Railway roda internamente em porta 8080, mas externamente é HTTPS/443.
            // Remove qualquer porta da URL para evitar redirect para :8080
            const cleanBase = PROD_URL || baseUrl.replace(/:\d+$/, '');

            // URL relativa → combinar com base limpa
            if (url.startsWith("/")) {
                return `${cleanBase}${url}`;
            }

            // URL absoluta do mesmo domínio → limpar porta
            try {
                const parsed = new URL(url);
                parsed.port = '';
                return parsed.toString();
            } catch {
                return cleanBase;
            }
        },
        async jwt({ token, account }: any) {
            if (account) {
                token.accessToken = account.access_token;
            }
            return token;
        },
        async session({ session, token }: any) {
            if (session?.user) {
                session.user.id = token.sub;
                session.accessToken = token.accessToken;
            }
            return session;
        },
    },
};
