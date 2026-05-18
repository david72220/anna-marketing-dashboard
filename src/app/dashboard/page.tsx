"use client";

import { useEffect, useState } from "react";
import Banner from "@/components/Banner";
import Counter from "@/components/Counter";
import NetworkBadge from "@/components/NetworkBadge";
import BarRow from "@/components/BarRow";
import { Search, Eye, PenLine, BarChart3, TrendingUp, TrendingDown } from "lucide-react";

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
    plateforme: string;
    dateVeille: string;
    statut: string;
}

interface BacklogItem {
    id: string;
    title: string;
    plateforme: string;
    format: string;
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
            <>
                <Banner screen="overview" />
                <div className="page">
                    <div className="flex items-center justify-center py-24">
                        <div className="text-center">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-mauve mx-auto" />
                            <p className="mt-4 text-brandmuted" style={{ fontFamily: "var(--font-sans)" }}>Chargement…</p>
                        </div>
                    </div>
                </div>
            </>
        );
    }

    const pendingBacklog = backlog.filter((b) => b.statut !== "Terminé");

    const getLatestSnapshot = (owner: string, platform: string): SnapshotEntry | null => {
        const key = `${owner}_${platform}`;
        const snaps = metrics?.snapshots?.[key];
        return snaps && snaps.length > 0 ? snaps[0] : null;
    };

    const annaYt = getLatestSnapshot("anna", "youtube");
    const annaIg = getLatestSnapshot("anna", "instagram");

    const owners = ["anna", "david"];
    const platforms = ["youtube", "tiktok", "facebook", "instagram"];

    return (
        <>
            <Banner screen="overview" />
            <div className="page">
                <div className="page-header">
                    <div>
                        <div className="page-eyebrow">Tableau de bord</div>
                        <h1 className="page-title">
                            Vue d&apos;<em>ensemble</em>
                        </h1>
                        <p className="page-sub">Là où tout commence — l&apos;état de votre présence en un coup d&apos;œil.</p>
                    </div>
                </div>

                {/* KPI grid */}
                <div className="kpi-grid">
                    <div className="kpi">
                        <div className="kpi-icon"><Search size={18} /></div>
                        <div className="kpi-value"><Counter value={analyses.length} /></div>
                        <div className="kpi-label">Analyses réalisées</div>
                    </div>
                    <div className="kpi">
                        <div className="kpi-icon"><Eye size={18} /></div>
                        <div className="kpi-value"><Counter value={veille.length} /></div>
                        <div className="kpi-label">Veilles concurrentielles</div>
                    </div>
                    <div className="kpi">
                        <div className="kpi-icon"><PenLine size={18} /></div>
                        <div className="kpi-value"><Counter value={pendingBacklog.length} /></div>
                        <div className="kpi-label">Posts en backlog</div>
                    </div>
                    <div className="kpi">
                        <div className="kpi-icon"><BarChart3 size={18} /></div>
                        <div className="kpi-value">
                            {annaYt ? <Counter value={annaYt.followers} /> : "—"}
                        </div>
                        <div className="kpi-label">Abonnés YouTube Anna</div>
                    </div>
                </div>

                {/* Social accounts */}
                <div className="card" style={{ marginBottom: "var(--space-6)" }}>
                    <div className="card-header">
                        <h3 className="card-title">Comptes sociaux analysés</h3>
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-4)" }}>
                        {[
                            { network: "instagram", label: "@anna.ollivier.psy", href: "https://www.instagram.com/anna.ollivier.psy/" },
                            { network: "facebook", label: "AnnaOllivierPsy", href: "https://www.facebook.com/AnnaOllivierPsy" },
                            { network: "youtube", label: "Confidences de tout-petits", href: "https://www.youtube.com/@Confidencesdetoutpetits-Monreg" },
                            { network: "tiktok", label: "@anna.ollivier.psy", href: "https://www.tiktok.com/@anna.ollivier.psy" },
                        ].map((account) => (
                            <a
                                key={account.network}
                                href={account.href}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="card"
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "var(--space-3)",
                                    padding: "var(--space-3) var(--space-5)",
                                    textDecoration: "none",
                                }}
                            >
                                <NetworkBadge network={account.network} />
                                <span style={{ fontFamily: "var(--font-sans)", fontSize: "var(--size-body)", color: "var(--fg)" }}>
                                    {account.label}
                                </span>
                            </a>
                        ))}
                    </div>
                </div>

                {/* Recent items — 2 columns */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-6)" }}>
                    <div className="card">
                        <div className="card-header">
                            <h3 className="card-title">Dernières Analyses</h3>
                        </div>
                        {analyses.slice(0, 5).length === 0 ? (
                            <p className="text-brandmuted" style={{ fontSize: "var(--size-body)" }}>Aucune analyse pour le moment</p>
                        ) : (
                            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-1)" }}>
                                {analyses.slice(0, 5).map((a) => (
                                    <div key={a.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "var(--space-2) 0", borderBottom: "1px solid var(--border)" }}>
                                        <div style={{ minWidth: 0 }}>
                                            <p style={{ fontFamily: "var(--font-sans)", fontWeight: 500, fontSize: "var(--size-body)", color: "var(--fg)" }}>{a.title}</p>
                                            <p style={{ fontSize: "var(--size-meta)", color: "var(--fg-muted)" }}>{a.plateforme} · {a.dateAnalyse}</p>
                                        </div>
                                        <span className="priority-pill" style={{ background: "var(--rose-ll)", color: "var(--mauve-d)" }}>
                                            Pertinence: {a.scorePertinence}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="card">
                        <div className="card-header">
                            <h3 className="card-title">Veille Concurrence</h3>
                        </div>
                        {veille.slice(0, 5).length === 0 ? (
                            <p className="text-brandmuted" style={{ fontSize: "var(--size-body)" }}>Aucune donnée de veille</p>
                        ) : (
                            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-1)" }}>
                                {veille.slice(0, 5).map((v) => (
                                    <div key={v.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "var(--space-2) 0", borderBottom: "1px solid var(--border)" }}>
                                        <div style={{ minWidth: 0 }}>
                                            <p style={{ fontFamily: "var(--font-sans)", fontWeight: 500, fontSize: "var(--size-body)", color: "var(--fg)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                                {v.title || "Veille sans titre"}
                                            </p>
                                            <p style={{ fontSize: "var(--size-meta)", color: "var(--fg-muted)" }}>
                                                {v.plateforme}{v.dateVeille ? ` · ${v.dateVeille}` : ""}
                                            </p>
                                        </div>
                                        <span className={`status-pill ${v.statut?.toLowerCase().includes("termin") ? "status-done" : "status-pending"}`}>
                                            {v.statut || "En cours"}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Social metrics */}
                {metrics?.snapshots && Object.keys(metrics.snapshots).length > 0 && (
                    <div style={{ marginTop: "var(--space-6)" }}>
                        {owners.map((owner) => {
                            const ownerPlatforms = platforms.filter((p) => metrics.snapshots[`${owner}_${p}`]);
                            if (ownerPlatforms.length === 0) return null;
                            return (
                                <div key={owner} className="card" style={{ marginBottom: "var(--space-6)" }}>
                                    <div className="card-header">
                                        <h3 className="card-title">{ownerLabels[owner] || owner} — Réseaux Sociaux</h3>
                                    </div>
                                    <div className="kpi-grid">
                                        {ownerPlatforms.map((platform) => {
                                            const key = `${owner}_${platform}`;
                                            const snaps = metrics.snapshots[key];
                                            const latest = snaps[0];
                                            const prev = snaps[1];
                                            const diff = prev ? latest.followers - prev.followers : 0;
                                            return (
                                                <div key={key} className="kpi">
                                                    <div className="kpi-icon">
                                                        <NetworkBadge network={platform} />
                                                    </div>
                                                    <div className="kpi-value"><Counter value={latest.followers} /></div>
                                                    <div className="kpi-label" style={{ display: "flex", alignItems: "center", gap: 4 }}>
                                                        {platform.charAt(0).toUpperCase() + platform.slice(1)}
                                                        {diff !== 0 && (
                                                            <span style={{ color: diff > 0 ? "var(--green)" : "var(--rose)", display: "inline-flex", alignItems: "center", gap: 2 }}>
                                                                {diff > 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                                                                {diff > 0 ? "+" : ""}{diff.toLocaleString("fr-FR")}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div style={{ fontSize: "var(--size-meta)", color: "var(--fg-muted)", marginTop: 2 }}>
                                                        Vues: {latest.totalViews?.toLocaleString("fr-FR") || "—"}
                                                    </div>
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
        </>
    );
}