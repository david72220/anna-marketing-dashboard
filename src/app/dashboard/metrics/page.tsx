"use client";

import { useEffect, useState, useMemo } from "react";
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Brush,
} from "recharts";
import Banner from "@/components/Banner";
import Counter from "@/components/Counter";
import NetworkBadge from "@/components/NetworkBadge";
import LaunchButton from "@/components/LaunchButton";
import { TrendingUp, TrendingDown, RefreshCw, Eye, Heart, MessageCircle, Users } from "lucide-react";

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

function VideoChart({ metrics }: { metrics: VideoMetric[] }) {
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

    return (
        <div className="card" style={{ marginTop: "var(--space-6)" }}>
            <div className="card-header">
                <h3 className="card-title">Vues par vidéo YouTube</h3>
                <p style={{ fontSize: "var(--size-meta)", color: "var(--fg-muted)", marginTop: 2 }}>
                    Cliquez sur une barre pour ouvrir la vidéo sur YouTube.
                </p>
            </div>
            <ResponsiveContainer width="100%" height={videoData.length > 10 ? 400 : Math.max(250, videoData.length * 30)}>
                <BarChart data={chartData} layout="vertical" margin={{ left: 10, right: 20, top: 5, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={(v: number) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)} />
                    <YAxis type="category" dataKey="name" width={180} tick={{ fontSize: 10 }} />
                    <Tooltip
                        formatter={(v: number, name: string) => [v.toLocaleString("fr-FR"), name]}
                        labelFormatter={(label: string, payload: { payload?: { fullName?: string } }[]) => payload?.[0]?.payload?.fullName || label}
                    />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Brush dataKey="name" height={25} stroke="var(--mauve)" travellerWidth={8} />
                    <Bar dataKey="vues" fill="#C8A5A5" cursor="pointer" onClick={handleClick} />
                    <Bar dataKey="likes" fill="#9B7D96" cursor="pointer" onClick={handleClick} />
                    <Bar dataKey="commentaires" fill="#6B8F71" cursor="pointer" onClick={handleClick} />
                </BarChart>
            </ResponsiveContainer>
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

    if (loading) {
        return (
            <>
                <Banner screen="metrics" />
                <div className="page">
                    <div className="flex items-center justify-center py-24">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-mauve mx-auto" />
                    </div>
                </div>
            </>
        );
    }

    if (error) {
        return (
            <>
                <Banner screen="metrics" />
                <div className="page">
                    <p style={{ color: "var(--rose)" }}>Erreur : {error}</p>
                </div>
            </>
        );
    }

    if (!data || !Object.keys(data.snapshots).length) {
        return (
            <>
                <Banner screen="metrics" />
                <div className="page">
                    <div className="page-header">
                        <div>
                            <div className="page-eyebrow">Boussole chiffrée</div>
                            <h1 className="page-title">KPI <em>réseaux</em></h1>
                            <p className="page-sub">Mesurer pour mieux ajuster — engagement, portée, régularité.</p>
                        </div>
                    </div>
                    <div className="card" style={{ textAlign: "center", padding: "var(--space-16) var(--space-8)" }}>
                        <p style={{ fontFamily: "var(--font-serif)", fontSize: "var(--size-h2-min)", color: "var(--fg)", marginBottom: "var(--space-2)" }}>
                            Aucune donnée disponible
                        </p>
                        <p style={{ fontSize: "var(--size-body)", color: "var(--fg-muted)", marginBottom: "var(--space-6)", maxWidth: 480, marginLeft: "auto", marginRight: "auto" }}>
                            Les métriques de vos réseaux sociaux n&apos;ont pas encore été collectées.
                            Lancez une première collecte manuelle.
                        </p>
                        <CollectButton />
                    </div>
                </div>
            </>
        );
    }

    return (
        <>
            <Banner screen="metrics" />
            <div className="page">
                <div className="page-header">
                    <div>
                        <div className="page-eyebrow">Boussole chiffrée</div>
                        <h1 className="page-title">KPI <em>réseaux</em></h1>
                        <p className="page-sub">
                            Données collectées automatiquement via les APIs.
                            {data.lastUpdated ? ` Dernière mise à jour : ${new Date(data.lastUpdated).toLocaleString("fr-FR")}` : ""}
                        </p>
                    </div>
                </div>

                <div className="kpi-grid">
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
                            <div key={key} className="card">
                                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "var(--space-4)" }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
                                        <NetworkBadge network={platform} />
                                        <div>
                                            <div style={{ fontFamily: "var(--font-serif)", fontSize: "var(--size-h3)", fontWeight: 500, color: "var(--fg)" }}>{label}</div>
                                            <div style={{ fontSize: "var(--size-meta)", color: "var(--fg-muted)" }}>{latest.owner}</div>
                                        </div>
                                    </div>
                                    <span className="priority-pill" style={{ background: "var(--rose-ll)", color: "var(--mauve-d)" }}>
                                        {latest.date}
                                    </span>
                                </div>
                                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-3)" }}>
                                    <MetricTile icon={<Users size={14} />} label="Followers" value={latest.followers} diff={dFollowers} />
                                    <MetricTile icon={<Eye size={14} />} label="Vues" value={latest.totalViews} diff={dViews} />
                                    <MetricTile icon={<Heart size={14} />} label="Likes" value={latest.totalLikes} diff={dLikes} />
                                    <MetricTile icon={<MessageCircle size={14} />} label="Commentaires" value={latest.totalComments} diff={null} />
                                </div>
                            </div>
                        );
                    })}
                </div>

                {data.metrics && Object.entries(data.metrics).filter(([k]) => k.includes("youtube")).map(([key, m]) => (
                    <VideoChart key={key} metrics={m} />
                ))}

                <div style={{ marginTop: "var(--space-6)", textAlign: "center" }}>
                    <CollectButton />
                </div>
            </div>
        </>
    );
}

function MetricTile({ icon, label, value, diff }: { icon: React.ReactNode; label: string; value: number; diff: { val: number; pct: string; up: boolean } | null }) {
    return (
        <div style={{ background: "var(--bg-soft)", borderRadius: "var(--radius)", padding: "var(--space-3) var(--space-4)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", fontSize: "var(--size-meta)", color: "var(--fg-muted)", marginBottom: 2 }}>
                {icon} {label}
            </div>
            <div style={{ fontFamily: "var(--font-serif)", fontSize: 20, fontWeight: 500, color: "var(--fg)" }}>
                {value.toLocaleString("fr-FR")}
            </div>
            {diff && (
                <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: "var(--size-tag)", color: diff.up ? "var(--green)" : "var(--rose)" }}>
                    {diff.up ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                    {diff.up ? "+" : ""}{diff.val.toLocaleString("fr-FR")} ({diff.up ? "+" : ""}{diff.pct}%)
                </div>
            )}
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
                headers: { "Content-Type": "application/json" },
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json.error || "Erreur " + res.status);
            setMessage("Collecte lancée ! Rechargez dans quelques instants.");
            setTimeout(() => window.location.reload(), 3000);
        } catch (e: any) {
            setMessage(e.message || "Erreur lors de la collecte");
        } finally {
            setCollecting(false);
        }
    }

    return (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "var(--space-3)" }}>
            <LaunchButton loading={collecting} onClick={handleCollect}>
                <RefreshCw size={16} /> Collecter les métriques
            </LaunchButton>
            {message && <p style={{ fontSize: "var(--size-body)", color: "var(--fg-muted)" }}>{message}</p>}
        </div>
    );
}