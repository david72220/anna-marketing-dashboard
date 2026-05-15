"use client";

import { useEffect, useState } from "react";

interface Analysis {
    id: string;
    title: string;
    plateforme: string;
    scoreGlobal: string;
    scoreHook: string;
    scoreCTA: string;
    scoreSEO: string;
    scoreEngagement: string;
    pointsForts: string;
    axesAmelioration: string;
    hookSuggere: string;
    hashtags: string;
    ecosystemeMotsCles: string;
    resume: string;
    statut: string;
    dateAnalyse: string;
}

const networks = [
    { id: "youtube", label: "YouTube", icon: "🎥" },
    { id: "instagram", label: "Instagram", icon: "📸" },
    { id: "facebook", label: "Facebook", icon: "📘" },
    { id: "tiktok", label: "TikTok", icon: "🎵" },
];

function ScoreBadge({ label, value, color }: { label: string; value: string; color: string }) {
    const num = parseFloat(value);
    const display = isNaN(num) ? value || "—" : `${Math.round(num)}/10`;
    return (
        <div className={`${color} px-3 py-2 rounded-lg text-center min-w-[80px]`}>
            <p className="text-[11px] font-medium opacity-70">{label}</p>
            <p className="font-bold text-brandtext text-sm">{display}</p>
        </div>
    );
}

function Section({ label, content }: { label: string; content: string }) {
    if (!content) return null;
    return (
        <div className="mt-3 bg-cream rounded-lg p-3">
            <p className="text-[11px] font-medium text-brandmuted mb-1">{label}</p>
            <p className="text-sm text-brandtext whitespace-pre-line">{content}</p>
        </div>
    );
}

