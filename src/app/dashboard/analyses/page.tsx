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

const networks = [
    { id: "youtube", label: "YouTube", icon: "🎥" },
    { id: "instagram", label: "Instagram", icon: "📸" },
    { id: "facebook", label: "Facebook", icon: "📘" },
    { id: "tiktok", label: "TikTok", icon: "🎵" },
];

export default function AnalysesPage() {
    const [analyses, setAnalyses] = useState<Analysis[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState("all");

    // New analysis form state
    const [selectedNetworks, setSelectedNetworks] = useState<string[]>([]);
    const [keywords, setKeywords] = useState("");
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
        const kwList = keywords
            .split(",")
            .map((k) => k.trim())
            .filter((k) => k.length > 0);
        if (kwList.length < 3) {
            setLaunchMessage("Veuillez saisir au moins 3 mots-clés (séparés par des virgules).");
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
                    keywords: kwList,
                    prompt: prompt.trim() || undefined,
                }),
            });
            if (!res.ok) throw new Error("Erreur " + res.status);
            setLaunchMessage("Analyse lancée avec succès ! Les résultats apparaîtront sous peu.");
            setSelectedNetworks([]);
            setKeywords("");
            setPrompt("");
            // Rafraîchir la liste après un court délai
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

    const filtered = filter === "all" ? analyses : analyses.filter((a) => a.plateforme === filter);
    const platforms = [...new Set(analyses.map((a) => a.plateforme))];

    if (loading) {
        return <div className="flex items-center justify-center h-full"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-mauve"></div></div>;
    }

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
                        Mots-clés (min. 3, séparés par des virgules)
                    </label>
                    <textarea
                        className="w-full rounded-lg border border-warm bg-white px-4 py-3 text-sm text-brandtext placeholder-brandmuted/50 focus:outline-none focus:ring-2 focus:ring-mauve"
                        rows={3}
                        placeholder="ex: anxiété enfant, confiance en soi ado, parentalité bienveillante, émotions, thérapie familiale..."
                        value={keywords}
                        onChange={(e) => setKeywords(e.target.value)}
                    />
                    <p className="text-xs text-brandmuted mt-1">
                        {keywords.split(",").filter((k) => k.trim().length > 0).length} mot(s)-clé(s) saisi(s)
                    </p>
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
                <div className="space-y-4">
                    {filtered.map((a) => (
                        <div key={a.id} className="bg-white rounded-xl border border-warm p-6 hover:shadow-md transition-shadow">
                            <div className="flex items-start justify-between">
                                <div>
                                    <h3 className="font-semibold text-brandtext">{a.title}</h3>
                                    <p className="text-sm text-brandmuted mt-1">{a.plateforme} • {a.dateAnalyse}</p>
                                </div>
                                <span className={`text-xs px-3 py-1 rounded-full ${a.statut === "Terminé" ? "bg-brandgreen/10 text-brandgreen" : "bg-rose/10 text-rose"}`}>{a.statut}</span>
                            </div>
                            <div className="flex gap-4 mt-4">
                                <div className="bg-rose/10 px-3 py-2 rounded-lg">
                                    <p className="text-xs text-rose">Pertinence</p>
                                    <p className="font-bold text-brandtext">{a.scorePertinence || "—"}</p>
                                </div>
                                <div className="bg-mauve/10 px-3 py-2 rounded-lg">
                                    <p className="text-xs text-mauve">Engagement</p>
                                    <p className="font-bold text-brandtext">{a.scoreEngagement || "—"}</p>
                                </div>
                            </div>
                            {a.recommandations && (
                                <div className="mt-4 bg-cream rounded-lg p-4">
                                    <p className="text-xs font-medium text-brandmuted mb-1">Recommandations</p>
                                    <p className="text-sm text-brandtext">{a.recommandations}</p>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}