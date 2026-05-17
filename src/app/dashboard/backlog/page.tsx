"use client";

import { useEffect, useState } from "react";

interface BacklogItem {
    id: string;
    title: string;
    plateforme: string;
    format: string;
    hook: string;
    problemeCible: string;
    messageCle: string;
    solution: string;
    cta: string;
    hashtags: string;
    priorite: string;
    statut: string;
    dateGeneration: string;
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
    const [inProgress, setInProgress] = useState(false);
    const [statusMessage, setStatusMessage] = useState("");
    const [expandedId, setExpandedId] = useState<string | null>(null);

    useEffect(() => {
        fetch("/api/notion/backlog")
            .then((r) => r.json())
            .then((data) => { setItems(Array.isArray(data) ? data : []); setLoading(false); })
            .catch(() => setLoading(false));
    }, []);

    const handleGenerate = async () => {
        setSuggestLoading(true);
        setInProgress(false);
        setStatusMessage("");
        try {
            const res = await fetch("/api/notion/backlog", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ prompt, questions: questions || undefined }),
            });
            const data = await res.json();

            if (data.status === "En cours") {
                setInProgress(true);
                setStatusMessage("⏳ Analyse en cours… Les suggestions sont en cours de génération via l'automatisation. La liste sera rafraîchie dans quelques secondes.");
                setTimeout(() => { window.location.reload(); }, 4000);
                return;
            }

            setSuggestions(Array.isArray(data.suggestions) ? data.suggestions : []);
            setSuggestMode(true);
        } catch {
            setStatusMessage("Une erreur est survenue lors de la génération.");
        } finally {
            setSuggestLoading(false);
        }
    };

    const displayItems = suggestMode
        ? (Array.isArray(suggestions) ? suggestions : [])
        : (filter === "all" ? items : items.filter((b) => b.plateforme === filter));
    const platforms = [...new Set(items.map((b) => b.plateforme).filter(Boolean))];

    const priorityColor: Record<string, string> = {
        Haute: "bg-rose-100 text-rose-700",
        Moyenne: "bg-mauve-100 text-mauve-700",
        Basse: "bg-brandgreen-100 text-brandgreen-700",
    };

    const statusColor: Record<string, string> = {
        "En attente": "bg-warm text-brandmuted",
        Idee: "bg-mauve-100 text-mauve-700",
        "En cours": "bg-mauve-100 text-mauve-700",
        Termine: "bg-brandgreen-100 text-brandgreen-700",
        Terminé: "bg-brandgreen-100 text-brandgreen-700",
    };

    if (loading) return <div className="flex items-center justify-center h-full"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-mauve"></div></div>;

    return (
        <div className="p-8">
            <div className="mb-8 flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-brandtext">📝 Backlog de Contenu</h1>
                    <p className="text-brandmuted mt-2">Suggestions de posts et contenus à créer pour Anna</p>
                </div>
                <button
                    onClick={() => { setLoading(true); fetch("/api/notion/backlog").then((r) => r.json()).then((data) => { setItems(Array.isArray(data) ? data : []); setLoading(false); }).catch(() => setLoading(false)); }}
                    className="px-4 py-2 rounded-lg border border-warm text-brandtext text-sm hover:bg-warm transition-colors"
                >
                    🔄 Rafraîchir
                </button>
            </div>

            <div className="bg-cream rounded-xl border border-warm p-6 mb-8">
                <h2 className="text-lg font-semibold text-brandtext mb-3">💡 Générer des suggestions personnalisées</h2>
                <div className="space-y-3">
                    <div>
                        <label className="block text-sm font-medium text-brandtext mb-1">Contexte et objectifs</label>
                        <textarea
                            className="w-full rounded-lg border border-warm bg-white p-3 text-sm text-brandtext placeholder-brandmuted focus:outline-none focus:ring-2 focus:ring-rose"
                            rows={3}
                            placeholder="Exemple : je veux des suggestions pour Instagram, format carrousel, 2 fois par semaine..."
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-brandtext mb-1">Questions ou informations complémentaires (optionnel)</label>
                        <textarea
                            className="w-full rounded-lg border border-warm bg-white p-3 text-sm text-brandtext placeholder-brandmuted focus:outline-none focus:ring-2 focus:ring-rose"
                            rows={2}
                            placeholder="Exemple : cibler plutôt les parents d'adolescents..."
                            value={questions}
                            onChange={(e) => setQuestions(e.target.value)}
                        />
                    </div>
                    {inProgress && statusMessage && (
                        <div className="rounded-lg border border-mauve bg-mauve-50 p-3 text-sm text-mauve animate-pulse">
                            {statusMessage}
                        </div>
                    )}
                    <div className="flex items-center gap-3">
                        <button
                            onClick={handleGenerate}
                            disabled={suggestLoading || inProgress}
                            className="px-5 py-2.5 rounded-lg bg-mauve text-cream text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
                        >
                            {suggestLoading ? "Génération en cours..." : "Générer des suggestions"}
                        </button>
                        {suggestMode && !inProgress && (
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

            {inProgress ? (
                <div className="bg-cream rounded-xl border border-warm p-12 text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-mauve mx-auto mb-4"></div>
                    <p className="text-brandmuted text-lg">Analyse en cours…</p>
                    <p className="text-brandmuted text-sm mt-2">Le workflow N8N génère des suggestions. La page se rafraîchira automatiquement.</p>
                </div>
            ) : displayItems.length === 0 ? (
                <div className="bg-cream rounded-xl border border-warm p-12 text-center">
                    <p className="text-brandmuted text-lg">Aucune suggestion disponible</p>
                    <p className="text-brandmuted text-sm mt-2">Les automatisations généreront des suggestions de contenu</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {displayItems.map((b) => {
                        const isExpanded = expandedId === b.id;
                        return (
                            <div
                                key={b.id}
                                onClick={() => setExpandedId(isExpanded ? null : b.id)}
                                className="bg-cream rounded-xl border border-warm hover:shadow-md transition-all cursor-pointer select-none"
                            >
                                <div className="flex items-start justify-between p-6 pb-4">
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-semibold text-brandtext">{b.title || "Post sans titre"}</h3>
                                        <p className="text-sm text-brandmuted mt-1">{b.plateforme}{b.format ? ` • ${b.format}` : ""}{b.dateGeneration ? ` • ${b.dateGeneration}` : ""}</p>
                                    </div>
                                    <div className="flex gap-2 items-center flex-shrink-0 ml-4">
                                        {b.suggestionScore !== undefined && (
                                            <span className="text-xs px-3 py-1 rounded-full bg-rose-100 text-rose-700 font-medium">
                                                Score : {Math.round(b.suggestionScore)} %
                                            </span>
                                        )}
                                        <span className={`text-xs px-3 py-1 rounded-full ${priorityColor[b.priorite] || "bg-warm text-brandmuted"}`}>{b.priorite || "Moyenne"}</span>
                                        <span className={`text-xs px-3 py-1 rounded-full ${statusColor[b.statut] || "bg-warm text-brandmuted"}`}>{b.statut || "Idée"}</span>
                                        <svg className={`w-5 h-5 text-brandmuted transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                                    </div>
                                </div>

                                {isExpanded && (
                                    <div className="px-6 pb-6 pt-0">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                            {b.hook && (
                                                <div className="bg-rose-50 rounded-lg p-3">
                                                    <p className="text-xs font-semibold text-rose mb-1">🎯 Hook</p>
                                                    <p className="text-sm text-brandtext">{b.hook}</p>
                                                </div>
                                            )}
                                            {b.problemeCible && (
                                                <div className="bg-rose-50 rounded-lg p-3">
                                                    <p className="text-xs font-semibold text-rose mb-1">😰 Problème cible</p>
                                                    <p className="text-sm text-brandtext">{b.problemeCible}</p>
                                                </div>
                                            )}
                                            {b.messageCle && (
                                                <div className="bg-mauve-50 rounded-lg p-3">
                                                    <p className="text-xs font-semibold text-mauve mb-1">💡 Message clé</p>
                                                    <p className="text-sm text-brandtext">{b.messageCle}</p>
                                                </div>
                                            )}
                                            {b.solution && (
                                                <div className="bg-brandgreen/10 rounded-lg p-3">
                                                    <p className="text-xs font-semibold text-brandgreen mb-1">✅ Solution</p>
                                                    <p className="text-sm text-brandtext">{b.solution}</p>
                                                </div>
                                            )}
                                            {b.cta && (
                                                <div className="bg-mauve-50 rounded-lg p-3">
                                                    <p className="text-xs font-semibold text-mauve mb-1">👉 CTA</p>
                                                    <p className="text-sm text-brandtext">{b.cta}</p>
                                                </div>
                                            )}
                                        </div>

                                        {b.hashtags && (
                                            <div className="mt-3 flex flex-wrap gap-1">
                                                {b.hashtags.split(/[,\s]+/).filter(Boolean).map((kw, i) => (
                                                    <span key={i} className="text-xs bg-warm text-brandmuted px-2 py-1 rounded-full">{kw.trim()}</span>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}