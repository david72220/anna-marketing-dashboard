"use client";

import { useEffect, useState, useMemo } from "react";
import {
    LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Brush,
} from "recharts";
import Banner from "@/components/Banner";
import Counter from "@/components/Counter";
import Gauge from "@/components/Gauge";
import FilterChips from "@/components/FilterChips";
import PromptCard from "@/components/PromptCard";
import LaunchButton from "@/components/LaunchButton";
import NetworkBadge from "@/components/NetworkBadge";
import { Search, RefreshCw, Lightbulb, Target, Megaphone, BarChart3, Zap, FileText } from "lucide-react";

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

interface Snapshot {
    platform: string;
    owner: string;
    followers: number;
    totalViews: number;
    totalLikes: number;
    totalComments: number;
    date: string;
}

interface VideoMetric {
    id: number;
    platform: string;
    metricType: string;
    value: number;
    date: string;
    owner: string;
    videoId: string | null;
    videoTitle: string | null;
    createdAt: string;
}

const networks = [
    { id: "youtube", label: "YouTube" },
    { id: "instagram", label: "Instagram" },
    { id: "facebook", label: "Facebook" },
    { id: "tiktok", label: "TikTok" },
];

const platformLabels: Record<string, string> = {
    youtube: "YouTube",
    instagram: "Instagram",
    facebook: "Facebook",
    tiktok: "TikTok",
};

const platformColors: Record<string, string> = {
    youtube: "#C8A5A5",
    instagram: "#9B7D96",
    tiktok: "#6B8F71",
    facebook: "#5B7FA5",
};

function formatNum(v: number) {
    if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
    if (v >= 1_000) return `${(v / 1_000).toFixed(1)}k`;
    return v.toLocaleString("fr-FR");
}

function KPIChart({
    title,
    dataKey,
    platforms,
    snapshots,
}: {
    title: string;
    dataKey: "followers" | "totalViews" | "totalLikes";
    platforms: { key: string; platform: string; color: string; label: string }[];
    snapshots: Record<string, Snapshot[]>;
}) {
    const chartData = useMemo(() => {
        const dateMap = new Map<string, Record<string, number>>();
        for (const p of platforms) {
            const snaps = snapshots[p.key];
            if (!snaps) continue;
            for (const s of snaps) {
                const dateStr = new Date(s.date).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" });
                const entry = dateMap.get(dateStr) || {};
                entry[p.key] = s[dataKey];
                dateMap.set(dateStr, entry);
            }
        }
        const sorted = [...dateMap.entries()].reverse();
        return sorted.map(([date, vals]) => ({ date, ...vals }));
    }, [platforms, snapshots, dataKey]);

    if (chartData.length === 0) return null;

    return (
        <div className="card" style={{ marginBottom: "var(--space-3)" }}>
            <p style={{ fontSize: "var(--size-meta)", fontWeight: 500, color: "var(--fg-muted)", marginBottom: "var(--space-2)" }}>{title}</p>
            <ResponsiveContainer width="100%" height={180}>
                <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} tickLine={false} />
                    <YAxis tick={{ fontSize: 10 }} tickFormatter={formatNum} width={45} />
                    <Tooltip formatter={(v: number) => v?.toLocaleString("fr-FR")} />
                    <Legend iconType="line" wrapperStyle={{ fontSize: 11 }} />
                    {platforms.map((p) => (
                        <Line key={p.key} type="monotone" dataKey={p.key} stroke={p.color} name={p.label} strokeWidth={2} dot={chartData.length < 15} />
                    ))}
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
}