export default function AnalysesPage() {
    const [analyses, setAnalyses] = useState<Analysis[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState("all");
    const [selectedId, setSelectedId] = useState<string | null>(null);

    const [selectedNetworks, setSelectedNetworks] = useState<string[]>([]);
    const [prompt, setPrompt] = useState("");
    const [launching, setLaunching] = useState(false);
    const [launchMessage, setLaunchMessage] = useState<string | null>(null);
    const [inProgress, setInProgress] = useState(false);

    useEffect(() => {
        fetch("/api/notion/analyses")
            .then((r) => r.json())
            .then((data) => { setAnalyses(Array.isArray(data) ? data : []); setLoading(false); })
            .catch(() => setLoading(false));
    }, []);

    const toggleNetwork = (id: string) => {
        setSelectedNetworks((prev) =>
            prev.includes(id) ? prev.filter((n) => n !== id) : [...prev, id]
        );
    };

    const handleLaunch = async () => {
        if (selectedNetworks.length === 0) {
            setLaunchMessage("Veuillez sélectionner au moins un réseau.");
            return;
        }
        setLaunching(true);
        setLaunchMessage(null);
        setInProgress(true);
        try {
            const res = await fetch("/api/notion/analyses", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    networks: selectedNetworks,
                    prompt: prompt.trim() || undefined,
                }),
            });
            if (!res.ok) throw new Error("Erreur " + res.status);
            setLaunchMessage("Analyse lancée avec succès ! Les résultats apparaîtront sous peu.");
            setSelectedNetworks([]);
            setPrompt("");
            setTimeout(() => {
                fetch("/api/notion/analyses")
                    .then((r) => r.json())
                    .then((data) => setAnalyses(Array.isArray(data) ? data : []))
                    .catch(() => { });
            }, 1500);
        } catch (e: any) {
            setLaunchMessage("Erreur lors du lancement : " + (e.message || "inconnue"));
        } finally {
            setLaunching(false);
            setTimeout(() => setInProgress(false), 4000);
        }
    };

    const filtered = filter === "all" ? analyses : analyses.filter((a) => a.plateforme.toLowerCase().includes(filter.toLowerCase()));
    const platforms = [...new Set(analyses.map((a) => a.plateforme))];

    if (loading) {
        return <div className="flex items-center justify-center h-full"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-mauve"></div></div>;
    }

    const selected = selectedId ? analyses.find((a) => a.id === selectedId) : null;

    return (
        <div className="p-8">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-brandtext">🔍 Analyses de Contenu</h1>
                <p className="text-brandmuted mt-2">Résultats des analyses de pertinence du contenu d'Anna</p>
            </div>

            {/* New analysis form */}
            <div className="bg-cream rounded-xl border border-warm p-6 mb-8">
                <h2 className="text-lg font-semibold text-brandtext mb-4">Lancer une nouvelle analyse</h2>
                <div className="mb-4">
                    <p className="text-sm font-medium text-brandtext mb-2">Réseaux à analyser</p>
                    <div className="flex flex-wrap gap-3">
                        {networks.map((n) => {
                            const checked = selectedNetworks.includes(n.id);
                            return (
                                <label
                                    key={n.id}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-lg border cursor-pointer transition-colors ${checked
                                        ? "bg-mauve text-cream border-mauve"
                                        : "bg-white text-brandtext border-warm hover:border-mauve"
                                        }`}
                                >
                                    <input
                                        type="checkbox"
                                        className="hidden"
                                        checked={checked}
                                        onChange={() => toggleNetwork(n.id)}
                                    />
                                    <span>{n.icon}</span>
                                    <span className="text-sm">{n.label}</span>
                                </label>
                            );
                        })}
                    </div>
                </div>
                <div className="mb-4">
                    <label className="block text-sm font-medium text-brandtext mb-1">
                        Contexte / consigne (optionnel)
                    </label>
                    <textarea
                        className="w-full rounded-lg border border-warm bg-white px-4 py-3 text-sm text-brandtext placeholder-brandmuted/50 focus:outline-none focus:ring-2 focus:ring-mauve"
                        rows={2}
                        placeholder="ex: Focalise-toi sur le contenu vidéo pour parents d'adolescents..."
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                    />
                </div>
                <div className="flex items-center gap-4">
                    <button
                        onClick={handleLaunch}
                        disabled={launching}
                        className="px-6 py-2 rounded-lg bg-mauve text-cream text-sm font-medium hover:bg-mauve-dark transition-colors disabled:opacity-50"
                    >
                        {launching ? "Lancement…" : "🚀 Lancer l'analyse"}
                    </button>
                    {inProgress && (
                        <span className="text-sm text-mauve animate-pulse">⏳ Analyse en cours…</span>
                    )}
                    {launchMessage && (
                        <span className={`text-sm ${launchMessage.includes("succès") ? "text-brandgreen" : "text-rose"}`}>
                            {launchMessage}
                        </span>
                    )}
                </div>
            </div>

            {/* Filters */}
            <div className="flex gap-2 mb-6">
                <button onClick={() => setFilter("all")} className={`px-4 py-2 rounded-lg text-sm ${filter === "all" ? "bg-mauve text-cream" : "bg-white text-brandtext border border-warm"}`}>Toutes</button>
                {platforms.map((p) => (
                    <button key={p} onClick={() => setFilter(p)} className={`px-4 py-2 rounded-lg text-sm ${filter === p ? "bg-mauve text-cream" : "bg-white text-brandtext border border-warm"}`}>{p}</button>
                ))}
            </div>

            {filtered.length === 0 ? (
                <div className="bg-white rounded-xl border border-warm p-12 text-center">
                    <p className="text-brandmuted text-lg">Aucune analyse disponible pour le moment</p>
                    <p className="text-brandmuted text-sm mt-2">Les automatisations rempliront cette section automatiquement</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left: analysis list */}
                    <div className="lg:col-span-1 space-y-3">
                        {filtered.map((a) => (
                            <button
                                key={a.id}
                                onClick={() => setSelectedId(a.id)}
                                className={`w-full text-left bg-white rounded-xl border p-4 transition-shadow hover:shadow-md ${selectedId === a.id ? "border-mauve ring-2 ring-mauve/30" : "border-warm"}`}
                            >
                                <h3 className="font-semibold text-brandtext text-sm">{a.title}</h3>
                                <p className="text-xs text-brandmuted mt-1">{a.plateforme} • {a.dateAnalyse}</p>
                                <div className="flex items-center gap-2 mt-2">
                                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${a.statut === "Terminé" ? "bg-brandgreen/10 text-brandgreen" : "bg-rose/10 text-rose"}`}>{a.statut}</span>
                                    {a.scoreGlobal && (
                                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-mauve/10 text-mauve font-medium">{Math.round(parseFloat(a.scoreGlobal))}/10</span>
                                    )}
                                </div>
                            </button>
                        ))}
                    </div>

                    {/* Right: detail view */}
                    <div className="lg:col-span-2">
                        {selected ? (
                            <div className="bg-white rounded-xl border border-warm p-6">
                                <div className="flex items-start justify-between mb-4">
                                    <div>
                                        <h2 className="text-xl font-bold text-brandtext">{selected.title}</h2>
                                        <p className="text-sm text-brandmuted mt-1">{selected.plateforme} • {selected.dateAnalyse}</p>
                                    </div>
                                    <span className={`text-xs px-3 py-1 rounded-full ${selected.statut === "Terminé" ? "bg-brandgreen/10 text-brandgreen" : "bg-rose/10 text-rose"}`}>{selected.statut}</span>
                                </div>

                                {selected.resume && <Section label="Résumé" content={selected.resume} />}

                                {/* Scores */}
                                <div className="flex flex-wrap gap-2 mt-4">
                                    <ScoreBadge label="Global" value={selected.scoreGlobal} color="bg-mauve/10" />
                                    <ScoreBadge label="Hook" value={selected.scoreHook} color="bg-rose/10" />
                                    <ScoreBadge label="CTA" value={selected.scoreCTA} color="bg-blue-100" />
                                    <ScoreBadge label="SEO" value={selected.scoreSEO} color="bg-green-50" />
                                    <ScoreBadge label="Engagement" value={selected.scoreEngagement} color="bg-amber-50" />
                                </div>

                                <Section label="Points Forts" content={selected.pointsForts} />
                                <Section label="Axes d'Amélioration" content={selected.axesAmelioration} />
                                <Section label="Hook Suggéré" content={selected.hookSuggere} />
                                <Section label="Hashtags" content={selected.hashtags} />
                                <Section label="Écosystème Mots-clés" content={selected.ecosystemeMotsCles} />
                            </div>
                        ) : (
                            <div className="bg-white rounded-xl border border-warm p-12 text-center">
                                <p className="text-brandmuted">Sélectionnez une analyse pour voir les détails</p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}