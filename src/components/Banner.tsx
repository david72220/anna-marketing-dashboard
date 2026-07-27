"use client";

import Sparkle from "./Sparkle";

const SCREEN_META: Record<string, { eyebrow: string; pre: string; em: string; sub: string }> = {
  overview: {
    eyebrow: "Tableau de bord",
    pre: "Vue d'",
    em: "ensemble",
    sub: "Là où tout commence — l'état de votre présence en un coup d'œil.",
  },
  analyses: {
    eyebrow: "Atelier d'observation",
    pre: "Analyses ",
    em: "contenu",
    sub: "Décortiquer chaque publication pour cultiver ce qui résonne.",
  },
  veille: {
    eyebrow: "Ce que disent les autres",
    pre: "Veille ",
    em: "concurrence",
    sub: "Inspirations, signaux faibles et recommandations à actionner cette semaine.",
  },
  concurrents: {
    eyebrow: "Signaux mesurés",
    pre: "Veille ",
    em: "performance",
    sub: "Ce qui a réellement surperformé ailleurs — chiffres à l'appui, jamais au jugé.",
  },
  backlog: {
    eyebrow: "Atelier créatif",
    pre: "Backlog ",
    em: "posts",
    sub: "Idées, brouillons et publications prêtes — votre flux éditorial à venir.",
  },
  metrics: {
    eyebrow: "Boussole chiffrée",
    pre: "KPI ",
    em: "réseaux",
    sub: "Mesurer pour mieux ajuster — engagement, portée, régularité.",
  },
};

export default function Banner({ screen }: { screen: string }) {
  const meta = SCREEN_META[screen] || SCREEN_META.overview;
  const today = new Date();
  const day = today.getDate();
  const month = today.toLocaleDateString("fr-FR", { month: "long" });
  const weekday = today.toLocaleDateString("fr-FR", { weekday: "long" });

  return (
    <div
      className="banner"
      style={{ background: "var(--gradient-hero)" }}
    >
      <svg
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          pointerEvents: "none",
        }}
        preserveAspectRatio="none"
        viewBox="0 0 1200 200"
      >
        <defs>
          <linearGradient id="brushGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="var(--rose)" stopOpacity="0.18" />
            <stop offset="100%" stopColor="var(--mauve)" stopOpacity="0.08" />
          </linearGradient>
        </defs>
        <path
          d="M -50 160 Q 200 30 600 100 T 1250 80"
          stroke="url(#brushGrad)"
          strokeWidth="80"
          fill="none"
          strokeLinecap="round"
        />
        <path
          d="M -50 140 Q 300 50 700 120 T 1250 100"
          stroke="var(--mauve)"
          strokeWidth="1"
          fill="none"
          strokeLinecap="round"
          strokeOpacity="0.25"
          strokeDasharray="2 6"
        />
      </svg>

      <Sparkle top={28} left="42%" size={22} delay={0.2} />
      <Sparkle top={70} left="48%" size={16} delay={0.8} />
      <Sparkle top={100} left="40%" size={18} delay={1.4} />
      <Sparkle top={48} left="58%" size={14} delay={0.4} />
      <Sparkle top={120} left="62%" size={20} delay={1.0} />

      <div className="banner-content">
        <div className="banner-greeting">
          <div className="banner-eyebrow">{meta.eyebrow}</div>
          <div className="banner-title">
            Bonjour <em>Anna</em>,
          </div>
          <div className="banner-sub">
            {weekday}, ravie de vous retrouver.
          </div>
        </div>
        <div className="banner-date">
          <div className="banner-date-day">{day}</div>
          <div className="banner-date-month">
            {month} · {today.getFullYear()}
          </div>
        </div>
      </div>
    </div>
  );
}