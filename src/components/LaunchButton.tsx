"use client";

import { Loader2 } from "lucide-react";

export default function LaunchButton({
  loading,
  onClick,
  children,
}: {
  loading: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      className="btn btn-launch"
      onClick={onClick}
      disabled={loading}
    >
      {loading ? (
        <>
          <Loader2 size={16} className="animate-spin" />
          En cours…
        </>
      ) : (
        children
      )}
    </button>
  );
}