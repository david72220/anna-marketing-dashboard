"use client";

import { Fragment, useEffect, useState } from "react";
import Banner from "@/components/Banner";
import FilterChips from "@/components/FilterChips";
import LaunchButton from "@/components/LaunchButton";
import NetworkBadge from "@/components/NetworkBadge";
import Counter from "@/components/Counter";
import ScoreBadge from "@/components/ScoreBadge";
import { formatDate } from "@/lib/notion";
import { RefreshCw, Users, FileText, TrendingUp, Flame, ChevronDown, Sparkles } from "lucide-react";

const SURPERFORMANCE_THRESHOLD = 1.5;

interface PostConcurrent {
    id: string;
    accroche: string;
    plateforme: string;
    type: string;
    url: string;
    datePublication: string;
    vues: number;
    likes: number;
    commentaires: number;
    metriqueScore: string;
    score: number | null;
    analyseIA: string;
    angle: string;
    transposable: string;
    recycle: boolean;
    createdTime: string;
}

interface CompteConcurrent {
    id: string;
    nom: string;
    plateforme: string;
    handle: string;
    actif: boolean;
    moyenneVues: number;
    moyenneLikes: number;
    nbBaseline: number;
    derniereCollecte: string;
}

interface ConcurrentsData {
    posts: PostConcurrent[];
    comptes: CompteConcurrent[];
}

const thStyle: React.CSSProperties = {
    textAlign: "left",
    padding: "var(--space-3) var(--space-4)",
    fontSize: "var(--size-tag)",
    fontWeight: 500,
    color: "var(--fg-muted)",
    textTransform: "uppercase",
    letterSpacing: "var(--tracking-eyebrow)",
    borderBottom: "1px solid var(--border)",
    whiteSpace: "nowrap",
};

const tdStyle: React.CSSProperties = {
    padding: "var(--space-3) var(--space-4)",
    fontSize: "var(--size-body)",
    color: "var(--fg)",
    borderBottom: "1px solid var(--border)",
    verticalAlign: "middle",
};

