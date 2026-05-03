import { withAuth } from "next-auth/middleware";
import createMiddleware from 'next-intl/middleware';
import { NextRequest, NextResponse } from "next/server";

const intlMiddleware = createMiddleware({
    locales: ['en', 'pt'],
    defaultLocale: 'pt'
});

const authMiddleware = withAuth(
    function onSuccess(req) {
        return intlMiddleware(req as unknown as NextRequest);
    },
    {
        callbacks: {
            authorized: ({ token }) => token != null
        },
        pages: {
            signIn: '/'
        }
    }
);

export default async function middleware(req: NextRequest) {
    const publicPathnameRegex = /^\/(?:en|pt)?(?:\/)?$/;
    const isPublicPage = publicPathnameRegex.test(req.nextUrl.pathname);

    let response: NextResponse;

    if (isPublicPage) {
        response = intlMiddleware(req);
    } else {
        response = (authMiddleware as any)(req);
    }

    // A Railway injeta o host com a porta 8080 internamente.
    // Isso faz com que redirects (301/302) gerados pelo next-intl ou next-auth
    // venham com a porta 8080 na URL, o que quebra o acesso externo.
    // Essa correção intercepta o redirect e remove a porta.
    if (response && response.status >= 300 && response.status < 400) {
        const location = response.headers.get('location');
        if (location && location.includes(':8080')) {
            response.headers.set('location', location.replace(':8080', ''));
        }
    }

    return response;
}

export const config = {
    matcher: ['/((?!api|_next|_vercel|.*\\..*).*)']
};
