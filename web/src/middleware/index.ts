import { withAuth } from "next-auth/middleware";
import createMiddleware from 'next-intl/middleware';
import { NextRequest } from "next/server";

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

export default function middleware(req: NextRequest) {
    const publicPathnameRegex = /^\/(?:en|pt)?(?:\/)?$/;
    const isPublicPage = publicPathnameRegex.test(req.nextUrl.pathname);

    if (isPublicPage) {
        return intlMiddleware(req);
    } else {
        return (authMiddleware as any)(req);
    }
}

export const config = {
    matcher: ['/((?!api|_next|_vercel|.*\\..*).*)']
};