export default function AnalysesPage() {
    const [analyses, setAnalyses] = useState<Analysis[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState("all");
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [snapshots, setSnapshots] = useState<Record<string, Snapshot[]>>({});
    const [videoMetrics, setVideoMetrics] = useState<Record<string, VideoMetric[]>>({});

    const [selectedNetworks, setSelectedNetworks] = useState<string[]>([]);
    const [prompt, setPrompt] = useState("");
    const [launching, setLaunching] = useState(false);
    const [launchMessage, setLaunchMessage] = useState<string | null>(null);

    useEffect(() => {
        fetch("/api/notion/analyses")
            .then((r) => r.json())
            .then((data) => { setAnalyses(Array.isArray(data) ? data : []); setLoading(false); })
            .catch(() => setLoading(false));
    }, []);

    useEffect(() => {
        fetch("/api/social/metrics")
            .then((r) => r.json())
            .then((data) => {
                if (data.snapshots) setSnapshots(data.snapshots);
                if (data.metrics) setVideoMetrics(data.metrics);
            })
            .catch(() => { });
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
        }
    };

    const handleRefresh = () => {
        setLoading(true);
        fetch("/api/notion/analyses")
            .then((r) => r.json())
            .then((data) => { setAnalyses(Array.isArray(data) ? data : []); setLoading(false); })
            .catch(() => setLoading(false));
    };

    const filtered = filter === "all" ? analyses : analyses.filter((a) => a.plateforme.toLowerCase().includes(filter.toLowerCase()));
    const platforms = [...new Set(analyses.map((a) => a.plateforme))];
    const selected = selectedId ? analyses.find((a) => a.id === selectedId) : null;

    const filterItems = [
        { id: "all", label: "Toutes" },
        ...platforms.map((p) => ({ id: p, label: p })),
    ];

    if (loading) {
        return (
            <>
                <Banner screen="analyses" />
                <div className="page">
                    <div className="flex items-center justify-center py-24">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-mauve mx-auto" />
                    </div>
                </div>
            </>
        );
    }

    return (
        <>
            <Banner screen="analyses" />
            <div className="page">
                <div className="page-header">
                    <div>
                        <div className="page-eyebrow">Atelier d&apos;observation</div>
                        <h1 className="page-title">
                            Analyses <em>contenu</em>
                        </h1>
                        <p className="page-sub">Décortiquer chaque publication pour cultiver ce qui résonne.</p>
                    </div>
                    <div className="page-actions">
                        <button className="btn btn-ghost" onClick={handleRefresh}>
                            <RefreshCw size={12} /> Actualiser
                        </button>
                    </div>
                </div>

                {/* Prompt card */}
                <PromptCard
                    icon={<Search size={20} />}
                    title="Lancer une analyse"
                    subtitle="Sélectionnez les réseaux et lancez l'automatisation N8N"
                >
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-2)", marginBottom: "var(--space-4)" }}>
                        {networks.map((n) => {
                            const checked = selectedNetworks.includes(n.id);
                            return (
                                <button
                                    key={n.id}
                                    onClick={() => toggleNetwork(n.id)}
                                    className={`filter-chip ${checked ? "active" : ""}`}
                                    style={checked ? { background: "var(--mauve)", color: "var(--white)", borderColor: "var(--mauve)" } : {}}
                                >
                                    <NetworkBadge network={n.id} size={20} />
                                    {n.label}
                                </button>
                            );
                        })}
                    </div>
                    <textarea
                        className="prompt-card-input"
                        rows={2}
                        placeholder="Contexte / consigne optionnelle…"
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                    />
                    <div style={{ display: "flex", alignItems: "center", gap: "var(--space-4)", marginTop: "var(--space-3)" }}>
                        <LaunchButton loading={launching} onClick={handleLaunch}>
                            Lancer l&apos;analyse
                        </LaunchButton>
                        {launchMessage && (
                            <span style={{ fontSize: "var(--size-body)", color: launchMessage.includes("succès") ? "var(--green)" : "var(--rose)" }}>
                                {launchMessage}
                            </span>
                        )}
                    </div>
                    <p style={{ fontSize: "var(--size-tag)", color: "var(--fg-muted)", marginTop: "var(--space-2)" }}>
                        L&apos;automatisation prend généralement 2 à 5 minutes pour générer les résultats.
                    </p>
                </PromptCard>

                {/* Filters */}
                {platforms.length > 0 && (
                    <FilterChips items={filterItems} active={filter} onChange={setFilter} />
                )}

                {/* Analysis list + detail */}
                {filtered.length === 0 ? (
                    <div className="card" style={{ textAlign: "center", padding: "var(--space-16) var(--space-8)" }}>
                        <p style={{ fontFamily: "var(--font-serif)", fontSize: "var(--size-h2-min)", color: "var(--fg)" }}>
                            Aucune analyse disponible
                        </p>
                        <p style={{ fontSize: "var(--size-body)", color: "var(--fg-muted)", marginTop: "var(--space-2)" }}>
                            Les automatisations rempliront cette section automatiquement.
                        </p>
                    </div>
                ) : (
                    <div className="analysis-layout">
                        <div className="analysis-list">
                            {filtered.map((a) => (
                                <button
                                    key={a.id}
                                    className={`analysis-list-item ${selectedId === a.id ? "active" : ""}`}
                                    onClick={() => setSelectedId(a.id)}
                                >
                                    <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", marginBottom: 4 }}>
                                        <NetworkBadge network={a.plateforme} size={24} />
                                        <span style={{ fontSize: "var(--size-meta)", color: "var(--fg-muted)" }}>{a.plateforme}</span>
                                        <span className={`status-pill ${a.statut === "Terminé" ? "status-done" : "status-pending"}`}>
                                            {a.statut}
                                        </span>
                                    </div>
                                    <div style={{ fontFamily: "var(--font-sans)", fontWeight: 500, fontSize: "var(--size-body)", color: "var(--fg)" }}>
                                        {a.title}
                                    </div>
                                    <div style={{ fontSize: "var(--size-tag)", color: "var(--fg-muted)", marginTop: 2 }}>
                                        {a.dateAnalyse}
                                    </div>
                                    {a.scoreGlobal && (
                                        <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 4 }}>
                                            <span style={{ fontSize: "var(--size-tag)", color: "var(--mauve)", fontWeight: 500 }}>
                                                Score: {Math.round(parseFloat(a.scoreGlobal))}/10
                                            </span>
                                        </div>
                                    )}
                                </button>
                            ))}
                        </div>

                        <div className="analysis-detail">
                            {selected ? (
                                <div style={{ padding: "var(--space-6)" }}>
                                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "var(--space-4)" }}>
                                        <div>
                                            <h2 style={{ fontFamily: "var(--font-serif)", fontSize: "var(--size-h2-min)", fontWeight: 500, color: "var(--fg)" }}>
                                                {selected.title}
                                            </h2>
                                            <p style={{ fontSize: "var(--size-meta)", color: "var(--fg-muted)" }}>
                                                {selected.plateforme} · {selected.dateAnalyse}
                                            </p>
                                        </div>
                                        <span className={`status-pill ${selected.statut === "Terminé" ? "status-done" : "status-pending"}`}>
                                            {selected.statut}
                                        </span>
                                    </div>

                                    {selected.resume && (
                                        <div style={{ background: "var(--bg-soft)", borderRadius: "var(--radius)", padding: "var(--space-4)", marginBottom: "var(--space-4)" }}>
                                            <p style={{ fontSize: "var(--size-tag)", fontWeight: 500, color: "var(--fg-muted)", letterSpacing: "var(--tracking-eyebrow)", textTransform: "uppercase", marginBottom: 4 }}>Résumé</p>
                                            <p style={{ fontSize: "var(--size-body)", color: "var(--fg)", lineHeight: "var(--leading-body)", whiteSpace: "pre-line" }}>{selected.resume}</p>
                                        </div>
                                    )}

                                    {/* Score gauges */}
                                    <div className="score-grid">
                                        {selected.scoreGlobal && <Gauge value={parseFloat(selected.scoreGlobal)} label="Global" />}
                                        {selected.scoreHook && <Gauge value={parseFloat(selected.scoreHook)} label="Hook" color="var(--rose)" />}
                                        {selected.scoreCTA && <Gauge value={parseFloat(selected.scoreCTA)} label="CTA" color="var(--green)" />}
                                        {selected.scoreSEO && <Gauge value={parseFloat(selected.scoreSEO)} label="SEO" />}
                                        {selected.scoreEngagement && <Gauge value={parseFloat(selected.scoreEngagement)} label="Engagement" color="var(--mauve-d)" />}
                                    </div>

                                    {selected.pointsForts && (
                                        <div style={{ background: "var(--bg-soft)", borderRadius: "var(--radius)", padding: "var(--space-4)", marginBottom: "var(--space-3)" }}>
                                            <p style={{ fontSize: "var(--size-tag)", fontWeight: 500, color: "var(--fg-muted)", letterSpacing: "var(--tracking-eyebrow)", textTransform: "uppercase", marginBottom: 4, display: "flex", alignItems: "center", gap: 6 }}>
                                                <Lightbulb size={14} /> Points Forts
                                            </p>
                                            <p style={{ fontSize: "var(--size-body)", color: "var(--fg)", lineHeight: "var(--leading-body)", whiteSpace: "pre-line" }}>{selected.pointsForts}</p>
                                        </div>
                                    )}

                                    {selected.axesAmelioration && (
                                        <div style={{ background: "var(--bg-soft)", borderRadius: "var(--radius)", padding: "var(--space-4)", marginBottom: "var(--space-3)" }}>
                                            <p style={{ fontSize: "var(--size-tag)", fontWeight: 500, color: "var(--fg-muted)", letterSpacing: "var(--tracking-eyebrow)", textTransform: "uppercase", marginBottom: 4, display: "flex", alignItems: "center", gap: 6 }}>
                                                <Target size={14} /> Axes d&apos;Amélioration
                                            </p>
                                            <p style={{ fontSize: "var(--size-body)", color: "var(--fg)", lineHeight: "var(--leading-body)", whiteSpace: "pre-line" }}>{selected.axesAmelioration}</p>
                                        </div>
                                    )}

                                    {selected.hookSuggere && (
                                        <div style={{ background: "var(--bg-soft)", borderRadius: "var(--radius)", padding: "var(--space-4)", marginBottom: "var(--space-3)" }}>
                                            <p style={{ fontSize: "var(--size-tag)", fontWeight: 500, color: "var(--fg-muted)", letterSpacing: "var(--tracking-eyebrow)", textTransform: "uppercase", marginBottom: 4, display: "flex", alignItems: "center", gap: 6 }}>
                                                <Zap size={14} /> Hook Suggéré
                                            </p>
                                            <p style={{ fontSize: "var(--size-body)", color: "var(--fg)", lineHeight: "var(--leading-body)", whiteSpace: "pre-line" }}>{selected.hookSuggere}</p>
                                        </div>
                                    )}

                                    {selected.hashtags && (
                                        <div style={{ background: "var(--bg-soft)", borderRadius: "var(--radius)", padding: "var(--space-4)", marginBottom: "var(--space-3)" }}>
                                            <p style={{ fontSize: "var(--size-tag)", fontWeight: 500, color: "var(--fg-muted)", letterSpacing: "var(--tracking-eyebrow)", textTransform: "uppercase", marginBottom: 4, display: "flex", alignItems: "center", gap: 6 }}>
                                                <Megaphone size={14} /> Hashtags
                                            </p>
                                            <p style={{ fontSize: "var(--size-body)", color: "var(--fg)", lineHeight: "var(--leading-body)" }}>{selected.hashtags}</p>
                                        </div>
                                    )}

                                    {selected.ecosystemeMotsCles && (
                                        <div style={{ background: "var(--bg-soft)", borderRadius: "var(--radius)", padding: "var(--space-4)", marginBottom: "var(--space-3)" }}>
                                            <p style={{ fontSize: "var(--size-tag)", fontWeight: 500, color: "var(--fg-muted)", letterSpacing: "var(--tracking-eyebrow)", textTransform: "uppercase", marginBottom: 4, display: "flex", alignItems: "center", gap: 6 }}>
                                                <BarChart3 size={14} /> Écosystème Mots-clés
                                            </p>
                                            <p style={{ fontSize: "var(--size-body)", color: "var(--fg)", lineHeight: "var(--leading-body)", whiteSpace: "pre-line" }}>{selected.ecosystemeMotsCles}</p>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", minHeight: 300, color: "var(--fg-muted)", fontSize: "var(--size-body)" }}>
                                    Sélectionnez une analyse pour voir les détails
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}