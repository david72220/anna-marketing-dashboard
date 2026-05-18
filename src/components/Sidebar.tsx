"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { signOut } from "next-auth/react";
import {
  Home,
  Search,
  Eye,
  PenLine,
  BarChart3,
  Globe,
  Youtube,
  Instagram,
  Facebook,
  LogOut,
} from "lucide-react";
import Image from "next/image";

const NAV = [
  { href: "/dashboard", label: "Vue d'ensemble", icon: Home },
  { href: "/dashboard/analyses", label: "Analyses Contenu", icon: Search },
  { href: "/dashboard/veille", label: "Veille Concurrence", icon: Eye },
  { href: "/dashboard/backlog", label: "Backlog Posts", icon: PenLine },
  { href: "/dashboard/metrics", label: "KPI réseaux", icon: BarChart3 },
];

const SOCIAL_LINKS = [
  { href: "https://anna-ollivier-psy.com", label: "anna-ollivier-psy.com", icon: Globe },
  { href: "https://www.youtube.com/@Confidencesdetoutpetits-Monreg", label: "Chaîne YouTube", icon: Youtube },
  { href: "https://www.tiktok.com/@anna.ollivier.psy", label: "TikTok", icon: null },
  { href: "https://www.instagram.com/anna.ollivier.psy/", label: "Instagram", icon: Instagram },
  { href: "https://www.facebook.com/AnnaOllivierPsy", label: "Facebook", icon: Facebook },
];

function TikTokIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 12a4 4 0 104 4V4a5 5 0 005 5" />
    </svg>
  );
}

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="sidebar-brand-mark">
          <Image
            src="/anna-logo.png"
            alt="Anna Ollivier"
            width={56}
            height={56}
            style={{ objectFit: "cover" }}
          />
        </div>
        <div className="sidebar-brand-text">
          <span className="sidebar-brand-name">Anna Ollivier</span>
          <span className="sidebar-brand-sub">Dashboard Marketing</span>
        </div>
      </div>

      <nav className="sidebar-nav">
        <div className="nav-eyebrow">Navigation</div>
        {NAV.map((n) => {
          const Icon = n.icon;
          const isActive = pathname === n.href;
          return (
            <Link
              key={n.href}
              href={n.href}
              className={`nav-item ${isActive ? "active" : ""}`}
            >
              <span className="nav-icon">
                <Icon size={18} />
              </span>
              <span className="nav-label">{n.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        <div className="footer-eyebrow">Anna en ligne</div>
        {SOCIAL_LINKS.map((link) => {
          const IconComponent = link.icon;
          return (
            <a
              key={link.href}
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              className="footer-link"
            >
              <span className="nav-icon">
                {IconComponent ? (
                  <IconComponent size={14} />
                ) : (
                  <TikTokIcon size={14} />
                )}
              </span>
              <span>{link.label}</span>
            </a>
          );
        })}
        <div className="footer-divider" />
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="footer-link footer-link-muted"
        >
          <span className="nav-icon">
            <LogOut size={14} />
          </span>
          <span>Déconnexion</span>
        </button>
      </div>
    </aside>
  );
}