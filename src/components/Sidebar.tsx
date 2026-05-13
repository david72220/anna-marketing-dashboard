"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";

const navItems = [
    { href: "/dashboard", label: "Vue d'ensemble", icon: "📊" },
    { href: "/dashboard/analyses", label: "Analyses Contenu", icon: "🔍" },
    { href: "/dashboard/veille", label: "Veille Concurrence", icon: "👁️" },
    { href: "/dashboard/backlog", label: "Backlog Posts", icon: "📝" },
    { href: "/dashboard/metrics", label: "Métriques Réseaux", icon: "📈" },
];

export default function Sidebar() {
    const pathname = usePathname();

    return (
        <aside className="w-64 bg-slate-900 text-white min-h-screen flex flex-col">
            <div className="p-6 border-b border-slate-700">
                <h1 className="text-xl font-bold">Anna OLLIVIER</h1>
                <p className="text-sm text-slate-400 mt-1">Dashboard Marketing</p>
            </div>

            <nav className="flex-1 py-4">
                {navItems.map((item) => (
                    <Link
                        key={item.href}
                        href={item.href}
                        className={`flex items-center gap-3 px-6 py-3 text-sm transition-colors ${pathname === item.href
                                ? "bg-violet-600 text-white"
                                : "text-slate-300 hover:bg-slate-800 hover:text-white"
                            }`}
                    >
                        <span>{item.icon}</span>
                        {item.label}
                    </Link>
                ))}
            </nav>

            <div className="p-4 border-t border-slate-700">
                <a
                    href="https://anna-ollivier-psy.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-slate-400 hover:text-white block mb-2"
                >
                    🌐 anna-ollivier-psy.com
                </a>
                <a
                    href="https://www.youtube.com/@Confidencesdetoutpetits-Monreg"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-slate-400 hover:text-white block mb-2"
                >
                    🎥 Chaîne YouTube
                </a>
                <a
                    href="https://www.tiktok.com/@anna.ollivier.psy"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-slate-400 hover:text-white block mb-4"
                >
                    🎵 TikTok
                </a>
                <button
                    onClick={() => signOut({ callbackUrl: "/login" })}
                    className="w-full text-left text-sm text-red-400 hover:text-red-300"
                >
                    🔓 Déconnexion
                </button>
            </div>
        </aside>
    );
}