"use client";

import { useEffect, useState } from "react";

interface Snapshot {
    platform: string;
    owner: string;
    followers: number;
    totalViews: number;
    totalLikes: number;
    totalComments: number;
    date: string;
}

export default function MetricsPage() {
    const [data, setData] = useState<{
        snapshots: Record<string, Snapshot[]>;
        lastUpdated: string | null;
    } | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function load() {
            try {
                const res = await fetch("/api/social/metrics");
                if (!res.ok) throw new Error("Erreur " + res.status);
                const json = await res.json();
                setData(json);
            } catch (e: any) {
                setError(e.message || "Erreur");
            } finally {
                setLoading(false);
            }
        }
        load();
    }, []);

    if (loading) return <div className="p-8 text-[#7A6A6A]">Chargement…</div>;
    if (error) return <div className="p-8 text-[#C8A5A5]">Erreur : {error}</div>;
    if (!data || !Object.keys(data.snapshots).length) return <div className="p-8 text-[#7A6A6A]">Aucune donnée disponible.</div>;

    const platformLabels: Record<string, string> = {
        youtube: "YouTube",
        instagram: "Instagram",
        facebook: "Facebook",
        tiktok: "TikTok",
    };

    return (
        <div className="p-8">
            <h1 className="text-2xl font-bold text-[#3A2E2E] mb-1">KPI réseaux</h1>
            <p className="text-sm text-[#7A6A6A] mb-6">
                Données collectées automatiquement via les APIs.
                {data.lastUpdated ? ` Dernière mise à jour : ${new Date(data.lastUpdated).toLocaleString("fr-FR")}` : ""}
            </p>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {Object.entries(data.snapshots).map(([key, snaps]) => {
                    const latest = snaps[0];
                    const prev = snaps[1];
                    const platform = latest.platform;
                    const label = platformLabels[platform] || platform;

                    const diff = (curr: number, previous?: number) => {
                        if (!previous || previous === 0) return null;
                        const d = curr - previous;
                        const pct = ((d / previous) * 100).toFixed(1);
                        return { val: d, pct, up: d >= 0 };
                    };

                    const dFollowers = diff(latest.followers, prev?.followers);
                    const dViews = diff(latest.totalViews, prev?.totalViews);
                    const dLikes = diff(latest.totalLikes, prev?.totalLikes);

                    return (
                        <div key={key} className="bg-[#FAF6F1] rounded-xl p-6 shadow-sm border border-[#EDE4D8]">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-lg font-semibold text-[#3A2E2E]">
                                    {label} — {latest.owner}
                                </h2>
                                <span className="text-xs text-[#7A6A6A] bg-[#EDE4D8] px-2 py-1 rounded-full">
                                    {latest.date}
                                </span>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <StatBox
                                    label="Followers"
                                    value={latest.followers}
                                    diff={dFollowers}
                                    color="#9B7D96"
                                />
                                <StatBox
                                    label="Vues totales"
                                    value={latest.totalViews}
                                    diff={dViews}
                                    color="#C8A5A5"
                                />
                                <StatBox
                                    label="Likes"
                                    value={latest.totalLikes}
                                    diff={dLikes}
                                    color="#6B8F71"
                                />
                                <StatBox
                                    label="Commentaires"
                                    value={latest.totalComments}
                                    diff={null}
                                    color="#7D6078"
                                />
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

function StatBox({
    label,
    value,
    diff,
    color,
}: {
    label: string;
    value: number;
    diff: { val: number; pct: string; up: boolean } | null;
    color: string;
}) {
    return (
        <div className="bg-white rounded-lg p-4 border border-[#EDE4D8]">
            <p className="text-xs text-[#7A6A6A] mb-1">{label}</p>
            <p className="text-xl font-bold text-[#3A2E2E]" style={{ color }}>
                {value.toLocaleString("fr-FR")}
            </p>
            {diff && (
                <p className={`text-xs mt-1 ${diff.up ? "text-[#6B8F71]" : "text-[#C8A5A5]"}`}>
                    {diff.up ? "+" : ""}
                    {diff.val.toLocaleString("fr-FR")} ({diff.up ? "+" : ""}
                    {diff.pct}%)
                </p>
            )}
        </div>
    );
}