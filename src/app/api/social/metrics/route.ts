import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
    try {
        const [latestSnapshots, recentMetrics] = await Promise.all([
            prisma.dailySnapshot.findMany({
                orderBy: { date: "desc" },
                take: 30,
            }),
            prisma.socialMetric.findMany({
                orderBy: { date: "desc" },
                take: 100,
            }),
        ]);

        // Grouper les snapshots par plateforme
        const byPlatform = latestSnapshots.reduce(
            (acc, s) => {
                if (!acc[s.platform]) acc[s.platform] = [];
                acc[s.platform].push(s);
                return acc;
            },
            {} as Record<string, typeof latestSnapshots>
        );

        return NextResponse.json({
            snapshots: byPlatform,
            metrics: recentMetrics,
            lastUpdated: latestSnapshots[0]?.createdAt || null,
        });
    } catch (error) {
        console.error("Erreur métriques:", error);
        return NextResponse.json({ error: "Erreur lors de la récupération des métriques" }, { status: 500 });
    }
}