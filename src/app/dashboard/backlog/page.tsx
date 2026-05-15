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
    suggestionScore?: number;
}

export default function BacklogPage() {
    const [items, setItems] = useState<BacklogItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState("all");

    const [prompt, setPrompt] = useState("");
    const [questions, setQuestions] = useState("");
    const [suggestLoading, setSuggestLoading] = useState(false);
    const [suggestions, setSuggestions] = useState<BacklogItem[]>([]);
    const [suggestMode, setSuggestMode] = useState(false);

    useEffect(() => {
        fetch("/api/notion/backlog")
            .then((r) => r.json())
            .then((data) => { setItems(Array.isArray(data) ? data : []); setLoading(false); })
            .catch(() => setLoading(false));
    }, []);

    const handleGenerate = async () => {
        setSuggestLoading(true);
        try {
            const res = await fetch("/api/notion/backlog", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ prompt, questions: questions || undefined }),
            });
            const data = await res.json();
            setSuggestions(Array.isArray(data.suggestions) ? data.suggestions : []);
            setSuggestMode(true);
        } catch {
            setSuggestions([]);
        } finally {
            setSuggestLoading(false);
        }
    };

    const displayItems = suggestMode ? suggestions : (filter === "all" ? items : items.filter((b) => b.plateforme === filter));
    const platforms = [...new Set(items.map((b) => b.plateforme))];

    const priorityColor: Record<string, string> = {
        Haute: "bg-rose-100 text-rose-700",
        Moyenne: "bg-mauve-100 text-mauve-700",
        Basse: "bg-brandgreen-100 text-brandgreen-700",
    };

    const statusColor: Record<string, string> = {
        "En attente": "bg-warm text-brandmuted",
        "En cours": "bg-mauve-100 text-mauve-700",
        Terminé: "bg-brandgreen-100 text-brandgreen-700",
    };

    if (loading) return <div className="flex items-center justify-center h-full"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-mauve"></div></div>;

    return (
        <div className="p-8">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-brandtext">📝 Backlog de Contenu</h1>
                <p className="text-brandmuted mt-2">Suggestions de posts et contenus à créer pour Anna</p>
            </div>

            <div className="bg-cream rounded-xl border border-warm p-6 mb-8">
                <h2 className="text-lg font-semibold text-brandtext mb-3">💡 Générer des suggestions personnalisées</h2>
                <div className="space-y-3">
                    <div>
                        <label className="block text-sm font-medium text-brandtext mb-1">Contexte et objectifs</label>
                        <textarea
                            className="w-full rounded-lg border border-warm bg-white p-3 text-sm text-brandtext placeholder-brandmuted focus:outline-none focus:ring-2 focus:ring-rose"
                            rows={3}
                            placeholder="Exemple : je veux des suggestions pour Instagram, format carrousel, 2 fois par semaine, pour améliorer la visibilité du site web..."
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-brandtext mb-1">Questions ou informations complémentaires (optionnel)</label>
                        <textarea
                            className="w-full rounded-lg border border-warm bg-white p-3 text-sm text-brandtext placeholder-brandmuted focus:outline-none focus:ring-2 focus:ring-rose"
                            rows={2}
                            placeholder="Exemple : cibler plutôt les parents d'adolescents, éviter les sujets trop sombres..."
                            value={questions}
                            onChange={(e) => setQuestions(e.target.value)}
                        />
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={handleGenerate}
                            disabled={suggestLoading}
                            className="px-5 py-2.5 rounded-lg bg-mauve text-cream text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
                        >
                            {suggestLoading ? "Génération en cours..." : "Générer des suggestions"}
                        </button>
                        {suggestMode && (
                            <button
                                onClick={() => setSuggestMode(false)}
                                className="px-4 py-2.5 rounded-lg border border-warm text-brandtext text-sm hover:bg-warm transition-colors"
                            >
                                Voir tout le backlog
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {!suggestMode && (
                <div className="flex gap-2 mb-6">
                    <button onClick={() => setFilter("all")} className={`px-4 py-2 rounded-lg text-sm ${filter === "all" ? "bg-mauve text-cream" : "bg-cream text-brandtext border border-warm"}`}>Tous</button>
                    {platforms.map((p) => (
                        <button key={p} onClick={() => setFilter(p)} className={`px-4 py-2 rounded-lg text-sm ${filter === p ? "bg-mauve text-cream" : "bg-cream text-brandtext border border-warm"}`}>{p}</button>
                    ))}
                </div>
            )}

            {displayItems.length === 0 ? (
                <div className="bg-cream rounded-xl border border-warm p-12 text-center">
                    <p className="text-brandmuted text-lg">Aucune suggestion disponible</p>
                    <p className="text-brandmuted text-sm mt-2">Les automatisations généreront des suggestions de contenu</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {displayItems.map((b) => (
                        <div key={b.id} className="bg-cream rounded-xl border border-warm p-6 hover:shadow-md transition-shadow">
                            <div className="flex items-start justify-between">
                                <div>
                                    <h3 className="font-semibold text-brandtext">{b.title}</h3>
                                    <p className="text-sm text-brandmuted mt-1">{b.plateforme} • {b.typeContenu}</p>
                                </div>
                                <div className="flex gap-2 items-center">
                                    {b.suggestionScore !== undefined && (
                                        <span className="text-xs px-3 py-1 rounded-full bg-rose-100 text-rose-700 font-medium">
                                            Score : {Math.round(b.suggestionScore)} %
                                        </span>
                                    )}
                                    <span className={`text-xs px-3 py-1 rounded-full ${priorityColor[b.priorite] || "bg-warm text-brandmuted"}`}>{b.priorite}</span>
                                    <span className={`text-xs px-3 py-1 rounded-full ${statusColor[b.statut] || "bg-warm text-brandmuted"}`}>{b.statut}</span>
                                </div>
                            </div>
                            {b.sujet && (
                                <div className="mt-3 bg-rose-50 rounded-lg p-3">
                                    <p className="text-xs font-medium text-rose mb-1">Sujet</p>
                                    <p className="text-sm text-brandtext">{b.sujet}</p>
                                </div>
                            )}
                            {b.angle && (
                                <div className="mt-3 bg-mauve-50 rounded-lg p-3">
                                    <p className="text-xs font-medium text-mauve mb-1">Angle</p>
                                    <p className="text-sm text-brandtext">{b.angle}</p>
                                </div>
                            )}
                            {b.motsCles && (
                                <div className="mt-3 flex flex-wrap gap-1">
                                    {b.motsCles.split(",").map((kw, i) => (
                                        <span key={i} className="text-xs bg-warm text-brandmuted px-2 py-1 rounded-full">{kw.trim()}</span>
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