import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Configuration des comptes sociaux
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;

// Comptes Anna
const ANNA_YOUTUBE_CHANNEL_ID = process.env.ANNA_YOUTUBE_CHANNEL_ID || "UCxxx";
const ANNA_INSTAGRAM_USER = process.env.ANNA_INSTAGRAM_USER || "anna.ollivier.psy";

// Comptes David
const DAVID_YOUTUBE_CHANNEL_ID = process.env.DAVID_YOUTUBE_CHANNEL_ID || "";

interface VideoStats {
    videoId: string;
    title: string;
    views: number;
    likes: number;
    comments: number;
}

interface PlatformMetrics {
    subscribers: number;
    totalViews: number;
    videos: VideoStats[];
}

async function fetchYouTubeMetrics(channelId: string): Promise<PlatformMetrics> {
    if (!YOUTUBE_API_KEY || !channelId) {
        return { subscribers: 0, totalViews: 0, videos: [] };
    }

    try {
        // Récupérer les stats de la chaîne
        const channelRes = await fetch(
            `https://www.googleapis.com/youtube/v3/channels?part=statistics&id=${channelId}&key=${YOUTUBE_API_KEY}`
        );
        const channelData = await channelRes.json();
        const stats = channelData.items?.[0]?.statistics || {};

        // Récupérer les dernières vidéos
        const searchRes = await fetch(
            `https://www.googleapis.com/youtube/v3/search?channelId=${channelId}&part=snippet&order=date&maxResults=10&type=video&key=${YOUTUBE_API_KEY}`
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

async function fetchInstagramMetrics(username: string): Promise<{ followers: number; totalViews: number }> {
    // Instagram Basic Display API nécessite une configuration OAuth
    // Pour l'instant, on utilise l'API Graph si un token est disponible
    const INSTAGRAM_ACCESS_TOKEN = process.env.INSTAGRAM_ACCESS_TOKEN;
    const INSTAGRAM_BUSINESS_ID = process.env.INSTAGRAM_BUSINESS_ID;

    if (!INSTAGRAM_ACCESS_TOKEN || !INSTAGRAM_BUSINESS_ID) {
        console.log("Instagram: Pas de token configuré, utilisation du scraping via RapidAPI ou valeurs par défaut");
        // En attendant un token API, on retourne 0 - les données seront mises à jour manuellement ou via scraping
        return { followers: 0, totalViews: 0 };
    }

    try {
        const res = await fetch(
            `https://graph.facebook.com/v18.0/${INSTAGRAM_BUSINESS_ID}?fields=followers_count,media_count&access_token=${INSTAGRAM_ACCESS_TOKEN}`
        );
        const data = await res.json();
        return {
            followers: data.followers_count || 0,
            totalViews: 0, // Instagram n'a pas de concept de "vues totales" comme YouTube
        };
    } catch (error) {
        console.error("Erreur Instagram API:", error);
        return { followers: 0, totalViews: 0 };
    }
}

export async function POST(request: Request) {
    try {
        // Vérifier le header d'autorisation (cron secret)
        const authHeader = request.headers.get("authorization");
        if (authHeader !== `Bearer ${process.env.CRON_SECRET || "dev-mode"}`) {
            if (process.env.NODE_ENV === "production") {
                return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
            }
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const results: Record<string, unknown> = {};

        // ==========================================
        // ANNA - Collecte des métriques
        // ==========================================

        // YouTube Anna
        const annaYtMetrics = await fetchYouTubeMetrics(ANNA_YOUTUBE_CHANNEL_ID);
        if (annaYtMetrics.subscribers > 0 || annaYtMetrics.totalViews > 0) {
            await prisma.dailySnapshot.upsert({
                where: { platform_owner_date: { platform: "youtube", owner: "anna", date: today } },
                create: {
                    platform: "youtube",
                    owner: "anna",
                    followers: annaYtMetrics.subscribers,
                    totalViews: annaYtMetrics.totalViews,
                    date: today,
                },
                update: {
                    followers: annaYtMetrics.subscribers,
                    totalViews: annaYtMetrics.totalViews,
                },
            });

            for (const video of annaYtMetrics.videos) {
                const metrics = [
                    { platform: "youtube", owner: "anna", metricType: "views", value: video.views, date: today, videoId: video.videoId, videoTitle: video.title },
                    { platform: "youtube", owner: "anna", metricType: "likes", value: video.likes, date: today, videoId: video.videoId, videoTitle: video.title },
                    { platform: "youtube", owner: "anna", metricType: "comments", value: video.comments, date: today, videoId: video.videoId, videoTitle: video.title },
                ];
                for (const metric of metrics) {
                    const existing = await prisma.socialMetric.findFirst({
                        where: {
                            platform: metric.platform,
                            owner: metric.owner,
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
        results.anna_youtube = annaYtMetrics;

        // Instagram Anna
        const annaIgMetrics = await fetchInstagramMetrics(ANNA_INSTAGRAM_USER);
        if (annaIgMetrics.followers > 0) {
            await prisma.dailySnapshot.upsert({
                where: { platform_owner_date: { platform: "instagram", owner: "anna", date: today } },
                create: {
                    platform: "instagram",
                    owner: "anna",
                    followers: annaIgMetrics.followers,
                    totalViews: annaIgMetrics.totalViews,
                    date: today,
                },
                update: {
                    followers: annaIgMetrics.followers,
                    totalViews: annaIgMetrics.totalViews,
                },
            });
        }
        results.anna_instagram = annaIgMetrics;

        // ==========================================
        // DAVID - Collecte des métriques
        // ==========================================

        if (DAVID_YOUTUBE_CHANNEL_ID) {
            const davidYtMetrics = await fetchYouTubeMetrics(DAVID_YOUTUBE_CHANNEL_ID);
            if (davidYtMetrics.subscribers > 0 || davidYtMetrics.totalViews > 0) {
                await prisma.dailySnapshot.upsert({
                    where: { platform_owner_date: { platform: "youtube", owner: "david", date: today } },
                    create: {
                        platform: "youtube",
                        owner: "david",
                        followers: davidYtMetrics.subscribers,
                        totalViews: davidYtMetrics.totalViews,
                        date: today,
                    },
                    update: {
                        followers: davidYtMetrics.subscribers,
                        totalViews: davidYtMetrics.totalViews,
                    },
                });

                for (const video of davidYtMetrics.videos) {
                    const metrics = [
                        { platform: "youtube", owner: "david", metricType: "views", value: video.views, date: today, videoId: video.videoId, videoTitle: video.title },
                        { platform: "youtube", owner: "david", metricType: "likes", value: video.likes, date: today, videoId: video.videoId, videoTitle: video.title },
                        { platform: "youtube", owner: "david", metricType: "comments", value: video.comments, date: today, videoId: video.videoId, videoTitle: video.title },
                    ];
                    for (const metric of metrics) {
                        const existing = await prisma.socialMetric.findFirst({
                            where: {
                                platform: metric.platform,
                                owner: metric.owner,
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
            results.david_youtube = davidYtMetrics;
        }

        // Placeholder pour TikTok et Facebook (APIs nécessitent des tokens spécifiques)
        // TikTok - sera implémenté avec l'API TikTok
        // Facebook - sera implémenté avec l'API Meta

        return NextResponse.json({
            success: true,
            ...results,
            message: "Métriques collectées avec succès",
        });
    } catch (error) {
        console.error("Erreur collecte métriques:", error);
        return NextResponse.json({ error: "Erreur lors de la collecte des métriques" }, { status: 500 });
    }
}