export default function ConcurrentsPage() {
    const [data, setData] = useState<ConcurrentsData>({ posts: [], comptes: [] });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [launching, setLaunching] = useState(false);
    const [launchMessage, setLaunchMessage] = useState("");
    const [platformFilter, setPlatformFilter] = useState("all");
    const [onlyOverperforming, setOnlyOverperforming] = useState(false);
    const [expandedId, setExpandedId] = useState<string | null>(null);

    const loadData = async () => {
        setLoading(true);
        try {
            const r = await fetch("/api/notion/concurrents");
            if (!r.ok) throw new Error("Erreur " + r.status);
            const json = await r.json();
            if (json.error) throw new Error(json.error);
            setData({
                posts: Array.isArray(json.posts) ? json.posts : [],
                comptes: Array.isArray(json.comptes) ? json.comptes : [],
            });
        } catch (e: any) {
            setError(e.message || "Erreur");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadData(); }, []);

    const handleLaunch = async () => {
        setLaunching(true);
        setLaunchMessage("");
        try {
            const r = await fetch("/api/notion/concurrents", { method: "POST" });
            const json = await r.json();
            if (json.error) throw new Error(json.error);
            setLaunchMessage(
                json.success
                    ? "Collecte lancée via N8N — les nouvelles publications arrivent généralement en quelques minutes."
                    : `Le déclenchement a répondu avec le statut ${json.status}.`
            );
            setTimeout(() => loadData(), 5000);
        } catch (e: any) {
            setError(e.message || "Erreur lors du déclenchement de la collecte");
        } finally {
            setLaunching(false);
        }
    };

    const filterItems = [
        { id: "all", label: "Toutes" },
        { id: "Instagram", label: "Instagram" },
        { id: "TikTok", label: "TikTok" },
    ];

    const filteredPosts = data.posts
        .filter((p) => platformFilter === "all" || p.plateforme?.toLowerCase() === platformFilter.toLowerCase())
        .filter((p) => !onlyOverperforming || (p.score !== null && p.score >= SURPERFORMANCE_THRESHOLD))
        .sort((a, b) => {
            if (a.score === null && b.score === null) return 0;
            if (a.score === null) return 1;
            if (b.score === null) return -1;
            return b.score - a.score;
        });

    const comptesActifs = data.comptes.filter((c) => c.actif).length;
    const totalPublications = data.posts.length;
    const scoresValides = data.posts
        .map((p) => p.score)
        .filter((s): s is number => s !== null);
    const scoreMax = scoresValides.length ? Math.max(...scoresValides) : null;
    const nbSurperformance = data.posts.filter(
        (p) => p.score !== null && p.score >= SURPERFORMANCE_THRESHOLD
    ).length;

    if (loading) {
        return (
            <>
                <Banner screen="veille" />
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
                <Banner screen="veille" />
                <div className="page">
                    <p style={{ color: "var(--rose)" }}>Erreur : {error}</p>
                </div>
            </>
        );
    }

    return (
        <>
            <Banner screen="veille" />
            <div className="page">
                <div className="page-header">
                    <div>
                        <div className="page-eyebrow">Repérer les coups exceptionnels</div>
                        <h1 className="page-title">
                            Veille performance <em>concurrents</em>
                        </h1>
                        <p className="page-sub">
                            Le score de surperformance compare chaque publication à la moyenne habituelle de son
                            propre compte — il fait ressortir un petit compte qui perce, invisible dans un classement
                            par vues brutes.
                        </p>
                    </div>
                    <div className="page-actions">
                        <button className="btn btn-ghost" onClick={() => loadData()}>
                            <RefreshCw size={12} /> Actualiser
                        </button>
                        <LaunchButton loading={launching} onClick={handleLaunch}>
                            <Sparkles size={16} /> Lancer la collecte
                        </LaunchButton>
                    </div>
                </div>

                {launchMessage && (
                    <p style={{ fontSize: "var(--size-meta)", color: "var(--mauve)", marginBottom: "var(--space-4)" }}>
                        {launchMessage}
                    </p>
                )}

                {/* KPI grid */}
                <div className="kpi-grid">
                    <div className="kpi">
                        <div className="kpi-icon"><Users size={18} /></div>
                        <div className="kpi-value"><Counter value={comptesActifs} /></div>
                        <div className="kpi-label">Comptes actifs suivis</div>
                    </div>
                    <div className="kpi">
                        <div className="kpi-icon"><FileText size={18} /></div>
                        <div className="kpi-value"><Counter value={totalPublications} /></div>
                        <div className="kpi-label">Publications collectées</div>
                    </div>
                    <div className="kpi">
                        <div className="kpi-icon"><TrendingUp size={18} /></div>
                        <div className="kpi-value">
                            {scoreMax !== null ? <Counter value={scoreMax} decimals={2} suffix="×" /> : "—"}
                        </div>
                        <div className="kpi-label">Score maximum</div>
                    </div>
                    <div className="kpi">
                        <div className="kpi-icon"><Flame size={18} /></div>
                        <div className="kpi-value"><Counter value={nbSurperformance} /></div>
                        <div className="kpi-label">Au-dessus du seuil (≥ 1,5×)</div>
                    </div>
                </div>

                {/* Filters */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "var(--space-3)", marginBottom: "var(--space-4)" }}>
                    <FilterChips items={filterItems} active={platformFilter} onChange={setPlatformFilter} />
                    <div className="filter-chips">
                        <button
                            className={`filter-chip ${onlyOverperforming ? "active" : ""}`}
                            onClick={() => setOnlyOverperforming((v) => !v)}
                        >
                            <Flame size={12} /> Surperformance seulement
                        </button>
                    </div>
                </div>

                {/* Content */}
                {data.posts.length === 0 ? (
                    <div className="card" style={{ textAlign: "center", padding: "var(--space-16) var(--space-8)" }}>
                        <p style={{ fontFamily: "var(--font-serif)", fontSize: "var(--size-h2-min)", color: "var(--fg)" }}>
                            Aucun concurrent suivi pour l&apos;instant
                        </p>
                        <p style={{ fontSize: "var(--size-body)", color: "var(--fg-muted)", marginTop: "var(--space-2)", maxWidth: 480, marginLeft: "auto", marginRight: "auto" }}>
                            Le workflow de collecte hebdomadaire n&apos;a pas encore tourné : aucune publication concurrente
                            n&apos;a été enregistrée dans Notion. Lancez une première collecte avec le bouton
                            « Lancer la collecte » ci-dessus.
                        </p>
                    </div>
                ) : filteredPosts.length === 0 ? (
                    <div className="card" style={{ textAlign: "center", padding: "var(--space-16) var(--space-8)" }}>
                        <p style={{ fontFamily: "var(--font-serif)", fontSize: "var(--size-h2-min)", color: "var(--fg)" }}>
                            Aucune publication ne correspond à ce filtre
                        </p>
                        <p style={{ fontSize: "var(--size-body)", color: "var(--fg-muted)", marginTop: "var(--space-2)" }}>
                            Essayez « Toutes » ou désactivez « Surperformance seulement ».
                        </p>
                    </div>
                ) : (
                    <div className="card" style={{ padding: 0, overflowX: "auto" }}>
                        <table style={{ width: "100%", borderCollapse: "collapse" }}>
                            <thead>
                                <tr>
                                    <th style={thStyle}>Plateforme</th>
                                    <th style={thStyle}>Publication</th>
                                    <th style={thStyle}>Type</th>
                                    <th style={thStyle}>Score</th>
                                    <th style={{ ...thStyle, textAlign: "right" }}>Vues</th>
                                    <th style={{ ...thStyle, textAlign: "right" }}>Likes</th>
                                    <th style={{ ...thStyle, textAlign: "right" }}>Commentaires</th>
                                    <th style={thStyle}>Date</th>
                                    <th style={thStyle} />
                                </tr>
                            </thead>
                            <tbody>
                                {filteredPosts.map((post) => {
                                    const isExpandable =
                                        post.score !== null &&
                                        post.score >= SURPERFORMANCE_THRESHOLD &&
                                        Boolean(post.analyseIA);
                                    const isExpanded = expandedId === post.id;

                                    return (
                                        <Fragment key={post.id}>
                                            <tr
                                                onClick={() => isExpandable && setExpandedId(isExpanded ? null : post.id)}
                                                style={{ cursor: isExpandable ? "pointer" : "default" }}
                                            >
                                                <td style={tdStyle}>
                                                    <NetworkBadge network={post.plateforme} size={24} />
                                                </td>
                                                <td style={tdStyle}>
                                                    <a
                                                        href={post.url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        style={{ color: "var(--link)", fontWeight: 500, textDecoration: "none" }}
                                                        onClick={(e) => e.stopPropagation()}
                                                    >
                                                        {post.accroche || "Sans accroche"}
                                                    </a>
                                                </td>
                                                <td style={tdStyle}>{post.type}</td>
                                                <td style={tdStyle}>
                                                    <ScoreBadge score={post.score} metrique={post.metriqueScore} />
                                                </td>
                                                <td style={{ ...tdStyle, textAlign: "right" }}>{post.vues.toLocaleString("fr-FR")}</td>
                                                <td style={{ ...tdStyle, textAlign: "right" }}>{post.likes.toLocaleString("fr-FR")}</td>
                                                <td style={{ ...tdStyle, textAlign: "right" }}>{post.commentaires.toLocaleString("fr-FR")}</td>
                                                <td style={tdStyle}>{formatDate(post.datePublication)}</td>
                                                <td style={{ ...tdStyle, width: 32 }}>
                                                    {isExpandable && (
                                                        <ChevronDown
                                                            size={16}
                                                            style={{
                                                                color: "var(--mauve)",
                                                                transition: "transform 0.2s",
                                                                transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)",
                                                            }}
                                                        />
                                                    )}
                                                </td>
                                            </tr>
                                            {isExpanded && (
                                                <tr>
                                                    <td colSpan={9} style={{ ...tdStyle, background: "var(--bg-soft)" }}>
                                                        <p style={{ fontSize: "var(--size-tag)", fontWeight: 500, color: "var(--fg-muted)", letterSpacing: "var(--tracking-eyebrow)", textTransform: "uppercase", marginBottom: 4 }}>
                                                            Analyse IA
                                                        </p>
                                                        <p style={{ fontSize: "var(--size-body)", color: "var(--fg)", lineHeight: "var(--leading-body)", whiteSpace: "pre-line" }}>
                                                            {post.analyseIA}
                                                        </p>
                                                    </td>
                                                </tr>
                                            )}
                                        </Fragment>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </>
    );
}
