"use client";

import { useEffect, useState, useMemo } from "react";
import {
    LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Brush,
} from "recharts";

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
    { id: "youtube", label: "YouTube", icon: "🎥" },
    { id: "instagram", label: "Instagram", icon: "📸" },
    { id: "facebook", label: "Facebook", icon: "📘" },
    { id: "tiktok", label: "TikTok", icon: "🎵" },
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
        <div className="bg-cream rounded-lg p-3">
            <p className="text-xs font-medium text-brandmuted mb-2">{title}</p>
            <ResponsiveContainer width="100%" height={180}>
                <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#EDE4D8" />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} tickLine={false} />
                    <YAxis tick={{ fontSize: 10 }} tickFormatter={formatNum} width={45} />
                    <Tooltip formatter={(v: number) => v?.toLocaleString("fr-FR")} />
                    <Legend iconType="line" wrapperStyle={{ fontSize: 11 }} />
                    {platforms.map((p) => (
                        <Line
                            key={p.key}
                            type="monotone"
                            dataKey={p.key}
                            stroke={p.color}
                            name={p.label}
                            strokeWidth={2}
                            dot={chartData.length < 15}
                        />
                    ))}
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
}

function KPISection({ platformKeys, snapshots }: { platformKeys: string[]; snapshots: Record<string, Snapshot[]> }) {
    const platforms = useMemo(() => {
        return platformKeys
            .filter((k) => snapshots[k]?.length > 0)
            .map((k) => {
                const platform = snapshots[k][0].platform;
                return {
                    key: k,
                    platform,
                    color: platformColors[platform] || "#9B7D96",
                    label: platformLabels[platform] || platform,
                };
            });
    }, [platformKeys, snapshots]);

    if (platforms.length === 0) {
        return (
            <div className="mt-4 border-t border-warm pt-4">
                <p className="text-sm font-semibold text-brandtext mb-2">📊 KPI des réseaux analysés</p>
                <p className="text-xs text-brandmuted">Aucune donnée KPI disponible pour ces réseaux. Lancez une collecte depuis la page KPI réseaux.</p>
            </div>
        );
    }

    return (
        <div className="mt-4 border-t border-warm pt-4">
            <p className="text-sm font-semibold text-brandtext mb-3">📊 Évolution des KPI</p>
            <KPIChart title="Abonnés" dataKey="followers" platforms={platforms} snapshots={snapshots} />
            <div className="mt-3">
                <KPIChart title="Vues totales" dataKey="totalViews" platforms={platforms} snapshots={snapshots} />
            </div>
            <div className="mt-3">
                <KPIChart title="Likes" dataKey="totalLikes" platforms={platforms} snapshots={snapshots} />
            </div>
        </div>
    );
}

