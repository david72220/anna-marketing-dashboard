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

        // Le endpoint de collecte utilise CRON_SECRET, pas la session
        if (pathname === "/api/social/collect") {
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