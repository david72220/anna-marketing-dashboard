"use client";

import { useEffect, useState, useMemo } from "react";
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Brush,
} from "recharts";

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

function StatBox({
    label, value, diff, color,
}: {
    label: string; value: number; diff: { val: number; pct: string; up: boolean } | null; color: string;
}) {
    return (
        <div className="bg-white rounded-lg p-4 border border-[#EDE4D8]">
            <p className="text-xs text-[#7A6A6A] mb-1">{label}</p>
            <p className="text-xl font-bold text-[#3A2E2E]" style={{ color }}>
                {value.toLocaleString("fr-FR")}
            </p>
            {diff && (
                <p className={`text-xs mt-1 ${diff.up ? "text-[#6B8F71]" : "text-[#C8A5A5]"}`}>
                    {diff.up ? "+" : ""}{diff.val.toLocaleString("fr-FR")} ({diff.up ? "+" : ""}{diff.pct}%)
                </p>
            )}
        </div>
    );
}

function VideoChart({ metrics }: { metrics: VideoMetric[] }) {
    const [selectedVideo, setSelectedVideo] = useState<string | null>(null);

    const videoData = useMemo(() => {
        const videoMap = new Map<string, { title: string; videoId: string; views: number; likes: number; comments: number }>();
        for (const m of metrics) {
            if (!m.videoId) continue;
            const key = m.videoId;
            if (!videoMap.has(key)) {
                videoMap.set(key, { title: m.videoTitle || m.videoId, videoId: m.videoId, views: 0, likes: 0, comments: 0 });
            }
            const entry = videoMap.get(key)!;
            if (m.metricType === "views" && m.value > entry.views) entry.views = m.value;
            if (m.metricType === "likes" && m.value > entry.likes) entry.likes = m.value;
            if (m.metricType === "comments" && m.value > entry.comments) entry.comments = m.value;
        }
        return [...videoMap.values()].sort((a, b) => b.views - a.views);
    }, [metrics]);

    if (videoData.length === 0) return null;

    const chartData = videoData.map((v) => ({
        name: v.title.length > 30 ? v.title.slice(0, 27) + "..." : v.title,
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
        <div className="mt-6">
            <p className="text-lg font-semibold text-[#3A2E2E] mb-1">🎥 Vues par vidéo YouTube</p>
            <p className="text-xs text-[#7A6A6A] mb-3">Cliquez sur une barre pour ouvrir la vidéo sur YouTube. Utilisez le sélecteur ci-dessous pour zoomer.</p>

            <ResponsiveContainer width="100%" height={videoData.length > 10 ? 400 : Math.max(250, videoData.length * 30)}>
                <BarChart data={chartData} layout="vertical" margin={{ left: 10, right: 20, top: 5, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#EDE4D8" />
                    <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={(v: number) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)} />
                    <YAxis type="category" dataKey="name" width={180} tick={{ fontSize: 10 }} />
                    <Tooltip
                        formatter={(v: number, name: string) => [v.toLocaleString("fr-FR"), name]}
                        labelFormatter={(label: string, payload: { payload?: { fullName?: string } }[]) => payload?.[0]?.payload?.fullName || label}
                    />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Brush dataKey="name" height={25} stroke="#9B7D96" travellerWidth={8} />
                    <Bar dataKey="vues" fill="#C8A5A5" cursor="pointer" onClick={handleClick} />
                    <Bar dataKey="likes" fill="#9B7D96" cursor="pointer" onClick={handleClick} />
                    <Bar dataKey="commentaires" fill="#6B8F71" cursor="pointer" onClick={handleClick} />
                </BarChart>
            </ResponsiveContainer>

            {selected && (
                <div className="mt-3 bg-white rounded-lg p-3 border border-[#EDE4D8]">
                    <p className="text-sm font-medium text-[#3A2E2E]">{selected.title}</p>
                    <div className="flex gap-4 mt-1 text-xs text-[#7A6A6A]">
                        <span>{selected.views.toLocaleString("fr-FR")} vues</span>
                        <span>{selected.likes.toLocaleString("fr-FR")} likes</span>
                        <span>{selected.comments.toLocaleString("fr-FR")} commentaires</span>
                    </div>
                    <a
                        href={`https://youtube.com/watch?v=${selected.videoId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-[#9B7D96] hover:underline mt-1 inline-block"
                    >
                        Ouvrir sur YouTube →
                    </a>
                </div>
            )}
        </div>
    );
}

export default function MetricsPage() {
    const [data, setData] = useState<{
        snapshots: Record<string, Snapshot[]>;
        metrics: Record<string, VideoMetric[]>;
        lastUpdated: string | null;
    } | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function load() {
            try {
                const res = await fetch("/api/social/metrics");
                if (!res.ok) throw new Error("Erreur " + res.status);
                const json = await res.json();
                setData(json);
            } catch (e: any) {
                setError(e.message || "Erreur");
            } finally {
                setLoading(false);
            }
        }
        load();
    }, []);

    if (loading) return <div className="p-8 text-brandmuted">Chargement…</div>;
    if (error) return <div className="p-8 text-rose">Erreur : {error}</div>;
    if (!data || !Object.keys(data.snapshots).length) {
        return (
            <div className="p-8">
                <h1 className="text-2xl font-bold text-brandtext mb-1">KPI réseaux</h1>
                <p className="text-sm text-brandmuted mb-6">Données collectées automatiquement via les APIs.</p>
                <div className="bg-cream rounded-xl border border-warm p-12 text-center">
                    <p className="text-brandmuted text-lg mb-2 font-medium">Aucune donnée disponible pour le moment</p>
                    <p className="text-brandmuted text-sm mb-6 max-w-xl mx-auto">
                        Les métriques de vos réseaux sociaux n&apos;ont pas encore été collectées.
                        Cliquez ci-dessous pour lancer une première collecte manuelle.
                    </p>
                    <CollectButton />
                </div>
            </div>
        );
    }

    return (
        <div className="p-8">
            <h1 className="text-2xl font-bold text-brandtext mb-1">KPI réseaux</h1>
            <p className="text-sm text-brandmuted mb-6">
                Données collectées automatiquement via les APIs.
                {data.lastUpdated ? ` Dernière mise à jour : ${new Date(data.lastUpdated).toLocaleString("fr-FR")}` : ""}
            </p>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {Object.entries(data.snapshots).map(([key, snaps]) => {
                    const latest = snaps[0];
                    const prev = snaps[1];
                    const platform = latest.platform;
                    const label = platformLabels[platform] || platform;

                    const diff = (curr: number, previous?: number) => {
                        if (!previous || previous === 0) return null;
                        const d = curr - previous;
                        const pct = ((d / previous) * 100).toFixed(1);
                        return { val: d, pct, up: d >= 0 };
                    };

                    const dFollowers = diff(latest.followers, prev?.followers);
                    const dViews = diff(latest.totalViews, prev?.totalViews);
                    const dLikes = diff(latest.totalLikes, prev?.totalLikes);

                    return (
                        <div key={key} className="bg-cream rounded-xl p-6 shadow-sm border border-warm">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-lg font-semibold text-brandtext">
                                    {label} — {latest.owner}
                                </h2>
                                <span className="text-xs text-brandmuted bg-warm/50 px-2 py-1 rounded-full">
                                    {latest.date}
                                </span>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <StatBox label="Followers" value={latest.followers} diff={dFollowers} color="#9B7D96" />
                                <StatBox label="Vues totales" value={latest.totalViews} diff={dViews} color="#C8A5A5" />
                                <StatBox label="Likes" value={latest.totalLikes} diff={dLikes} color="#6B8F71" />
                                <StatBox label="Commentaires" value={latest.totalComments} diff={null} color="#7D6078" />
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Video chart for YouTube */}
            {data.metrics && Object.entries(data.metrics).filter(([k]) => k.includes("youtube")).map(([key, m]) => (
                <div key={key} className="mt-6">
                    <VideoChart metrics={m} />
                </div>
            ))}

            <div className="mt-8">
                <CollectButton />
            </div>
        </div>
    );
}

function CollectButton() {
    const [collecting, setCollecting] = useState(false);
    const [message, setMessage] = useState<string | null>(null);

    async function handleCollect() {
        setCollecting(true);
        setMessage(null);
        try {
            const res = await fetch("/api/social/collect", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${process.env.NEXT_PUBLIC_CRON_SECRET || "dev-mode"}`,
                },
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json.error || "Erreur " + res.status);
            setMessage("✅ Collecte lancée ! Rechargez dans quelques instants.");
            setTimeout(() => window.location.reload(), 3000);
        } catch (e: any) {
            setMessage("❌ " + (e.message || "Erreur lors de la collecte"));
        } finally {
            setCollecting(false);
        }
    }

    return (
        <div className="flex flex-col items-center gap-3">
            <button
                onClick={handleCollect}
                disabled={collecting}
                className="px-6 py-3 rounded-lg bg-mauve text-cream font-medium hover:bg-mauve-dark transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {collecting ? "Collecte en cours…" : "🔄 Lancer la collecte des métriques"}
            </button>
            {message && <p className="text-sm text-brandmuted">{message}</p>}
        </div>
    );
}