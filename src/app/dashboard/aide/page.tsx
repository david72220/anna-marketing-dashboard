"use client";

import Banner from "@/components/Banner";
import {
    Home, Search, Eye, PenLine, BarChart3, TrendingUp,
    Wand2, Recycle, Compass, RefreshCw, Clock,
} from "lucide-react";

const PAGES = [
    {
        icon: <Home size={16} />,
        titre: "Vue d'ensemble",
        quoi: "Le résumé du jour : dernières analyses, veilles et idées de posts.",
        faire: "Rien à faire ici — c'est le point de départ chaque matin.",
    },
    {
        icon: <Search size={16} />,
        titre: "Analyses Contenu",
        quoi: "L'IA analyse les contenus d'Anna (YouTube, TikTok…) : scores, points forts, axes d'amélioration.",
        faire: "Cliquer « Lancer une analyse », choisir la plateforme. Résultat en 1 à 2 minutes.",
    },
    {
        icon: <Eye size={16} />,
        titre: "Veille Concurrence",
        quoi: "Ce que publient les concurrents : thèmes qui marchent, angles non exploités, recommandations.",
        faire: "« Lancer la veille » pour une nouvelle recherche. Sur chaque veille : « Créer le prompt » transforme l'idée du post concurrent en consigne de création en français, prête à adapter — bouton « Copier » pour la récupérer, aussi enregistrée dans Notion (colonne Prompt).",
    },
    {
        icon: <PenLine size={16} />,
        titre: "Backlog Posts",
        quoi: "La réserve d'idées de posts : suggestions générées chaque mercredi + posts concurrents recyclés.",
        faire: "Piocher une idée, la publier, changer son statut dans Notion.",
    },
    {
        icon: <BarChart3 size={16} />,
        titre: "KPI réseaux",
        quoi: "Les chiffres des comptes d'Anna : abonnés, vues, engagement.",
        faire: "Consulter — mise à jour automatique.",
    },
    {
        icon: <TrendingUp size={16} />,
        titre: "Concurrents",
        quoi: "Les publications des comptes concurrents suivis, avec un score : 2× = deux fois mieux que d'habitude pour ce compte. Ce qui dépasse 1,5× est analysé par l'IA.",
        faire: "« Recycler » envoie un post surperformant dans le Backlog. « Découvrir des concurrents » cherche de nouveaux comptes via les hashtags — ils arrivent dans Notion, cocher « Actif » sur ceux à suivre.",
    },
];

const AUTOMATISMES = [
    { quand: "Lundi 8h", quoi: "Collecte des posts concurrents + calcul des scores (comptes cochés « Actif » dans Notion)." },
    { quand: "Lundi 9h", quoi: "Veille concurrence automatique." },
    { quand: "Mercredi 10h", quoi: "5 nouvelles idées de posts dans le Backlog — nourries par les posts concurrents qui surperforment — + mail récapitulatif." },
];

const RACCOURCIS = [
    { action: "Analyser un contenu d'Anna", ou: "Analyses → « Lancer une analyse »", icon: <Search size={13} /> },
    { action: "Chercher ce que font les concurrents", ou: "Veille → « Lancer la veille »", icon: <Eye size={13} /> },
    { action: "Transformer une veille en idée de post", ou: "Veille → sélectionner une ligne → « Créer le prompt »", icon: <Wand2 size={13} /> },
    { action: "Réutiliser un post concurrent qui a explosé", ou: "Concurrents → « Recycler » sur le post", icon: <Recycle size={13} /> },
    { action: "Trouver de nouveaux comptes à suivre", ou: "Concurrents → « Découvrir des concurrents », puis cocher « Actif » dans Notion", icon: <Compass size={13} /> },
    { action: "Rafraîchir une page", ou: "Bouton « Actualiser » en haut de chaque page", icon: <RefreshCw size={13} /> },
];

