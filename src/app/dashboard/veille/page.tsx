"use client";

import { useEffect, useState } from "react";

interface VeilleItem {
    id: string;
    title: string;
    concurrent: string;
    plateforme: string;
    typeContenu: string;
    performance: string;
    pointsForts: string;
    lecons: string;
    statut: string;
}

export default function VeillePage() {
    const [items, setItems] = useState<VeilleItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState("all");

    useEffect(() => {
        fetch("/api/notion/veille")
            .then((r) => r.json())
            .then((data) => { setItems(Array.isArray(data) ? data : []); setLoading(false); })
            .catch(() => setLoading(false));
    }, []);

    const filtered = filter === "all" ? items : items.filter((v) => v.plateforme === filter);
    const platforms = [...new Set(items.map((v) => v.plateforme))];

    if (loading) return <div className="flex items-center justify-center h-full"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-600"></div></div>;

    return (
        <div className="p-8">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-slate-900">👁️ Veille Concurrence</h1>
                <p className="text-slate-500 mt-2">Analyses des contenus concurrents et opportunités identifiées</p>
            </div>

            <div className="flex gap-2 mb-6">
                <button onClick={() => setFilter("all")} className={`px-4 py-2 rounded-lg text-sm ${filter === "all" ? "bg-blue-600 text-white" : "bg-white text-slate-600 border border-slate-200"}`}>Toutes</button>
                {platforms.map((p) => (
                    <button key={p} onClick={() => setFilter(p)} className={`px-4 py-2 rounded-lg text-sm ${filter === p ? "bg-blue-600 text-white" : "bg-white text-slate-600 border border-slate-200"}`}>{p}</button>
                ))}
            </div>

            {filtered.length === 0 ? (
                <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
                    <p className="text-slate-400 text-lg">Aucune donnée de veille disponible</p>
                    <p className="text-slate-400 text-sm mt-2">Les automatisations rempliront cette section</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {filtered.map((v) => (
                        <div key={v.id} className="bg-white rounded-xl border border-slate-200 p-6 hover:shadow-md transition-shadow">
                            <div className="flex items-start justify-between">
                                <div>
                                    <h3 className="font-semibold text-slate-900">{v.title}</h3>
                                    <p className="text-sm text-slate-500 mt-1">{v.concurrent} • {v.plateforme} • {v.typeContenu}</p>
                                </div>
                                <span className={`text-xs px-3 py-1 rounded-full ${v.statut === "Analysé" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>{v.statut}</span>
                            </div>
                            <div className="flex gap-4 mt-4">
                                {v.performance && (
                                    <div className="bg-blue-50 px-3 py-2 rounded-lg">
                                        <p className="text-xs text-blue-600">Performance</p>
                                        <p className="font-bold text-blue-700 text-sm">{v.performance}</p>
                                    </div>
                                )}
                            </div>
                            {v.pointsForts && (
                                <div className="mt-4 bg-green-50 rounded-lg p-4">
                                    <p className="text-xs font-medium text-green-600 mb-1">Points forts</p>
                                    <p className="text-sm text-green-800">{v.pointsForts}</p>
                                </div>
                            )}
                            {v.lecons && (
                                <div className="mt-3 bg-amber-50 rounded-lg p-4">
                                    <p className="text-xs font-medium text-amber-600 mb-1">Leçons pour Anna</p>
                                    <p className="text-sm text-amber-800">{v.lecons}</p>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}