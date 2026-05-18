"use client";

import { ReactNode } from "react";

export default function PromptCard({
  icon,
  title,
  subtitle,
  children,
}: {
  icon?: ReactNode;
  title: string;
  subtitle?: string;
  children?: ReactNode;
}) {
  return (
    <div className="prompt-card">
      <div className="prompt-card-header">
        {icon && <div className="prompt-card-icon">{icon}</div>}
        <div>
          <div className="prompt-card-title">{title}</div>
          {subtitle && (
            <div className="prompt-card-subtitle">{subtitle}</div>
          )}
        </div>
      </div>
      {children && <div className="prompt-card-body">{children}</div>}
    </div>
  );
}