import type { Metadata } from "next";
import { Jost, Cormorant_Garamond } from "next/font/google";
import "./globals.css";

const jost = Jost({
    subsets: ["latin"],
    weight: ["300", "400", "500", "600", "700"],
    variable: "--font-body",
    display: "swap",
});

const cormorant = Cormorant_Garamond({
    subsets: ["latin"],
    weight: ["300", "400", "500", "600", "700"],
    style: ["normal", "italic"],
    variable: "--font-display",
    display: "swap",
});

export const metadata: Metadata = {
    title: "Anna Marketing Dashboard",
    description: "Tableau de bord marketing Anna Ollivier",
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="fr" className={`${jost.variable} ${cormorant.variable}`}>
            <body>{children}</body>
        </html>
    );
}