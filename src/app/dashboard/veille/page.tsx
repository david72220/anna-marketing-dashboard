"use client";

import { useEffect, useState } from "react";
import Banner from "@/components/Banner";
import FilterChips from "@/components/FilterChips";
import PromptCard from "@/components/PromptCard";
import LaunchButton from "@/components/LaunchButton";
import NetworkBadge from "@/components/NetworkBadge";
import { Eye, RefreshCw, Search, Lightbulb, Target, Users, TrendingUp, BookOpen, Megaphone, BarChart3, CheckCircle, Key } from "lucide-react";

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

function extractUrls(text: string): { text: string; urls: Array<{ label: string; url: string }> } {
    const urlRegex = /https?:\/\/[^\s,)]+/g;
    const urls = Array.from(text.matchAll(urlRegex)).map((m) => ({
        label: m[0].replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, ""),
        url: m[0],
    }));
    return { text: text.replace(urlRegex, "").replace(/,\s*$/, "").trim(), urls };
}

function VeilleSection({ title, content, icon }: { title: string; content: string; icon: React.ReactNode }) {
    if (!content) return null;
    const { text, urls } = extractUrls(content);
    return (
        <div style={{ background: "var(--bg-soft)", borderRadius: "var(--radius)", padding: "var(--space-4)", marginBottom: "var(--space-3)" }}>
            <p style={{ fontSize: "var(--size-tag)", fontWeight: 500, color: "var(--fg-muted)", letterSpacing: "var(--tracking-eyebrow)", textTransform: "uppercase", marginBottom: 4, display: "flex", alignItems: "center", gap: 6 }}>
                {icon} {title}
            </p>
            {text && <p style={{ fontSize: "var(--size-body)", color: "var(--fg)", lineHeight: "var(--leading-body)", whiteSpace: "pre-line" }}>{text}</p>}
            {urls.length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-2)", marginTop: "var(--space-2)" }}>
                    {urls.map((u, i) => (
                        <a
                            key={i}
                            href={u.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="priority-pill"
                            style={{ background: "var(--white)", color: "var(--mauve)", textDecoration: "none" }}
                        >
                            {u.label} ↗
                        </a>
                    ))}
                </div>
            )}
        </div>
    );
}

