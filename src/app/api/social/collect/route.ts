import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Configuration des comptes sociaux
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;

// Comptes Anna
const ANNA_YOUTUBE_CHANNEL_ID = process.env.ANNA_YOUTUBE_CHANNEL_ID || "UCxxx";
const ANNA_INSTAGRAM_USER = process.env.ANNA_INSTAGRAM_USER || "anna.ollivier.psy";
const ANNA_TIKTOK_USER = process.env.ANNA_TIKTOK_USER || "anna.ollivier.psy";

// Comptes David
const DAVID_YOUTUBE_CHANNEL_ID = process.env.DAVID_YOUTUBE_CHANNEL_ID || "";

// PhantomBuster (Instagram)
const PHANTOMBUSTER_API_KEY = process.env.PHANTOMBUSTER_API_KEY || "";
const PHANTOMBUSTER_INSTAGRAM_AGENT_ID = process.env.PHANTOMBUSTER_INSTAGRAM_AGENT_ID || "";

// Apify (TikTok)
const APIFY_API_TOKEN = process.env.APIFY_API_TOKEN || "";
const APIFY_TIKTOK_ACTOR_ID = process.env.APIFY_TIKTOK_ACTOR_ID || "";

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

// ==========================================
// YouTube API
// ==========================================
async function fetchYouTubeMetrics(channelId: string): Promise<PlatformMetrics> {
    if (!YOUTUBE_API_KEY || !channelId) {
        return { subscribers: 0, totalViews: 0, videos: [] };
    }

    try {
        const channelRes = await fetch(
            `https://www.googleapis.com/youtube/v3/channels?part=statistics&id=${channelId}&key=${YOUTUBE_API_KEY}`
        );
        const channelData = await channelRes.json();
        const stats = channelData.items?.[0]?.statistics || {};

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

// ==========================================
// PhantomBuster - Instagram Profile Scraper
// ==========================================
interface InstagramMetrics {
    followers: number;
    following: number;
    postsCount: number;
    totalLikes: number;
    totalViews: number;
}

async function fetchInstagramViaPhantomBuster(username: string): Promise<InstagramMetrics> {
    if (!PHANTOMBUSTER_API_KEY || !PHANTOMBUSTER_INSTAGRAM_AGENT_ID) {
        console.log("Instagram: PhantomBuster non configuré (PHANTOMBUSTER_API_KEY ou PHANTOMBUSTER_INSTAGRAM_AGENT_ID manquant)");
        return { followers: 0, following: 0, postsCount: 0, totalLikes: 0, totalViews: 0 };
    }

    try {
        // Récupérer le dernier résultat du container PhantomBuster
        const res = await fetch(
            `https://api.phantombuster.com/api/v2/containers/fetch-all?agentId=${PHANTOMBUSTER_INSTAGRAM_AGENT_ID}&limit=1`,
            {
                headers: {
                    "X-Phantombuster-Key": PHANTOMBUSTER_API_KEY,
                    "Accept": "application/json",
                },
            }
        );

        if (!res.ok) {
            console.error("PhantomBuster API erreur:", res.status, await res.text());
            return { followers: 0, following: 0, postsCount: 0, totalLikes: 0, totalViews: 0 };
        }

        const data = await res.json();
        const containers = data.containers || [];

        if (containers.length === 0) {
            console.log("PhantomBuster: Aucun container trouvé pour l'agent Instagram");
            return { followers: 0, following: 0, postsCount: 0, totalLikes: 0, totalViews: 0 };
        }

        // Prendre le container le plus récent (le premier)
        const lastContainer = containers[0];
        const resultObject = lastContainer.resultObject;

        if (!resultObject) {
            console.log("PhantomBuster: Pas de résultat dans le container");
            return { followers: 0, following: 0, postsCount: 0, totalLikes: 0, totalViews: 0 };
        }

        // Le resultObject peut être un string JSON ou déjà parsé
        let resultData: Record<string, unknown>[];
        try {
            resultData = typeof resultObject === "string" ? JSON.parse(resultObject) : resultObject;
        } catch {
            resultData = [];
        }

        if (!Array.isArray(resultData) || resultData.length === 0) {
            console.log("PhantomBuster: Format de résultat inattendu");
            return { followers: 0, following: 0, postsCount: 0, totalLikes: 0, totalViews: 0 };
        }

        // Chercher le profil correspondant au username
        const profile = resultData.find((item: Record<string, unknown>) => {
            const itemUsername = String(item.username || "").toLowerCase().replace("@", "");
            return itemUsername === username.toLowerCase().replace("@", "");
        }) || resultData[0]; // Fallback au premier résultat

        return {
            followers: parseInt(String(profile.followersCount || profile.followers || "0"), 10) || 0,
            following: parseInt(String(profile.followingCount || profile.following || "0"), 10) || 0,
            postsCount: parseInt(String(profile.postsCount || profile.postCount || "0"), 10) || 0,
            totalLikes: parseInt(String(profile.totalLikes || profile.likes || "0"), 10) || 0,
            totalViews: parseInt(String(profile.totalViews || profile.views || "0"), 10) || 0,
        };
    } catch (error) {
        console.error("Erreur PhantomBuster Instagram:", error);
        return { followers: 0, following: 0, postsCount: 0, totalLikes: 0, totalViews: 0 };
    }
}

// ==========================================
// Apify - TikTok Profile Scraper
// ==========================================
interface TikTokMetrics {
    followers: number;
    following: number;
    hearts: number; // likes totaux
    videoCount: number;
    totalViews: number;
}

async function fetchTikTokViaApify(username: string): Promise<TikTokMetrics> {
    if (!APIFY_API_TOKEN || !APIFY_TIKTOK_ACTOR_ID) {
        console.log("TikTok: Apify non configuré (APIFY_API_TOKEN ou APIFY_TIKTOK_ACTOR_ID manquant)");
        return { followers: 0, following: 0, hearts: 0, videoCount: 0, totalViews: 0 };
    }

    try {
        // Étape 1 : Récupérer la dernière exécution réussie de l'actor
        const runsRes = await fetch(
            `https://api.apify.com/v2/actor-runs?actorId=${APIFY_TIKTOK_ACTOR_ID}&limit=1&status=SUCCEEDED&token=${APIFY_API_TOKEN}`,
            {
                headers: { "Accept": "application/json" },
            }
        );

        if (!runsRes.ok) {
            console.error("Apify API erreur (runs):", runsRes.status, await runsRes.text());
            return { followers: 0, following: 0, hearts: 0, videoCount: 0, totalViews: 0 };
        }

        const runsData = await runsRes.json();
        const runs = runsData.data?.items || [];

        if (runs.length === 0) {
            console.log("Apify: Aucune exécution trouvée pour l'actor TikTok");
            return { followers: 0, following: 0, hearts: 0, videoCount: 0, totalViews: 0 };
        }

        const lastRun = runs[0];
        const datasetId = lastRun.defaultDatasetId;

        if (!datasetId) {
            console.log("Apify: Pas de dataset dans la dernière exécution");
            return { followers: 0, following: 0, hearts: 0, videoCount: 0, totalViews: 0 };
        }

        // Étape 2 : Récupérer les données du dataset
        const datasetRes = await fetch(
            `https://api.apify.com/v2/datasets/${datasetId}/items?token=${APIFY_API_TOKEN}&limit=10`,
            {
                headers: { "Accept": "application/json" },
            }
        );

        if (!datasetRes.ok) {
            console.error("Apify dataset erreur:", datasetRes.status, await datasetRes.text());
            return { followers: 0, following: 0, hearts: 0, videoCount: 0, totalViews: 0 };
        }

        const datasetItems = await datasetRes.json();

        if (!Array.isArray(datasetItems) || datasetItems.length === 0) {
            console.log("Apify: Dataset vide pour TikTok");
            return { followers: 0, following: 0, hearts: 0, videoCount: 0, totalViews: 0 };
        }

        // Chercher le profil correspondant au username
        const cleanUsername = username.toLowerCase().replace("@", "");
        const profile = datasetItems.find((item: Record<string, unknown>) => {
            const itemUsername = String(item.username || item.uniqueId || "").toLowerCase().replace("@", "");
            return itemUsername === cleanUsername;
        }) || datasetItems[0];

        return {
            followers: parseInt(String(profile.followers || profile.followerCount || profile.followersCount || "0"), 10) || 0,
            following: parseInt(String(profile.following || profile.followingCount || "0"), 10) || 0,
            hearts: parseInt(String(profile.hearts || profile.heartCount || profile.likes || profile.likeCount || "0"), 10) || 0,
            videoCount: parseInt(String(profile.videoCount || profile.videos || "0"), 10) || 0,
            totalViews: parseInt(String(profile.totalViews || profile.playCount || "0"), 10) || 0,
        };
    } catch (error) {
        console.error("Erreur Apify TikTok:", error);
        return { followers: 0, following: 0, hearts: 0, videoCount: 0, totalViews: 0 };
    }
}

// ==========================================
// Route principale de collecte
// ==========================================
export async function POST(request: Request) {
    try {
        // Accepter les requêtes du cron Vercel (Bearer CRON_SECRET) ou sans auth (dashboard)
        const authHeader = request.headers.get("authorization");
        if (authHeader) {
            // Cron Vercel : vérifier le CRON_SECRET
            if (authHeader !== `Bearer ${process.env.CRON_SECRET || "dev-mode"}`) {
                if (process.env.NODE_ENV === "production") {
                    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
                }
            }
        }
        // Pas de header Authorization = appel depuis le dashboard (autorisé par le middleware)

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

        // Instagram Anna (via PhantomBuster)
        const annaIgMetrics = await fetchInstagramViaPhantomBuster(ANNA_INSTAGRAM_USER);
        if (annaIgMetrics.followers > 0) {
            await prisma.dailySnapshot.upsert({
                where: { platform_owner_date: { platform: "instagram", owner: "anna", date: today } },
                create: {
                    platform: "instagram",
                    owner: "anna",
                    followers: annaIgMetrics.followers,
                    totalViews: annaIgMetrics.totalViews,
                    totalLikes: annaIgMetrics.totalLikes,
                    date: today,
                },
                update: {
                    followers: annaIgMetrics.followers,
                    totalViews: annaIgMetrics.totalViews,
                    totalLikes: annaIgMetrics.totalLikes,
                },
            });
        }
        results.anna_instagram = annaIgMetrics;

        // TikTok Anna (via Apify)
        const annaTtMetrics = await fetchTikTokViaApify(ANNA_TIKTOK_USER);
        if (annaTtMetrics.followers > 0) {
            await prisma.dailySnapshot.upsert({
                where: { platform_owner_date: { platform: "tiktok", owner: "anna", date: today } },
                create: {
                    platform: "tiktok",
                    owner: "anna",
                    followers: annaTtMetrics.followers,
                    totalViews: annaTtMetrics.totalViews,
                    totalLikes: annaTtMetrics.hearts,
                    date: today,
                },
                update: {
                    followers: annaTtMetrics.followers,
                    totalViews: annaTtMetrics.totalViews,
                    totalLikes: annaTtMetrics.hearts,
                },
            });
        }
        results.anna_tiktok = annaTtMetrics;

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

        return NextResponse.json({
            success: true,
            ...results,
            message: "Métriques collectées avec succès (YouTube API + PhantomBuster Instagram + Apify TikTok)",
        });
    } catch (error) {
        console.error("Erreur collecte métriques:", error);
        return NextResponse.json({ error: "Erreur lors de la collecte des métriques" }, { status: 500 });
    }
}