"use client";

import {
  Youtube,
  Instagram,
  Facebook,
  Globe,
} from "lucide-react";

const networkConfig: Record<string, { icon: React.ReactNode; gradient: string }> = {
  youtube: {
    icon: <Youtube size={16} />,
    gradient: "linear-gradient(135deg, #FF0000, #CC0000)",
  },
  tiktok: {
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
        <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.88-2.88 2.89 2.89 0 012.88-2.88c.28 0 .56.04.82.11V9a6.33 6.33 0 00-.82-.05A6.34 6.34 0 003.15 15.3a6.34 6.34 0 0010.86 4.46V13a8.28 8.28 0 005.58 2.17V11.7a4.83 4.83 0 01-3.77-1.84V6.69h3.77z" />
      </svg>
    ),
    gradient: "linear-gradient(135deg, #00F2EA, #FF0050)",
  },
  instagram: {
    icon: <Instagram size={16} />,
    gradient: "linear-gradient(135deg, #F58529, #DD2A7B, #8134AF)",
  },
  facebook: {
    icon: <Facebook size={16} />,
    gradient: "linear-gradient(135deg, #1877F2, #0A5DC2)",
  },
};

export default function NetworkBadge({
  network,
  size = 36,
}: {
  network: string;
  size?: number;
}) {
  const key = network?.toLowerCase() || "";
  const config = networkConfig[key] || {
    icon: <Globe size={16} />,
    gradient: "linear-gradient(135deg, var(--mauve-l), var(--mauve))",
  };

  return (
    <div
      className="network-icon"
      style={{
        width: size,
        height: size,
        background: config.gradient,
      }}
    >
      {config.icon}
    </div>
  );
}