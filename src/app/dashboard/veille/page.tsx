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
    const [prompt, setPrompt] = useState("");
    const [searching, setSearching] = useState(false);

    const loadData = async () => {
        setLoading(true);
        try {
            const r = await fetch("/api/notion/veille");
            const data = await r.json();
            setItems(Array.isArray(data) ? data : []);
        } catch {
            setItems([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const handleSearch = async () => {
        setSearching(true);
        try {
            if (!prompt.trim()) {
                // Recherche automatique par mots-clés : recharge toutes les données
                const r = await fetch("/api/notion/veille");
                const data = await r.json();
                setItems(Array.isArray(data) ? data : []);
            } else {
                const r = await fetch("/api/notion/veille", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ prompt }),
                });
                const data = await r.json();
                setItems(Array.isArray(data) ? data : []);
            }
        } catch {
            // en cas d'erreur, garder les items actuels
        } finally {
            setSearching(false);
        }
    };

    const filtered = filter === "all" ? items : items.filter((v) => v.plateforme === filter);
    const platforms = [...new Set(items.map((v) => v.plateforme))];

    if (loading && !searching) return (
        <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-mauve"></div>
        </div>
    );

    return (
        <div className="p-8 bg-cream min-h-screen">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-brandtext">👁️ Veille Concurrence</h1>
                <p className="text-brandmuted mt-2">Analyses des contenus concurrents et opportunités identifiées</p>
            </div>

            {/* Barre de recherche par prompt */}
            <div className="mb-6 bg-white rounded-xl border border-warm p-4">
                <div className="flex flex-col md:flex-row gap-3">
                    <input
                        type="text"
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        placeholder="Décrivez ce que vous cherchez (ex: stratégie Instagram, contenu vidéo...)"
                        className="flex-1 px-4 py-2 rounded-lg border border-warm bg-cream text-brandtext placeholder:text-brandmuted/60 focus:outline-none focus:ring-2 focus:ring-mauve"
                    />
                    <button
                        onClick={handleSearch}
                        disabled={searching}
                        className="px-6 py-2 bg-mauve text-cream rounded-lg hover:bg-mauve/90 transition-colors disabled:opacity-50"
                    >
                        {searching ? "Recherche..." : "Rechercher"}
                    </button>
                </div>
                <p className="text-xs text-brandmuted mt-2">
                    Laissez vide pour une recherche automatique par mots-clés.
                </p>
            </div>

            <div className="flex gap-2 mb-6 flex-wrap">
                <button onClick={() => setFilter("all")} className={`px-4 py-2 rounded-lg text-sm transition-colors ${filter === "all" ? "bg-mauve text-cream" : "bg-white text-brandmuted border border-warm hover:bg-warm"}`}>Toutes</button>
                {platforms.map((p) => (
                    <button key={p} onClick={() => setFilter(p)} className={`px-4 py-2 rounded-lg text-sm transition-colors ${filter === p ? "bg-mauve text-cream" : "bg-white text-brandmuted border border-warm hover:bg-warm"}`}>{p}</button>
                ))}
            </div>

            {searching && (
                <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-mauve"></div>
                </div>
            )}

            {!searching && filtered.length === 0 ? (
                <div className="bg-white rounded-xl border border-warm p-12 text-center">
                    <p className="text-brandmuted text-lg">Aucune donnée de veille disponible</p>
                    <p className="text-brandmuted text-sm mt-2">Les automatisations rempliront cette section</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {filtered.map((v) => (
                        <div key={v.id} className="bg-white rounded-xl border border-warm p-6 hover:shadow-md transition-shadow">
                            <div className="flex items-start justify-between">
                                <div>
                                    <h3 className="font-semibold text-brandtext">{v.title}</h3>
                                    <p className="text-sm text-brandmuted mt-1">{v.concurrent} • {v.plateforme} • {v.typeContenu}</p>
                                </div>
                                <span className={`text-xs px-3 py-1 rounded-full ${v.statut === "Analysé" ? "bg-brandgreen/20 text-brandgreen" : "bg-rose/20 text-rose"}`}>{v.statut}</span>
                            </div>
                            <div className="flex gap-4 mt-4">
                                {v.performance && (
                                    <div className="bg-mauve/10 px-3 py-2 rounded-lg">
                                        <p className="text-xs text-mauve">Performance</p>
                                        <p className="font-bold text-mauve text-sm">{v.performance}</p>
                                    </div>
                                )}
                            </div>
                            {v.pointsForts && (
                                <div className="mt-4 bg-brandgreen/10 rounded-lg p-4">
                                    <p className="text-xs font-medium text-brandgreen mb-1">Points forts</p>
                                    <p className="text-sm text-brandgreen/90">{v.pointsForts}</p>
                                </div>
                            )}
                            {v.lecons && (
                                <div className="mt-3 bg-rose/10 rounded-lg p-4">
                                    <p className="text-xs font-medium text-rose mb-1">Leçons pour Anna</p>
                                    <p className="text-sm text-rose/90">{v.lecons}</p>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}