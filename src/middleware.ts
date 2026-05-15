import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Protéger les routes API (sauf auth et collect cron)
    if (pathname.startsWith("/api/")) {
        // Autoriser NextAuth sans session (il gère son propre auth)
        if (pathname.startsWith("/api/auth/")) {
            return NextResponse.next();
        }

        // Les endpoints sociaux sont accessibles :
        // - /api/social/collect : appelé par Vercel Cron (Bearer CRON_SECRET) ou par le dashboard (session NextAuth)
        // - /api/social/metrics : donnée publique en lecture seule
        if (pathname === "/api/social/collect" || pathname === "/api/social/metrics") {
            return NextResponse.next();
        }

        // Vérifier la session JWT pour les autres routes API
        const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
        if (!token) {
            return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
        }
    }

    return NextResponse.next();
}

export const config = {
    matcher: ["/api/:path*"],
};