import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

export const authOptions: NextAuthOptions = {
    providers: [
        CredentialsProvider({
            name: "Credentials",
            credentials: {
                username: { label: "Login", type: "text" },
                password: { label: "Mot de passe", type: "password" },
            },
            async authorize(credentials) {
                if (!credentials?.username || !credentials?.password) return null;

                const validUsername = process.env.ADMIN_EMAIL;
                const validPassword = process.env.ADMIN_PASSWORD;

                if (!validUsername || !validPassword) {
                    console.error("ADMIN_EMAIL et ADMIN_PASSWORD doivent être définis dans les variables d'environnement");
                    return null;
                }

                if (credentials.username === validUsername && credentials.password === validPassword) {
                    return {
                        id: "1",
                        email: validUsername,
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