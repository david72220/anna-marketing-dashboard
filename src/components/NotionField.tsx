"use client";

import { ReactNode } from "react";

export default function NotionField({
  icon,
  label,
  children,
}: {
  icon?: ReactNode;
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="notion-field">
      <div className="notion-field-label">
        {icon && <span className="notion-field-icon">{icon}</span>}
        {label}
      </div>
      <div className="notion-field-value">{children}</div>
    </div>
  );
}