"use client";

import { useEffect, useState } from "react";

interface Analysis {
    id: string;
    title: string;
    plateforme: string;
    scorePertinence: string;
    scoreEngagement: string;
    statut: string;
    dateAnalyse: string;
}

interface VeilleItem {
    id: string;
    title: string;
    concurrent: string;
    plateforme: string;
    typeContenu: string;
    performance: string;
    statut: string;
}

interface BacklogItem {
    id: string;
    title: string;
    plateforme: string;
    typeContenu: string;
    sujet: string;
    priorite: string;
    statut: string;
}

interface SnapshotEntry {
    platform: string;
    owner: string;
    followers: number;
    totalViews: number;
    totalLikes: number;
    totalComments: number;
    date: string;
}

interface MetricsData {
    snapshots: Record<string, SnapshotEntry[]>;
    metrics: Record<string, unknown[]>;
    lastUpdated: string | null;
}

const platformIcons: Record<string, string> = {
    youtube: "🎥",
    tiktok: "🎵",
    facebook: "📘",
    instagram: "📸",
};

const platformColors: Record<string, string> = {
    youtube: "bg-red-50 border-red-200 text-red-700",
    tiktok: "bg-pink-50 border-pink-200 text-pink-700",
    facebook: "bg-blue-50 border-blue-200 text-blue-700",
    instagram: "bg-purple-50 border-purple-200 text-purple-700",
};

const ownerLabels: Record<string, string> = {
    anna: "Anna OLLIVIER",
    david: "David",
};