export default function AidePage() {
    return (
        <>
            <Banner screen="aide" />
            <div className="page">
                <div className="page-header">
                    <div>
                        <div className="page-eyebrow">Mode d&apos;emploi</div>
                        <h1 className="page-title">
                            Comment ça <em>marche</em>
                        </h1>
                        <p className="page-sub">
                            L&apos;essentiel en une page : où cliquer, et ce qui se fait tout seul.
                        </p>
                    </div>
                </div>

                {/* Je veux… */}
                <div className="card" style={{ padding: "var(--space-5)", marginBottom: "var(--space-5)" }}>
                    <p style={{ fontSize: "var(--size-tag)", fontWeight: 500, color: "var(--fg-muted)", letterSpacing: "var(--tracking-eyebrow)", textTransform: "uppercase", marginBottom: "var(--space-3)" }}>
                        Je veux…
                    </p>
                    {RACCOURCIS.map((r, i) => (
                        <div key={i} style={{ display: "flex", alignItems: "baseline", gap: "var(--space-3)", padding: "var(--space-2) 0", borderBottom: i < RACCOURCIS.length - 1 ? "1px solid var(--bg-soft)" : "none" }}>
                            <span style={{ color: "var(--mauve)", flexShrink: 0, position: "relative", top: 2 }}>{r.icon}</span>
                            <span style={{ fontSize: "var(--size-body)", color: "var(--fg)", minWidth: "40%" }}>{r.action}</span>
                            <span style={{ fontSize: "var(--size-meta)", color: "var(--fg-muted)" }}>{r.ou}</span>
                        </div>
                    ))}
                </div>

                {/* Pages */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "var(--space-4)", marginBottom: "var(--space-5)" }}>
                    {PAGES.map((p) => (
                        <div key={p.titre} className="card" style={{ padding: "var(--space-4)" }}>
                            <p style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 500, fontSize: "var(--size-body)", color: "var(--fg)", marginBottom: "var(--space-2)" }}>
                                <span style={{ color: "var(--mauve)" }}>{p.icon}</span> {p.titre}
                            </p>
                            <p style={{ fontSize: "var(--size-meta)", color: "var(--fg)", lineHeight: "var(--leading-body)", marginBottom: "var(--space-2)" }}>
                                {p.quoi}
                            </p>
                            <p style={{ fontSize: "var(--size-meta)", color: "var(--fg-muted)", lineHeight: "var(--leading-body)" }}>
                                → {p.faire}
                            </p>
                        </div>
                    ))}
                </div>

                {/* Automatismes */}
                <div className="card" style={{ padding: "var(--space-5)" }}>
                    <p style={{ fontSize: "var(--size-tag)", fontWeight: 500, color: "var(--fg-muted)", letterSpacing: "var(--tracking-eyebrow)", textTransform: "uppercase", marginBottom: "var(--space-3)", display: "flex", alignItems: "center", gap: 6 }}>
                        <Clock size={14} /> Ce qui se fait tout seul
                    </p>
                    {AUTOMATISMES.map((a, i) => (
                        <div key={i} style={{ display: "flex", gap: "var(--space-3)", padding: "var(--space-2) 0", borderBottom: i < AUTOMATISMES.length - 1 ? "1px solid var(--bg-soft)" : "none" }}>
                            <span style={{ fontSize: "var(--size-meta)", fontWeight: 500, color: "var(--mauve)", minWidth: 110, flexShrink: 0 }}>{a.quand}</span>
                            <span style={{ fontSize: "var(--size-meta)", color: "var(--fg)" }}>{a.quoi}</span>
                        </div>
                    ))}
                    <p style={{ fontSize: "var(--size-tag)", color: "var(--fg-muted)", marginTop: "var(--space-3)" }}>
                        Tout est enregistré dans Notion : l&apos;application lit les mêmes bases, rien ne se perd.
                    </p>
                </div>
            </div>
        </>
    );
}
