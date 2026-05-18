"use client";

import { useEffect, useState } from "react";
import Banner from "@/components/Banner";
import FilterChips from "@/components/FilterChips";
import PromptCard from "@/components/PromptCard";
import LaunchButton from "@/components/LaunchButton";
import NotionField from "@/components/NotionField";
import NetworkBadge from "@/components/NetworkBadge";
import { PenLine, RefreshCw, Zap, Target, MessageCircle, CheckCircle, Megaphone, ChevronDown } from "lucide-react";

interface BacklogItem {
    id: string;
    title: string;
    plateforme: string;
    format: string;
    hook: string;
    problemeCible: string;
    messageCle: string;
    solution: string;
    cta: string;
    hashtags: string;
    priorite: string;
    statut: string;
    dateGeneration: string;
    suggestionScore?: number;
}

const priorityConfig: Record<string, { bg: string; color: string }> = {
    Haute: { bg: "var(--rose-ll)", color: "var(--rose)" },
    Moyenne: { bg: "var(--mauve-l)", color: "var(--mauve-d)" },
    Basse: { bg: "var(--green-l)", color: "var(--green)" },
};

const statusConfig: Record<string, { bg: string; color: string; cls: string }> = {
    "En attente": { bg: "var(--warm)", color: "var(--fg-muted)", cls: "status-pending" },
    Idee: { bg: "var(--mauve-l)", color: "var(--mauve-d)", cls: "status-pending" },
    "En cours": { bg: "var(--mauve-l)", color: "var(--mauve-d)", cls: "status-pending" },
    Termine: { bg: "var(--green-l)", color: "var(--green)", cls: "status-done" },
    "Terminé": { bg: "var(--green-l)", color: "var(--green)", cls: "status-done" },
};