export default function DashboardPage() {
    const [analyses, setAnalyses] = useState<Analysis[]>([]);
    const [veille, setVeille] = useState<VeilleItem[]>([]);
    const [backlog, setBacklog] = useState<BacklogItem[]>([]);
    const [metrics, setMetrics] = useState<MetricsData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        Promise.all([
            fetch("/api/notion/analyses").then((r) => r.json()).catch(() => []),
            fetch("/api/notion/veille").then((r) => r.json()).catch(() => []),
            fetch("/api/notion/backlog").then((r) => r.json()).catch(() => []),
            fetch("/api/social/metrics").then((r) => r.json()).catch(() => null),
        ]).then(([analysesData, veilleData, backlogData, metricsData]) => {
            setAnalyses(Array.isArray(analysesData) ? analysesData : []);
            setVeille(Array.isArray(veilleData) ? veilleData : []);
            setBacklog(Array.isArray(backlogData) ? backlogData : []);
            setMetrics(metricsData);
            setLoading(false);
        });
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-600 mx-auto"></div>
                    <p className="mt-4 text-slate-500">Chargement du dashboard...</p>
                </div>
            </div>
        );
    }

    const recentAnalyses = analyses.slice(0, 5);
    const recentVeille = veille.slice(0, 5);
    const pendingBacklog = backlog.filter((b) => b.statut !== "Terminé").slice(0, 5);

    // Calculer les KPIs par owner
    const getLatestSnapshot = (owner: string, platform: string): SnapshotEntry | null => {
        const key = `${owner}_${platform}`;
        const snaps = metrics?.snapshots?.[key];
        return snaps && snaps.length > 0 ? snaps[0] : null;
    };

    const annaYt = getLatestSnapshot("anna", "youtube");
    const annaIg = getLatestSnapshot("anna", "instagram");
    const davidYt = getLatestSnapshot("david", "youtube");

    // Grouper les snapshots par owner
    const owners = ["anna", "david"];
    const platforms = ["youtube", "tiktok", "facebook", "instagram"];

    return (
        <div className="p-8">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-slate-900">Vue d'ensemble</h1>
                <p className="text-slate-500 mt-2">Tableau de bord marketing d'Anna OLLIVIER</p>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:gridcols-4 gap-6 mb-8">
                <StatCard
                    title="Analyses réalisées"
                    value={String(analyses.length)}
                    icon="🔍"
                    color="violet"
                />
                <StatCard
                    title="Veille concurrentielle"
                    value={String(veille.length)}
                    icon="👁️"
                    color="blue"
                />
                <StatCard
                    title="Posts en backlog"
                    value={String(pendingBacklog.length)}
                    icon="📝"
                    color="amber"
                />
                <StatCard
                    title="Abonnés YouTube Anna"
                    value={annaYt?.followers?.toLocaleString("fr-FR") || "—"}
                    icon="🎥"
                    color="red"
                />
            </div>

            {/* Dernières analyses */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                    <h2 className="text-lg font-semibold text-slate-900 mb-4">📋 Dernières Analyses</h2>
                    {recentAnalyses.length === 0 ? (
                        <p className="text-slate-400 text-sm">Aucune analyse pour le moment</p>
                    ) : (
                        <div className="space-y-3">
                            {recentAnalyses.map((a) => (
                                <div key={a.id} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                                    <div>
                                        <p className="font-medium text-slate-800 text-sm">{a.title}</p>
                                        <p className="text-xs text-slate-400">{a.plateforme} • {a.dateAnalyse}</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs bg-violet-100 text-violet-700 px-2 py-1 rounded-full">
                                            Pertinence: {a.scorePertinence}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                    <h2 className="text-lg font-semibold text-slate-900 mb-4">🔎 Veille Concurrence</h2>
                    {recentVeille.length === 0 ? (
                        <p className="text-slate-400 text-sm">Aucune donnée de veille pour le moment</p>
                    ) : (
                        <div className="space-y-3">
                            {recentVeille.map((v) => (
                                <div key={v.id} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                                    <div>
                                        <p className="font-medium text-slate-800 text-sm">{v.title}</p>
                                        <p className="text-xs text-slate-400">{v.concurrent} • {v.plateforme}</p>
                                    </div>
                                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                                        {v.statut}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Métriques réseaux sociaux par owner */}
            {metrics?.snapshots && Object.keys(metrics.snapshots).length > 0 && (
                <div className="mt-6 space-y-6">
                    {owners.map((owner) => {
                        const ownerPlatforms = platforms.filter((p) => metrics.snapshots[`${owner}_${p}`]);
                        if (ownerPlatforms.length === 0) return null;
                        return (
                            <div key={owner} className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                                <h2 className="text-lg font-semibold text-slate-900 mb-4">
                                    📈 {ownerLabels[owner] || owner} — Réseaux Sociaux
                                </h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                    {ownerPlatforms.map((platform) => {
                                        const key = `${owner}_${platform}`;
                                        const snaps = metrics.snapshots[key];
                                        const latest = snaps[0];
                                        const prev = snaps[1];
                                        const diff = prev ? latest.followers - prev.followers : 0;
                                        const viewsDiff = prev ? latest.totalViews - prev.totalViews : 0;
                                        const likesDiff = prev ? (latest.totalLikes || 0) - (prev.totalLikes || 0) : 0;
                                        return (
                                            <div key={key} className={`rounded-lg p-4 border ${platformColors[platform] || "bg-slate-50 border-slate-200"}`}>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xl">{platformIcons[platform] || "🌐"}</span>
                                                    <p className="text-sm font-medium capitalize">{platform}</p>
                                                </div>
                                                <p className="text-2xl font-bold mt-2">{latest.followers.toLocaleString("fr-FR")}</p>
                                                <p className={`text-sm ${diff >= 0 ? "text-green-600" : "text-red-600"}`}>
                                                    {diff >= 0 ? "+" : ""}{diff} abonnés
                                                </p>
                                                <p className="text-xs mt-1 opacity-75">
                                                    Vues: {latest.totalViews?.toLocaleString("fr-FR") || "—"}
                                                    {viewsDiff !== 0 && ` (${viewsDiff >= 0 ? "+" : ""}${viewsDiff.toLocaleString("fr-FR")})`}
                                                </p>
                                                <p className="text-xs opacity-75">
                                                    ❤️ {latest.totalLikes?.toLocaleString("fr-FR") || "—"}
                                                    {likesDiff !== 0 && ` (${likesDiff >= 0 ? "+" : ""}${likesDiff.toLocaleString("fr-FR")})`}
                                                </p>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

function StatCard({ title, value, icon, color }: { title: string; value: string; icon: string; color: string }) {
    const colorMap: Record<string, string> = {
        violet: "bg-violet-50 text-violet-600 border-violet-200",
        blue: "bg-blue-50 text-blue-600 border-blue-200",
        amber: "bg-amber-50 text-amber-600 border-amber-200",
        red: "bg-red-50 text-red-600 border-red-200",
    };
    return (
        <div className={`rounded-xl border p-6 ${colorMap[color] || colorMap.violet}`}>
            <div className="flex items-center justify-between">
                <p className="text-sm font-medium opacity-80">{title}</p>
                <span className="text-2xl">{icon}</span>
            </div>
            <p className="text-3xl font-bold mt-2">{value}</p>
        </div>
    );
}