function VideoChart({ metrics }: { metrics: VideoMetric[] }) {
    const [selectedVideo, setSelectedVideo] = useState<string | null>(null);

    const videoData = useMemo(() => {
        const videoMap = new Map<string, { title: string; videoId: string; views: number; likes: number; comments: number }>();
        for (const m of metrics) {
            if (!m.videoId) continue;
            if (!videoMap.has(m.videoId)) {
                videoMap.set(m.videoId, { title: m.videoTitle || m.videoId, videoId: m.videoId, views: 0, likes: 0, comments: 0 });
            }
            const entry = videoMap.get(m.videoId)!;
            if (m.metricType === "views" && m.value > entry.views) entry.views = m.value;
            if (m.metricType === "likes" && m.value > entry.likes) entry.likes = m.value;
            if (m.metricType === "comments" && m.value > entry.comments) entry.comments = m.value;
        }
        return [...videoMap.values()].sort((a, b) => b.views - a.views);
    }, [metrics]);

    if (videoData.length === 0) return null;

    const chartData = videoData.map((v) => ({
        name: v.title.length > 25 ? v.title.slice(0, 22) + "…" : v.title,
        fullName: v.title,
        videoId: v.videoId,
        vues: v.views,
        likes: v.likes,
        commentaires: v.comments,
    }));

    const handleClick = (data: { payload?: { videoId?: string } }) => {
        if (data?.payload?.videoId) {
            window.open(`https://youtube.com/watch?v=${data.payload.videoId}`, "_blank");
        }
    };

    const selected = selectedVideo ? videoData.find((v) => v.videoId === selectedVideo) : null;

    return (
        <div className="mt-4 border-t border-warm pt-4">
            <p className="text-sm font-semibold text-brandtext mb-1">🎥 Vues par vidéo YouTube</p>
            <p className="text-[11px] text-brandmuted mb-3">Cliquez sur une barre pour ouvrir la vidéo. Utilisez le sélecteur pour zoomer.</p>

            <ResponsiveContainer width="100%" height={videoData.length > 8 ? 350 : Math.max(200, videoData.length * 32)}>
                <BarChart data={chartData} layout="vertical" margin={{ left: 10, right: 20, top: 5, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#EDE4D8" />
                    <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={(v: number) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)} />
                    <YAxis type="category" dataKey="name" width={160} tick={{ fontSize: 10 }} />
                    <Tooltip
                        formatter={(v: number, name: string) => [v.toLocaleString("fr-FR"), name]}
                        labelFormatter={(_, payload) => payload?.[0]?.payload?.fullName || ""}
                    />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Brush dataKey="name" height={20} stroke="#9B7D96" travellerWidth={6} />
                    <Bar dataKey="vues" fill="#C8A5A5" cursor="pointer" onClick={handleClick} />
                    <Bar dataKey="likes" fill="#9B7D96" cursor="pointer" onClick={handleClick} />
                    <Bar dataKey="commentaires" fill="#6B8F71" cursor="pointer" onClick={handleClick} />
                </BarChart>
            </ResponsiveContainer>

            {selected && (
                <div className="mt-2 bg-cream rounded-lg p-3">
                    <p className="text-sm font-medium text-brandtext">{selected.title}</p>
                    <div className="flex gap-4 mt-1 text-xs text-brandmuted">
                        <span>{selected.views.toLocaleString("fr-FR")} vues</span>
                        <span>{selected.likes.toLocaleString("fr-FR")} likes</span>
                        <span>{selected.comments.toLocaleString("fr-FR")} commentaires</span>
                    </div>
                    <a
                        href={`https://youtube.com/watch?v=${selected.videoId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-mauve hover:underline mt-1 inline-block"
                    >
                        Ouvrir sur YouTube →
                    </a>
                </div>
            )}
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
    const [inProgress, setInProgress] = useState(false);

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

    const getPlatformKeys = (plateforme: string): string[] => {
        const keys: string[] = [];
        for (const net of networks) {
            if (plateforme.toLowerCase().includes(net.id)) {
                keys.push(`anna_${net.id}`);
            }
        }
        return keys.length > 0 ? keys : Object.keys(snapshots).filter((k) =>
            plateforme.toLowerCase().includes(k.split("_")[1] || "")
        );
    };

    return (
        <div className="p-8">
            <div className="mb-8 flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-brandtext">🔍 Analyses de Contenu</h1>
                    <p className="text-brandmuted mt-2">Résultats des analyses de pertinence du contenu d'Anna</p>
                </div>
                <button
                    onClick={() => { setLoading(true); fetch("/api/notion/analyses").then((r) => r.json()).then((data) => { setAnalyses(Array.isArray(data) ? data : []); setLoading(false); }).catch(() => setLoading(false)); }}
                    className="px-4 py-2 rounded-lg border border-warm text-brandtext text-sm hover:bg-warm transition-colors"
                >
                    🔄 Rafraîchir
                </button>
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

                                {/* KPI charts for analyzed platforms */}
                                <KPISection platformKeys={getPlatformKeys(selected.plateforme)} snapshots={snapshots} />

                                {/* Video chart for YouTube */}
                                {getPlatformKeys(selected.plateforme).some((k) => k.includes("youtube") && videoMetrics[k]?.length > 0) && (
                                    <VideoChart metrics={videoMetrics[getPlatformKeys(selected.plateforme).find((k) => k.includes("youtube")) || ""]} />
                                )}

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