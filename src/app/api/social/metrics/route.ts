import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
    try {
        const [latestSnapshots, recentMetrics] = await Promise.all([
            prisma.dailySnapshot.findMany({
                orderBy: { date: "desc" },
                take: 60,
            }),
            prisma.socialMetric.findMany({
                orderBy: { date: "desc" },
                take: 200,
            }),
        ]);

        // Grouper les snapshots par owner + plateforme
        const byPlatform: Record<string, Array<{ platform: string; owner: string; followers: number; totalViews: number; totalLikes: number; totalComments: number; date: string }>> = {};

        for (const s of latestSnapshots) {
            const key = `${s.owner}_${s.platform}`;
            if (!byPlatform[key]) byPlatform[key] = [];
            byPlatform[key].push({
                platform: s.platform,
                owner: s.owner,
                followers: s.followers,
                totalViews: s.totalViews,
                totalLikes: s.totalLikes,
                totalComments: s.totalComments,
                date: s.date.toISOString().split("T")[0],
            });
        }

        // Grouper les métriques détaillées par owner + plateforme
        const byMetricKey: Record<string, typeof recentMetrics> = {};
        for (const m of recentMetrics) {
            const key = `${m.owner}_${m.platform}`;
            if (!byMetricKey[key]) byMetricKey[key] = [];
            byMetricKey[key].push(m);
        }

        return NextResponse.json({
            snapshots: byPlatform,
            metrics: byMetricKey,
            lastUpdated: latestSnapshots[0]?.createdAt || null,
        }, {
            headers: {
                "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
            },
        });
    } catch (error) {
        console.error("Erreur métriques:", error);
        return NextResponse.json({ error: "Erreur lors de la récupération des métriques" }, { status: 500 });
    }
}