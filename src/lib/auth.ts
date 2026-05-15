import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

export const authOptions: NextAuthOptions = {
    providers: [
        CredentialsProvider({
            name: "Credentials",
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Mot de passe", type: "password" },
            },
            async authorize(credentials) {
                if (!credentials?.email || !credentials?.password) return null;

                const validEmail = process.env.ADMIN_EMAIL || "anna-ollivier-psy";
                const validPassword = process.env.APP_PASSWORD || "ChangeMe123!";

                if (credentials.email === validEmail && credentials.password === validPassword) {
                    return {
                        id: "1",
                        email: validEmail,
                        name: "Anna OLLIVIER",
                    };
                }
                return null;
            },
        }),
    ],
    session: { strategy: "jwt" },
    pages: {
        signIn: "/login",
    },
    secret: process.env.NEXTAUTH_SECRET,
};

declare module "next-auth" {
    interface Session {
        user: {
            email?: string | null;
            name?: string | null;
        };
    }
}