export default function VeillePage() {
    const [items, setItems] = useState<VeilleItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [filter, setFilter] = useState("all");
    const [prompt, setPrompt] = useState("");
    const [searching, setSearching] = useState(false);
    const [statusMessage, setStatusMessage] = useState("");
    const [selectedId, setSelectedId] = useState<string | null>(null);

    const loadData = async () => {
        setLoading(true);
        try {
            const r = await fetch("/api/notion/veille");
            if (!r.ok) throw new Error("Erreur " + r.status);
            const data = await r.json();
            setItems(Array.isArray(data) ? data : []);
        } catch (e: any) {
            setError(e.message || "Erreur");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadData(); }, []);

    const handleSearch = async () => {
        setSearching(true);
        setStatusMessage("");
        try {
            const r = await fetch("/api/notion/veille", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ prompt }),
            });
            const data = await r.json();
            if (data.error) throw new Error(data.error);
            setStatusMessage(data.message || "Veille lancée via N8N");
            if (data.keywords?.length) {
                setStatusMessage((prev) => prev + ` — ${data.keywords.length} mots-clés utilisés`);
            }
            setTimeout(() => loadData(), 5000);
        } catch (e: any) {
            setError(e.message || "Erreur lors de la recherche");
        } finally {
            setSearching(false);
        }
    };

    const filtered = filter === "all" ? items : items.filter((v) =>
        v.plateforme?.toLowerCase().includes(filter.toLowerCase())
    );
    const platforms = [...new Set(items.map((v) => v.plateforme).filter(Boolean))];
    const selected = selectedId ? items.find((v) => v.id === selectedId) : null;

    const filterItems = [
        { id: "all", label: "Toutes" },
        ...platforms.map((p) => ({ id: p, label: p })),
    ];

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
                        <div className="page-eyebrow">Ce que disent les autres</div>
                        <h1 className="page-title">
                            Veille <em>concurrence</em>
                        </h1>
                        <p className="page-sub">Inspirations, signaux faibles et recommandations à actionner cette semaine.</p>
                    </div>
                    <div className="page-actions">
                        <button className="btn btn-ghost" onClick={() => loadData()}>
                            <RefreshCw size={12} /> Actualiser
                        </button>
                    </div>
                </div>

                {/* Search prompt */}
                <PromptCard
                    icon={<Eye size={20} />}
                    title="Lancer une veille"
                    subtitle="Recherchez les tendances et analysez vos concurrents"
                >
                    <div style={{ display: "flex", gap: "var(--space-3)", marginBottom: "var(--space-3)" }}>
                        <input
                            type="text"
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            placeholder="Décrivez ce que vous cherchez (ex: stratégie Instagram…)"
                            className="prompt-card-input"
                            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                        />
                        <LaunchButton loading={searching} onClick={handleSearch}>
                            <Search size={16} /> Lancer la veille
                        </LaunchButton>
                    </div>
                    {statusMessage && (
                        <p style={{ fontSize: "var(--size-meta)", color: "var(--mauve)", marginTop: "var(--space-2)" }}>
                            {statusMessage}
                        </p>
                    )}
                </PromptCard>

                {/* Filters */}
                {platforms.length > 0 && (
                    <FilterChips items={filterItems} active={filter} onChange={setFilter} />
                )}

                {/* Content */}
                {filtered.length === 0 ? (
                    <div className="card" style={{ textAlign: "center", padding: "var(--space-16) var(--space-8)" }}>
                        <p style={{ fontFamily: "var(--font-serif)", fontSize: "var(--size-h2-min)", color: "var(--fg)" }}>
                            Aucune donnée de veille
                        </p>
                        <p style={{ fontSize: "var(--size-body)", color: "var(--fg-muted)", marginTop: "var(--space-2)" }}>
                            Lancez une veille pour analyser vos concurrents.
                        </p>
                    </div>
                ) : (
                    <div className="analysis-layout">
                        <div className="analysis-list">
                            {filtered.map((v) => (
                                <button
                                    key={v.id}
                                    className={`analysis-list-item ${selectedId === v.id ? "active" : ""}`}
                                    onClick={() => setSelectedId(v.id)}
                                >
                                    <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", marginBottom: 4 }}>
                                        <NetworkBadge network={v.plateforme} size={24} />
                                        <span style={{ fontSize: "var(--size-meta)", color: "var(--fg-muted)" }}>{v.plateforme}</span>
                                        <span className={`status-pill ${v.statut?.toLowerCase().includes("termin") ? "status-done" : "status-pending"}`}>
                                            {v.statut || "En cours"}
                                        </span>
                                    </div>
                                    <div style={{ fontFamily: "var(--font-sans)", fontWeight: 500, fontSize: "var(--size-body)", color: "var(--fg)" }}>
                                        {v.title || "Veille sans titre"}
                                    </div>
                                    <div style={{ fontSize: "var(--size-tag)", color: "var(--fg-muted)", marginTop: 2 }}>
                                        {v.dateVeille}
                                    </div>
                                    {v.motsClesUtilises && (
                                        <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 4 }}>
                                            {v.motsClesUtilises.split(",").slice(0, 3).map((kw, i) => (
                                                <span key={i} className="priority-pill" style={{ background: "var(--rose-ll)", color: "var(--mauve-d)" }}>
                                                    {kw.trim()}
                                                </span>
                                            ))}
                                            {v.motsClesUtilises.split(",").length > 3 && (
                                                <span style={{ fontSize: "var(--size-tag)", color: "var(--fg-muted)" }}>
                                                    +{v.motsClesUtilises.split(",").length - 3}
                                                </span>
                                            )}
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
                                                {selected.title || "Veille sans titre"}
                                            </h2>
                                            <p style={{ fontSize: "var(--size-meta)", color: "var(--fg-muted)" }}>
                                                {selected.plateforme} · {selected.dateVeille}
                                            </p>
                                        </div>
                                        <span className={`status-pill ${selected.statut?.toLowerCase().includes("termin") ? "status-done" : "status-pending"}`}>
                                            {selected.statut || "En cours"}
                                        </span>
                                    </div>

                                    {selected.motsClesUtilises && (
                                        <div style={{ background: "var(--bg-soft)", borderRadius: "var(--radius)", padding: "var(--space-3)", marginBottom: "var(--space-4)" }}>
                                            <p style={{ fontSize: "var(--size-tag)", fontWeight: 500, color: "var(--fg-muted)", letterSpacing: "var(--tracking-eyebrow)", textTransform: "uppercase", marginBottom: 4, display: "flex", alignItems: "center", gap: 6 }}>
                                                <Key size={14} /> Mots-clés utilisés
                                            </p>
                                            <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-1)" }}>
                                                {selected.motsClesUtilises.split(",").map((kw, i) => (
                                                    <span key={i} className="priority-pill" style={{ background: "var(--rose-ll)", color: "var(--mauve-d)" }}>
                                                        {kw.trim()}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    <VeilleSection title="Résumé" content={selected.resume} icon={<BookOpen size={14} />} />
                                    <VeilleSection title="Thèmes dominants" content={selected.themesDominants} icon={<Target size={14} />} />
                                    <VeilleSection title="Concurrents" content={selected.concurrents} icon={<Users size={14} />} />
                                    <VeilleSection title="Points forts concurrents" content={selected.pointsFortsConcurrents} icon={<TrendingUp size={14} />} />
                                    <VeilleSection title="Produits concurrents" content={selected.produitsConcurrents} icon={<BarChart3 size={14} />} />
                                    <VeilleSection title="Positionnement Anna" content={selected.positionnementAnna} icon={<Lightbulb size={14} />} />
                                    <VeilleSection title="Angles non exploités" content={selected.anglesNonExploites} icon={<Search size={14} />} />
                                    <VeilleSection title="Formats performants" content={selected.formatsPerformants} icon={<Megaphone size={14} />} />
                                    <VeilleSection title="Mots-clés opportunités" content={selected.motsCles} icon={<Key size={14} />} />
                                    <VeilleSection title="Recommandations" content={selected.recommandations} icon={<CheckCircle size={14} />} />
                                </div>
                            ) : (
                                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", minHeight: 300, color: "var(--fg-muted)", fontSize: "var(--size-body)" }}>
                                    Sélectionnez une veille pour voir les détails
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}