export default function BacklogPage() {
    const [items, setItems] = useState<BacklogItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState("all");
    const [prompt, setPrompt] = useState("");
    const [questions, setQuestions] = useState("");
    const [suggestLoading, setSuggestLoading] = useState(false);
    const [suggestions, setSuggestions] = useState<BacklogItem[]>([]);
    const [suggestMode, setSuggestMode] = useState(false);
    const [inProgress, setInProgress] = useState(false);
    const [statusMessage, setStatusMessage] = useState("");
    const [expandedId, setExpandedId] = useState<string | null>(null);

    useEffect(() => {
        fetch("/api/notion/backlog")
            .then((r) => r.json())
            .then((data) => { setItems(Array.isArray(data) ? data : []); setLoading(false); })
            .catch(() => setLoading(false));
    }, []);

    const handleGenerate = async () => {
        setSuggestLoading(true);
        setInProgress(false);
        setStatusMessage("");
        try {
            const res = await fetch("/api/notion/backlog", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ prompt, questions: questions || undefined }),
            });
            const data = await res.json();

            if (data.status === "En cours") {
                setInProgress(true);
                setStatusMessage("Analyse en cours… La liste sera rafraîchie automatiquement.");
                setTimeout(() => window.location.reload(), 4000);
                return;
            }

            setSuggestions(Array.isArray(data.suggestions) ? data.suggestions : []);
            setSuggestMode(true);
        } catch {
            setStatusMessage("Une erreur est survenue lors de la génération.");
        } finally {
            setSuggestLoading(false);
        }
    };

    const handleRefresh = () => {
        setLoading(true);
        fetch("/api/notion/backlog")
            .then((r) => r.json())
            .then((data) => { setItems(Array.isArray(data) ? data : []); setLoading(false); })
            .catch(() => setLoading(false));
    };

    const displayItems = suggestMode
        ? (Array.isArray(suggestions) ? suggestions : [])
        : (filter === "all" ? items : items.filter((b) => b.plateforme === filter));
    const platforms = [...new Set(items.map((b) => b.plateforme).filter(Boolean))];

    const filterItems = [
        { id: "all", label: "Tous" },
        ...platforms.map((p) => ({ id: p, label: p })),
    ];

    if (loading) {
        return (
            <>
                <Banner screen="backlog" />
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
            <Banner screen="backlog" />
            <div className="page">
                <div className="page-header">
                    <div>
                        <div className="page-eyebrow">Atelier créatif</div>
                        <h1 className="page-title">
                            Backlog <em>posts</em>
                        </h1>
                        <p className="page-sub">Idées, brouillons et publications prêtes — votre flux éditorial à venir.</p>
                    </div>
                    <div className="page-actions">
                        <button className="btn btn-ghost" onClick={handleRefresh}>
                            <RefreshCw size={12} /> Actualiser
                        </button>
                    </div>
                </div>

                {/* Generate prompt */}
                <PromptCard
                    icon={<PenLine size={20} />}
                    title="Générer des suggestions"
                    subtitle="Lancez l'automatisation N8N pour créer de nouvelles idées de contenu"
                >
                    <textarea
                        className="prompt-card-input"
                        rows={3}
                        placeholder="Exemple : format carrousel Instagram, 2 fois par semaine, parents d'adolescents…"
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                    />
                    <textarea
                        className="prompt-card-input"
                        rows={2}
                        placeholder="Questions ou informations complémentaires (optionnel)"
                        value={questions}
                        onChange={(e) => setQuestions(e.target.value)}
                        style={{ marginTop: "var(--space-2)" }}
                    />
                    <div style={{ display: "flex", alignItems: "center", gap: "var(--space-4)", marginTop: "var(--space-3)" }}>
                        <LaunchButton loading={suggestLoading || inProgress} onClick={handleGenerate}>
                            <Zap size={16} /> Générer des suggestions
                        </LaunchButton>
                        {suggestMode && !inProgress && (
                            <button className="btn btn-ghost" onClick={() => setSuggestMode(false)}>
                                Voir tout le backlog
                            </button>
                        )}
                    </div>
                    {inProgress && statusMessage && (
                        <p style={{ fontSize: "var(--size-meta)", color: "var(--mauve)", marginTop: "var(--space-2)", animation: "pulse 2s infinite" }}>
                            {statusMessage}
                        </p>
                    )}
                </PromptCard>

                {/* Filters */}
                {!suggestMode && platforms.length > 0 && (
                    <FilterChips items={filterItems} active={filter} onChange={setFilter} />
                )}

                {/* Content */}
                {inProgress ? (
                    <div className="card" style={{ textAlign: "center", padding: "var(--space-16) var(--space-8)" }}>
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-mauve mx-auto" style={{ marginBottom: "var(--space-4)" }} />
                        <p style={{ fontFamily: "var(--font-serif)", color: "var(--fg)" }}>Analyse en cours…</p>
                        <p style={{ fontSize: "var(--size-body)", color: "var(--fg-muted)", marginTop: "var(--space-2)" }}>
                            Le workflow N8N génère des suggestions. La page se rafraîchira automatiquement.
                        </p>
                    </div>
                ) : displayItems.length === 0 ? (
                    <div className="card" style={{ textAlign: "center", padding: "var(--space-16) var(--space-8)" }}>
                        <p style={{ fontFamily: "var(--font-serif)", fontSize: "var(--size-h2-min)", color: "var(--fg)" }}>
                            Aucune suggestion disponible
                        </p>
                        <p style={{ fontSize: "var(--size-body)", color: "var(--fg-muted)", marginTop: "var(--space-2)" }}>
                            Les automatisations généreront des suggestions de contenu.
                        </p>
                    </div>
                ) : (
                    <div className="backlog-list">
                        {displayItems.map((b) => {
                            const isExpanded = expandedId === b.id;
                            const prio = priorityConfig[b.priorite] || priorityConfig.Moyenne;
                            const stat = statusConfig[b.statut] || statusConfig.Idee;

                            return (
                                <div
                                    key={b.id}
                                    className="backlog-row"
                                    onClick={() => setExpandedId(isExpanded ? null : b.id)}
                                >
                                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", padding: "var(--space-5) var(--space-6)", cursor: "pointer" }}>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", marginBottom: 4 }}>
                                                <NetworkBadge network={b.plateforme} size={22} />
                                                <span style={{ fontSize: "var(--size-meta)", color: "var(--fg-muted)" }}>
                                                    {b.plateforme}{b.format ? ` · ${b.format}` : ""}
                                                </span>
                                            </div>
                                            <div style={{ fontFamily: "var(--font-serif)", fontWeight: 500, fontSize: "var(--size-body-lg)", color: "var(--fg)" }}>
                                                {b.title || "Post sans titre"}
                                            </div>
                                            {b.dateGeneration && (
                                                <div style={{ fontSize: "var(--size-tag)", color: "var(--fg-muted)", marginTop: 2 }}>
                                                    {b.dateGeneration}
                                                </div>
                                            )}
                                        </div>
                                        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", marginLeft: "var(--space-4)", flexShrink: 0 }}>
                                            {b.suggestionScore !== undefined && (
                                                <span className="priority-pill" style={{ background: "var(--rose-ll)", color: "var(--rose)" }}>
                                                    Score: {Math.round(b.suggestionScore)}%
                                                </span>
                                            )}
                                            <span className="priority-pill" style={{ background: prio.bg, color: prio.color }}>
                                                {b.priorite || "Moyenne"}
                                            </span>
                                            <span className={`status-pill ${stat.cls}`}>
                                                {b.statut || "Idée"}
                                            </span>
                                            <ChevronDown
                                                size={18}
                                                style={{
                                                    color: "var(--fg-muted)",
                                                    transition: "transform 0.2s",
                                                    transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)",
                                                }}
                                            />
                                        </div>
                                    </div>

                                    {isExpanded && (
                                        <div className="backlog-detail">
                                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-3)" }}>
                                                {b.hook && <NotionField icon={<Zap size={14} />} label="Hook">{b.hook}</NotionField>}
                                                {b.problemeCible && <NotionField icon={<Target size={14} />} label="Problème cible">{b.problemeCible}</NotionField>}
                                                {b.messageCle && <NotionField icon={<MessageCircle size={14} />} label="Message clé">{b.messageCle}</NotionField>}
                                                {b.solution && <NotionField icon={<CheckCircle size={14} />} label="Solution">{b.solution}</NotionField>}
                                                {b.cta && <NotionField icon={<Megaphone size={14} />} label="CTA">{b.cta}</NotionField>}
                                            </div>

                                            {b.hashtags && (
                                                <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-1)", marginTop: "var(--space-3)" }}>
                                                    {b.hashtags.split(/[,\s]+/).filter(Boolean).map((kw, i) => (
                                                        <span key={i} className="priority-pill" style={{ background: "var(--bg-soft)", color: "var(--fg-muted)" }}>
                                                            {kw.trim()}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </>
    );
}