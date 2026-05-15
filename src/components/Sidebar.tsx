"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";

const navItems = [
    { href: "/dashboard", label: "Vue d'ensemble", icon: "📊" },
    { href: "/dashboard/analyses", label: "Analyses Contenu", icon: "🔍" },
    { href: "/dashboard/veille", label: "Veille Concurrence", icon: "👁️" },
    { href: "/dashboard/backlog", label: "Backlog Posts", icon: "📝" },
    { href: "/dashboard/metrics", label: "KPI réseaux", icon: "📈" },
];

export default function Sidebar() {
    const pathname = usePathname();

    return (
        <aside className="w-64 bg-[#3A2E2E] text-[#FAF6F1] min-h-screen flex flex-col">
            <div className="p-6 border-b border-[#7A6A6A]/30">
                <h1 className="text-xl font-bold">Anna OLLIVIER</h1>
                <p className="text-sm text-[#C8A5A5] mt-1">Dashboard Marketing</p>
            </div>

            <nav className="flex-1 py-4">
                {navItems.map((item) => (
                    <Link
                        key={item.href}
                        href={item.href}
                        className={`flex items-center gap-3 px-6 py-3 text-sm transition-colors ${pathname === item.href
                            ? "bg-[#9B7D96] text-[#FAF6F1]"
                            : "text-[#FAF6F1]/70 hover:bg-[#7A6A6A]/20 hover:text-[#FAF6F1]"
                            }`}
                    >
                        <span>{item.icon}</span>
                        {item.label}
                    </Link>
                ))}
            </nav>

            <div className="p-4 border-t border-[#7A6A6A]/30">
                <a
                    href="https://anna-ollivier-psy.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-[#FAF6F1]/60 hover:text-[#FAF6F1] block mb-2"
                >
                    🌐 anna-ollivier-psy.com
                </a>
                <a
                    href="https://www.youtube.com/@Confidencesdetoutpetits-Monreg"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-[#FAF6F1]/60 hover:text-[#FAF6F1] block mb-2"
                >
                    🎥 Chaîne YouTube
                </a>
                <a
                    href="https://www.tiktok.com/@anna.ollivier.psy"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-[#FAF6F1]/60 hover:text-[#FAF6F1] block mb-4"
                >
                    🎵 TikTok
                </a>
                <button
                    onClick={() => signOut({ callbackUrl: "/login" })}
                    className="w-full text-left text-sm text-[#C8A5A5] hover:text-[#EDD8D8]"
                >
                    🔓 Déconnexion
                </button>
            </div>
        </aside>
    );
}