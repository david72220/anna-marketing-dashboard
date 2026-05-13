import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
const YOUTUBE_CHANNEL_ID = "UCxxx"; // sera mis à jour

interface VideoStats {
    videoId: string;
    title: string;
    views: number;
    likes: number;
    comments: number;
}

async function fetchYouTubeMetrics(): Promise<{
    subscribers: number;
    totalViews: number;
    videos: VideoStats[];
}> {
    if (!YOUTUBE_API_KEY) {
        return { subscribers: 0, totalViews: 0, videos: [] };
    }

    try {
        // Récupérer les stats de la chaîne
        const channelRes = await fetch(
            `https://www.googleapis.com/youtube/v3/channels?part=statistics&id=${YOUTUBE_CHANNEL_ID}&key=${YOUTUBE_API_KEY}`
        );
        const channelData = await channelRes.json();
        const stats = channelData.items?.[0]?.statistics || {};

        // Récupérer les dernières vidéos
        const searchRes = await fetch(
            `https://www.googleapis.com/youtube/v3/search?channelId=${YOUTUBE_CHANNEL_ID}&part=snippet&order=date&maxResults=10&type=video&key=${YOUTUBE_API_KEY}`
        );
        const searchData = await searchRes.json();
        const videoIds = searchData.items?.map((item: Record<string, Record<string, string>>) => item.id?.videoId).filter(Boolean).join(",") || "";

        let videos: VideoStats[] = [];
        if (videoIds) {
            const videoRes = await fetch(
                `https://www.googleapis.com/youtube/v3/videos?part=statistics,snippet&id=${videoIds}&key=${YOUTUBE_API_KEY}`
            );
            const videoData = await videoRes.json();
            videos = (videoData.items || []).map((v: Record<string, Record<string, unknown>>) => ({
                videoId: v.id,
                title: (v.snippet as Record<string, string>)?.title || "",
                views: parseInt(String((v.statistics as Record<string, string>)?.viewCount || "0"), 10),
                likes: parseInt(String((v.statistics as Record<string, string>)?.likeCount || "0"), 10),
                comments: parseInt(String((v.statistics as Record<string, string>)?.commentCount || "0"), 10),
            }));
        }

        return {
            subscribers: parseInt(String(stats.subscriberCount || "0"), 10),
            totalViews: parseInt(String(stats.viewCount || "0"), 10),
            videos,
        };
    } catch (error) {
        console.error("Erreur YouTube API:", error);
        return { subscribers: 0, totalViews: 0, videos: [] };
    }
}

export async function POST(request: Request) {
    try {
        // Vérifier le header d'autorisation (cron secret)
        const authHeader = request.headers.get("authorization");
        if (authHeader !== `Bearer ${process.env.CRON_SECRET || "dev-mode"}`) {
            // En développement, on autorise sans secret
            if (process.env.NODE_ENV === "production") {
                return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
            }
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Collecter les métriques YouTube
        const ytMetrics = await fetchYouTubeMetrics();

        if (ytMetrics.subscribers > 0 || ytMetrics.totalViews > 0) {
            // Sauvegarder le snapshot quotidien YouTube
            await prisma.dailySnapshot.upsert({
                where: {
                    platform_date: { platform: "youtube", date: today },
                },
                create: {
                    platform: "youtube",
                    followers: ytMetrics.subscribers,
                    totalViews: ytMetrics.totalViews,
                    date: today,
                },
                update: {
                    followers: ytMetrics.subscribers,
                    totalViews: ytMetrics.totalViews,
                },
            });

            // Sauvegarder les métriques par vidéo
            for (const video of ytMetrics.videos) {
                // Utiliser upsert individuel pour éviter les doublons
                const metrics = [
                    { platform: "youtube", metricType: "views", value: video.views, date: today, videoId: video.videoId, videoTitle: video.title },
                    { platform: "youtube", metricType: "likes", value: video.likes, date: today, videoId: video.videoId, videoTitle: video.title },
                    { platform: "youtube", metricType: "comments", value: video.comments, date: today, videoId: video.videoId, videoTitle: video.title },
                ];
                for (const metric of metrics) {
                    const existing = await prisma.socialMetric.findFirst({
                        where: {
                            platform: metric.platform,
                            metricType: metric.metricType,
                            videoId: metric.videoId,
                            date: today,
                        },
                    });
                    if (!existing) {
                        await prisma.socialMetric.create({ data: metric });
                    }
                }
            }
        }

        // Placeholder pour TikTok et Facebook (APIs nécessitent des tokens spécifiques)
        // TikTok - sera implémenté avec l'API TikTok
        // Facebook - sera implémenté avec l'API Meta

        return NextResponse.json({
            success: true,
            youtube: ytMetrics,
            message: "Métriques collectées avec succès",
        });
    } catch (error) {
        console.error("Erreur collecte métriques:", error);
        return NextResponse.json({ error: "Erreur lors de la collecte des métriques" }, { status: 500 });
    }
}