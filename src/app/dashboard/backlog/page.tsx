"use client";

import { useEffect, useState } from "react";

interface BacklogItem {
    id: string;
    title: string;
    plateforme: string;
    typeContenu: string;
    sujet: string;
    angle: string;
    motsCles: string;
    priorite: string;
    statut: string;
}

export default function BacklogPage() {
    const [items, setItems] = useState<BacklogItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState("all");

    useEffect(() => {
        fetch("/api/notion/backlog")
            .then((r) => r.json())
            .then((data) => { setItems(Array.isArray(data) ? data : []); setLoading(false); })
            .catch(() => setLoading(false));
    }, []);

    const filtered = filter === "all" ? items : items.filter((b) => b.plateforme === filter);
    const platforms = [...new Set(items.map((b) => b.plateforme))];

    const priorityColor: Record<string, string> = {
        Haute: "bg-red-100 text-red-700",
        Moyenne: "bg-amber-100 text-amber-700",
        Basse: "bg-green-100 text-green-700",
    };

    const statusColor: Record<string, string> = {
        "En attente": "bg-slate-100 text-slate-700",
        "En cours": "bg-blue-100 text-blue-700",
        Terminé: "bg-green-100 text-green-700",
    };

    if (loading) return <div className="flex items-center justify-center h-full"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-600"></div></div>;

    return (
        <div className="p-8">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-slate-900">📝 Backlog de Contenu</h1>
                <p className="text-slate-500 mt-2">Suggestions de posts et contenus à créer pour Anna</p>
            </div>

            <div className="flex gap-2 mb-6">
                <button onClick={() => setFilter("all")} className={`px-4 py-2 rounded-lg text-sm ${filter === "all" ? "bg-amber-600 text-white" : "bg-white text-slate-600 border border-slate-200"}`}>Tous</button>
                {platforms.map((p) => (
                    <button key={p} onClick={() => setFilter(p)} className={`px-4 py-2 rounded-lg text-sm ${filter === p ? "bg-amber-600 text-white" : "bg-white text-slate-600 border border-slate-200"}`}>{p}</button>
                ))}
            </div>

            {filtered.length === 0 ? (
                <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
                    <p className="text-slate-400 text-lg">Aucune suggestion disponible</p>
                    <p className="text-slate-400 text-sm mt-2">Les automatisations généreront des suggestions de contenu</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {filtered.map((b) => (
                        <div key={b.id} className="bg-white rounded-xl border border-slate-200 p-6 hover:shadow-md transition-shadow">
                            <div className="flex items-start justify-between">
                                <div>
                                    <h3 className="font-semibold text-slate-900">{b.title}</h3>
                                    <p className="text-sm text-slate-500 mt-1">{b.plateforme} • {b.typeContenu}</p>
                                </div>
                                <div className="flex gap-2">
                                    <span className={`text-xs px-3 py-1 rounded-full ${priorityColor[b.priorite] || "bg-slate-100 text-slate-600"}`}>{b.priorite}</span>
                                    <span className={`text-xs px-3 py-1 rounded-full ${statusColor[b.statut] || "bg-slate-100 text-slate-600"}`}>{b.statut}</span>
                                </div>
                            </div>
                            {b.sujet && (
                                <div className="mt-3 bg-violet-50 rounded-lg p-3">
                                    <p className="text-xs font-medium text-violet-600 mb-1">Sujet</p>
                                    <p className="text-sm text-violet-800">{b.sujet}</p>
                                </div>
                            )}
                            {b.angle && (
                                <div className="mt-3 bg-blue-50 rounded-lg p-3">
                                    <p className="text-xs font-medium text-blue-600 mb-1">Angle</p>
                                    <p className="text-sm text-blue-800">{b.angle}</p>
                                </div>
                            )}
                            {b.motsCles && (
                                <div className="mt-3 flex flex-wrap gap-1">
                                    {b.motsCles.split(",").map((kw, i) => (
                                        <span key={i} className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-full">{kw.trim()}</span>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}