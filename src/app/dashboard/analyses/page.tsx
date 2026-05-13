"use client";

import { useEffect, useState } from "react";

interface Analysis {
    id: string;
    title: string;
    plateforme: string;
    scorePertinence: string;
    scoreEngagement: string;
    recommandations: string;
    statut: string;
    dateAnalyse: string;
}

export default function AnalysesPage() {
    const [analyses, setAnalyses] = useState<Analysis[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState("all");

    useEffect(() => {
        fetch("/api/notion/analyses")
            .then((r) => r.json())
            .then((data) => { setAnalyses(Array.isArray(data) ? data : []); setLoading(false); })
            .catch(() => setLoading(false));
    }, []);

    const filtered = filter === "all" ? analyses : analyses.filter((a) => a.plateforme === filter);
    const platforms = [...new Set(analyses.map((a) => a.plateforme))];

    if (loading) {
        return <div className="flex items-center justify-center h-full"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-600"></div></div>;
    }

    return (
        <div className="p-8">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-slate-900">🔍 Analyses de Contenu</h1>
                <p className="text-slate-500 mt-2">Résultats des analyses de pertinence du contenu d'Anna</p>
            </div>

            <div className="flex gap-2 mb-6">
                <button onClick={() => setFilter("all")} className={`px-4 py-2 rounded-lg text-sm ${filter === "all" ? "bg-violet-600 text-white" : "bg-white text-slate-600 border border-slate-200"}`}>Toutes</button>
                {platforms.map((p) => (
                    <button key={p} onClick={() => setFilter(p)} className={`px-4 py-2 rounded-lg text-sm ${filter === p ? "bg-violet-600 text-white" : "bg-white text-slate-600 border border-slate-200"}`}>{p}</button>
                ))}
            </div>

            {filtered.length === 0 ? (
                <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
                    <p className="text-slate-400 text-lg">Aucune analyse disponible pour le moment</p>
                    <p className="text-slate-400 text-sm mt-2">Les automatisations rempliront cette section automatiquement</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {filtered.map((a) => (
                        <div key={a.id} className="bg-white rounded-xl border border-slate-200 p-6 hover:shadow-md transition-shadow">
                            <div className="flex items-start justify-between">
                                <div>
                                    <h3 className="font-semibold text-slate-900">{a.title}</h3>
                                    <p className="text-sm text-slate-500 mt-1">{a.plateforme} • {a.dateAnalyse}</p>
                                </div>
                                <span className={`text-xs px-3 py-1 rounded-full ${a.statut === "Terminé" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>{a.statut}</span>
                            </div>
                            <div className="flex gap-4 mt-4">
                                <div className="bg-violet-50 px-3 py-2 rounded-lg">
                                    <p className="text-xs text-violet-600">Pertinence</p>
                                    <p className="font-bold text-violet-700">{a.scorePertinence || "—"}</p>
                                </div>
                                <div className="bg-blue-50 px-3 py-2 rounded-lg">
                                    <p className="text-xs text-blue-600">Engagement</p>
                                    <p className="font-bold text-blue-700">{a.scoreEngagement || "—"}</p>
                                </div>
                            </div>
                            {a.recommandations && (
                                <div className="mt-4 bg-slate-50 rounded-lg p-4">
                                    <p className="text-xs font-medium text-slate-500 mb-1">Recommandations</p>
                                    <p className="text-sm text-slate-700">{a.recommandations}</p>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}