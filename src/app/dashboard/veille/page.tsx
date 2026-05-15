"use client";

import { useEffect, useState } from "react";

interface VeilleItem {
    id: string;
    title: string;
    themesDominants: string;
    anglesNonExploites: string;
    formatsPerformants: string;
    motsCles: string;
    concurrents: string;
    recommandations: string;
    resume: string;
    dateVeille: string;
    statut: string;
    plateforme: string;
    pointsFortsConcurrents: string;
    produitsConcurrents: string;
    positionnementAnna: string;
    motsClesUtilises: string;
}

function extractUrls(text: string): { text: string; urls: Array<{ label: string; url: string }> } {
    const urlRegex = /https?:\/\/[^\s,)]+/g;
    const urls = Array.from(text.matchAll(urlRegex)).map((m) => ({
        label: m[0].replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, ""),
        url: m[0],
    }));
    return { text: text.replace(urlRegex, "").replace(/,\s*$/, "").trim(), urls };
}

function Section({ title, content, color }: { title: string; content: string; color: string }) {
    if (!content) return null;
    const { text, urls } = extractUrls(content);
    return (
        <div className={`rounded-lg p-4 ${color}`}>
            <p className="text-xs font-semibold mb-1 opacity-80">{title}</p>
            {text && <p className="text-sm text-brandtext whitespace-pre-line">{text}</p>}
            {urls.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                    {urls.map((u, i) => (
                        <a
                            key={i}
                            href={u.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs px-2 py-1 rounded bg-white/50 text-mauve hover:bg-white/80 transition-colors"
                        >
                            {u.label} ↗
                        </a>
                    ))}
                </div>
            )}
        </div>
    );
}

function StatutBadge({ statut }: { statut: string }) {
    const isTermine = statut?.toLowerCase().includes("termin");
    return (
        <span className={`text-xs px-3 py-1 rounded-full ${isTermine ? "bg-brandgreen/20 text-brandgreen" : "bg-rose/20 text-rose"}`}>
            {statut || "En cours"}
        </span>
    );
}

