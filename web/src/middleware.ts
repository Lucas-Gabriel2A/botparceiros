import middleware from "./middleware/index";
export default middleware;

export const config = {
    matcher: ['/((?!api|_next|_vercel|.*\\..*).*)']
};
