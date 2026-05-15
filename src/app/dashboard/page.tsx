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
    youtube: "bg-rose-50 border-rose-200 text-rose-700",
    tiktok: "bg-mauve-50 border-mauve-200 text-mauve-700",
    facebook: "bg-rose-50 border-rose-200 text-rose-700",
    instagram: "bg-mauve-50 border-mauve-200 text-mauve-700",
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
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-mauve mx-auto"></div>
                    <p className="mt-4 text-brandmuted">Chargement du dashboard...</p>
                </div>
            </div>
        );
    }

    const recentAnalyses = analyses.slice(0, 5);
    const recentVeille = veille.slice(0, 5);
    const pendingBacklog = backlog.filter((b) => b.statut !== "Terminé").slice(0, 5);

    const getLatestSnapshot = (owner: string, platform: string): SnapshotEntry | null => {
        const key = `${owner}_${platform}`;
        const snaps = metrics?.snapshots?.[key];
        return snaps && snaps.length > 0 ? snaps[0] : null;
    };

    const annaYt = getLatestSnapshot("anna", "youtube");
    const annaIg = getLatestSnapshot("anna", "instagram");
    const davidYt = getLatestSnapshot("david", "youtube");

    const owners = ["anna", "david"];
    const platforms = ["youtube", "tiktok", "facebook", "instagram"];

    return (
        <div className="p-8">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-brandtext">Vue d'ensemble</h1>
                <p className="text-brandmuted mt-2">Tableau de bord marketing d'Anna OLLIVIER</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <StatCard
                    title="Analyses réalisées"
                    value={String(analyses.length)}
                    icon="🔍"
                    color="mauve"
                />
                <StatCard
                    title="Veille concurrentielle"
                    value={String(veille.length)}
                    icon="👁️"
                    color="rose"
                />
                <StatCard
                    title="Posts en backlog"
                    value={String(pendingBacklog.length)}
                    icon="📝"
                    color="brandgreen"
                />
                <StatCard
                    title="Abonnés YouTube Anna"
                    value={annaYt?.followers?.toLocaleString("fr-FR") || "—"}
                    icon="🎥"
                    color="mauve"
                />
            </div>

            <div className="mb-8 bg-cream rounded-xl shadow-sm border border-warm p-6">
                <h2 className="text-lg font-semibold text-brandtext mb-4">🔗 Comptes sociaux analysés</h2>
                <div className="flex flex-wrap gap-4">
                    <a
                        href="https://www.instagram.com/anna.ollivier.psy/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-mauve-50 border border-mauve-200 text-mauve-700 hover:bg-mauve-100 transition-colors"
                    >
                        <span className="text-xl">📸</span>
                        <span className="font-medium text-sm">Instagram — @anna.ollivier.psy</span>
                    </a>
                    <a
                        href="https://www.facebook.com/AnnaOllivierPsy"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 hover:bg-rose-100 transition-colors"
                    >
                        <span className="text-xl">📘</span>
                        <span className="font-medium text-sm">Facebook — AnnaOllivierPsy</span>
                    </a>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-cream rounded-xl shadow-sm border border-warm p-6">
                    <h2 className="text-lg font-semibold text-brandtext mb-4">📋 Dernières Analyses</h2>
                    {recentAnalyses.length === 0 ? (
                        <p className="text-brandmuted text-sm">Aucune analyse pour le moment</p>
                    ) : (
                        <div className="space-y-3">
                            {recentAnalyses.map((a) => (
                                <div key={a.id} className="flex items-center justify-between py-2 border-b border-warm last:border-0">
                                    <div>
                                        <p className="font-medium text-brandtext text-sm">{a.title}</p>
                                        <p className="text-xs text-brandmuted">{a.plateforme} • {a.dateAnalyse}</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs bg-mauve-100 text-mauve-700 px-2 py-1 rounded-full">
                                            Pertinence: {a.scorePertinence}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="bg-cream rounded-xl shadow-sm border border-warm p-6">
                    <h2 className="text-lg font-semibold text-brandtext mb-4">🔎 Veille Concurrence</h2>
                    {recentVeille.length === 0 ? (
                        <p className="text-brandmuted text-sm">Aucune donnée de veille pour le moment</p>
                    ) : (
                        <div className="space-y-3">
                            {recentVeille.map((v) => (
                                <div key={v.id} className="flex items-center justify-between py-2 border-b border-warm last:border-0">
                                    <div className="min-w-0 flex-1">
                                        <p className="font-medium text-brandtext text-sm truncate">{v.title || "Veille sans titre"}</p>
                                        <p className="text-xs text-brandmuted">
                                            {v.plateforme}{v.dateVeille ? ` • ${v.dateVeille}` : ""}
                                        </p>
                                    </div>
                                    <span className={`text-xs px-2 py-1 rounded-full ${(v.statut?.toLowerCase().includes("termin")) ? "bg-brandgreen/20 text-brandgreen" : "bg-rose/20 text-rose"}`}>
                                        {v.statut || "En cours"}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {metrics?.snapshots && Object.keys(metrics.snapshots).length > 0 && (
                <div className="mt-6 space-y-6">
                    {owners.map((owner) => {
                        const ownerPlatforms = platforms.filter((p) => metrics.snapshots[`${owner}_${p}`]);
                        if (ownerPlatforms.length === 0) return null;
                        return (
                            <div key={owner} className="bg-cream rounded-xl shadow-sm border border-warm p-6">
                                <h2 className="text-lg font-semibold text-brandtext mb-4">
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
                                            <div key={key} className={`rounded-lg p-4 border ${platformColors[platform] || "bg-cream border-warm"}`}>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xl">{platformIcons[platform] || "🌐"}</span>
                                                    <p className="text-sm font-medium capitalize text-brandtext">{platform}</p>
                                                </div>
                                                <p className="text-2xl font-bold mt-2 text-brandtext">{latest.followers.toLocaleString("fr-FR")}</p>
                                                <p className={`text-sm ${diff >= 0 ? "text-brandgreen" : "text-rose"}`}>
                                                    {diff >= 0 ? "+" : ""}{diff} abonnés
                                                </p>
                                                <p className="text-xs mt-1 opacity-75 text-brandmuted">
                                                    Vues: {latest.totalViews?.toLocaleString("fr-FR") || "—"}
                                                    {viewsDiff !== 0 && ` (${viewsDiff >= 0 ? "+" : ""}${viewsDiff.toLocaleString("fr-FR")})`}
                                                </p>
                                                <p className="text-xs opacity-75 text-brandmuted">
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
        mauve: "bg-mauve-50 text-mauve-600 border-mauve-200",
        rose: "bg-rose-50 text-rose-600 border-rose-200",
        brandgreen: "bg-brandgreen-50 text-brandgreen-600 border-brandgreen-200",
    };
    return (
        <div className={`rounded-xl border p-6 ${colorMap[color] || colorMap.mauve}`}>
            <div className="flex items-center justify-between">
                <p className="text-sm font-medium opacity-80">{title}</p>
                <span className="text-2xl">{icon}</span>
            </div>
            <p className="text-3xl font-bold mt-2">{value}</p>
        </div>
    );
}