export default function VeillePage() {
    const [items, setItems] = useState<VeilleItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [filter, setFilter] = useState("all");
    const [prompt, setPrompt] = useState("");
    const [searching, setSearching] = useState(false);
    const [inProgress, setInProgress] = useState(false);
    const [statusMessage, setStatusMessage] = useState("");
    const [selectedId, setSelectedId] = useState<string | null>(null);

    const loadData = async () => {
        setLoading(true);
        try {
            const r = await fetch("/api/notion/veille");
            if (!r.ok) throw new Error("Erreur " + r.status);
            const data = await r.json();
            setItems(Array.isArray(data) ? data : []);
        } catch (e: any) {
            setError(e.message || "Erreur");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadData(); }, []);

    const handleSearch = async () => {
        setSearching(true);
        setInProgress(false);
        setStatusMessage("");
        try {
            const r = await fetch("/api/notion/veille", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ prompt }),
            });
            const data = await r.json();
            if (data.error) throw new Error(data.error);
            setInProgress(true);
            setStatusMessage(data.message || "Veille lancée via N8N");
            if (data.keywords?.length) {
                setStatusMessage((prev) => prev + ` — ${data.keywords.length} mots-clés utilisés`);
            }
            setTimeout(() => {
                loadData();
                setInProgress(false);
            }, 5000);
        } catch (e: any) {
            setError(e.message || "Erreur lors de la recherche");
        } finally {
            setSearching(false);
        }
    };

    const filtered = filter === "all" ? items : items.filter((v) =>
        v.plateforme?.toLowerCase().includes(filter.toLowerCase())
    );
    const platforms = [...new Set(items.map((v) => v.plateforme).filter(Boolean))];
    const selected = selectedId ? items.find((v) => v.id === selectedId) : null;

    if (loading) return <div className="p-8 text-brandmuted">Chargement…</div>;
    if (error) return <div className="p-8 text-rose">Erreur : {error}</div>;

    return (
        <div className="p-8 bg-cream min-h-screen">
            <h1 className="text-2xl font-bold text-brandtext mb-1">👁️ Veille Concurrence</h1>
            <p className="text-sm text-brandmuted mb-6">
                Analyses des concurrents et opportunités identifiées à partir des mots-clés de vos analyses.
            </p>

            {/* Barre de recherche */}
            <div className="mb-6 bg-white rounded-xl border border-warm p-4">
                <div className="flex flex-col md:flex-row gap-3">
                    <input
                        type="text"
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        placeholder="Décrivez ce que vous cherchez (ex: stratégie Instagram, contenu vidéo…)"
                        className="flex-1 px-4 py-2 rounded-lg border border-warm bg-cream text-brandtext placeholder:text-brandmuted/60 focus:outline-none focus:ring-2 focus:ring-mauve"
                        onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                    />
                    <button
                        onClick={handleSearch}
                        disabled={searching}
                        className="px-6 py-2 bg-mauve text-cream rounded-lg hover:bg-mauve-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {searching ? "Lancement…" : "🔍 Lancer la veille"}
                    </button>
                </div>
                <p className="text-xs text-brandmuted mt-2">
                    Les mots-clés de vos dernières analyses seront automatiquement utilisés pour la recherche.
                </p>
            </div>

            {inProgress && (
                <div className="mb-6 bg-mauve/10 rounded-xl border border-mauve/30 p-6 text-center animate-pulse">
                    <p className="text-mauve font-medium text-lg">⏳ Veille en cours…</p>
                    <p className="text-brandmuted text-sm mt-1">{statusMessage}</p>
                    <p className="text-brandmuted text-xs mt-2">Les résultats apparaîtront dans Notion et se rafraîchiront automatiquement.</p>
                </div>
            )}

            {/* Filtres plateforme */}
            <div className="flex gap-2 mb-6 flex-wrap">
                <button onClick={() => setFilter("all")} className={`px-4 py-2 rounded-lg text-sm transition-colors ${filter === "all" ? "bg-mauve text-cream" : "bg-white text-brandmuted border border-warm hover:bg-warm"}`}>
                    Toutes
                </button>
                {platforms.map((p) => (
                    <button key={p} onClick={() => setFilter(p)} className={`px-4 py-2 rounded-lg text-sm transition-colors ${filter === p ? "bg-mauve text-cream" : "bg-white text-brandmuted border border-warm hover:bg-warm"}`}>
                        {p}
                    </button>
                ))}
            </div>

            {!searching && !inProgress && filtered.length === 0 ? (
                <div className="bg-white rounded-xl border border-warm p-12 text-center">
                    <p className="text-brandmuted text-lg font-medium">Aucune donnée de veille disponible</p>
                    <p className="text-brandmuted text-sm mt-2 mb-6">Lancez une veille pour analyser vos concurrents.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Liste */}
                    <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-2">
                        {filtered.map((v) => (
                            <button
                                key={v.id}
                                onClick={() => setSelectedId(v.id)}
                                className={`w-full text-left bg-white rounded-xl border p-4 transition-shadow hover:shadow-md ${
                                    selectedId === v.id ? "border-mauve shadow-md" : "border-warm"
                                }`}
                            >
                                <div className="flex items-start justify-between">
                                    <div className="min-w-0 flex-1">
                                        <h3 className="font-semibold text-brandtext truncate">{v.title || "Veille sans titre"}</h3>
                                        <p className="text-xs text-brandmuted mt-1">
                                            {v.plateforme}{v.dateVeille ? ` • ${v.dateVeille}` : ""}
                                        </p>
                                    </div>
                                    <StatutBadge statut={v.statut} />
                                </div>
                                {v.motsClesUtilises && (
                                    <div className="mt-2 flex flex-wrap gap-1">
                                        {v.motsClesUtilises.split(",").slice(0, 5).map((kw, i) => (
                                            <span key={i} className="text-[10px] bg-mauve/10 text-mauve px-2 py-0.5 rounded-full">
                                                {kw.trim()}
                                            </span>
                                        ))}
                                        {v.motsClesUtilises.split(",").length > 5 && (
                                            <span className="text-[10px] text-brandmuted">+{v.motsClesUtilises.split(",").length - 5}</span>
                                        )}
                                    </div>
                                )}
                                {v.resume && (
                                    <p className="text-xs text-brandmuted mt-2 line-clamp-2">{v.resume}</p>
                                )}
                            </button>
                        ))}
                    </div>

                    {/* Détail */}
                    <div className="bg-white rounded-xl border border-warm p-6 sticky top-8">
                        {!selected ? (
                            <div className="text-center text-brandmuted py-12">
                                <p className="text-lg">← Sélectionnez une veille</p>
                                <p className="text-sm mt-2">Cliquez sur un élément pour voir les détails</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <h2 className="text-xl font-bold text-brandtext">{selected.title || "Veille sans titre"}</h2>
                                        <p className="text-sm text-brandmuted mt-1">
                                            {selected.plateforme}{selected.dateVeille ? ` • ${selected.dateVeille}` : ""}
                                        </p>
                                    </div>
                                    <StatutBadge statut={selected.statut} />
                                </div>

                                {selected.motsClesUtilises && (
                                    <div className="bg-cream rounded-lg p-3">
                                        <p className="text-xs font-semibold text-brandmuted mb-2">🔑 Mots-clés utilisés</p>
                                        <div className="flex flex-wrap gap-1">
                                            {selected.motsClesUtilises.split(",").map((kw, i) => (
                                                <span key={i} className="text-xs bg-mauve/15 text-mauve px-2 py-1 rounded-full">
                                                    {kw.trim()}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <Section title="📋 Résumé" content={selected.resume} color="bg-cream" />
                                <Section title="🎯 Thèmes dominants" content={selected.themesDominants} color="bg-mauve/10" />
                                <Section title="👥 Concurrents" content={selected.concurrents} color="bg-white border border-warm" />
                                <Section title="💪 Points forts concurrents" content={selected.pointsFortsConcurrents} color="bg-brandgreen/10" />
                                <Section title="📦 Produits concurrents" content={selected.produitsConcurrents} color="bg-rose/10" />
                                <Section title="📊 Positionnement Anna" content={selected.positionnementAnna} color="bg-mauve/10" />
                                <Section title="💡 Angles non exploités" content={selected.anglesNonExploites} color="bg-brandgreen/10" />
                                <Section title="🎬 Formats performants" content={selected.formatsPerformants} color="bg-rose/10" />
                                <Section title="🔑 Mots-clés opportunités" content={selected.motsCles} color="bg-cream" />
                                <Section title="✅ Recommandations" content={selected.recommandations} color="bg-mauve/10" />
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}