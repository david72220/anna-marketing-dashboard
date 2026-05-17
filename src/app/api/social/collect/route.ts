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

// Facebook Graph API
const FACEBOOK_PAGE_ACCESS_TOKEN = process.env.FACEBOOK_PAGE_ACCESS_TOKEN || "";
const FACEBOOK_PAGE_ANNA = process.env.FACEBOOK_PAGE_ANNA || "anna.ollivier.psy";

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
        // Étape 1 : Récupérer le dernier container de l'agent
        const containersRes = await fetch(
            `https://api.phantombuster.com/api/v2/containers/fetch-all?agentId=${PHANTOMBUSTER_INSTAGRAM_AGENT_ID}&limit=1`,
            {
                headers: {
                    "X-Phantombuster-Key": PHANTOMBUSTER_API_KEY,
                    "Accept": "application/json",
                },
            }
        );

        if (!containersRes.ok) {
            console.error("PhantomBuster API erreur:", containersRes.status, await containersRes.text());
            return { followers: 0, following: 0, postsCount: 0, totalLikes: 0, totalViews: 0 };
        }

        const containersData = await containersRes.json();
        const containers = containersData.containers || [];

        if (containers.length === 0) {
            console.log("PhantomBuster: Aucun container trouvé pour l'agent Instagram");
            return { followers: 0, following: 0, postsCount: 0, totalLikes: 0, totalViews: 0 };
        }

        const lastContainerId = containers[0].id;

        // Étape 2 : Récupérer le résultat via fetch-result-object
        const resultRes = await fetch(
            `https://api.phantombuster.com/api/v2/containers/fetch-result-object?id=${lastContainerId}`,
            {
                headers: {
                    "X-Phantombuster-Key": PHANTOMBUSTER_API_KEY,
                    "Accept": "application/json",
                },
            }
        );

        if (!resultRes.ok) {
            console.error("PhantomBuster result-object erreur:", resultRes.status, await resultRes.text());
            return { followers: 0, following: 0, postsCount: 0, totalLikes: 0, totalViews: 0 };
        }

        const resultData = await resultRes.json();
        const resultObject = resultData.resultObject;

        if (!resultObject) {
            console.log("PhantomBuster: Pas de resultObject dans la réponse");
            return { followers: 0, following: 0, postsCount: 0, totalLikes: 0, totalViews: 0 };
        }

        // Le resultObject est un string JSON
        let profiles: Record<string, unknown>[];
        try {
            profiles = typeof resultObject === "string" ? JSON.parse(resultObject) : resultObject;
        } catch {
            console.log("PhantomBuster: Erreur parsing resultObject");
            return { followers: 0, following: 0, postsCount: 0, totalLikes: 0, totalViews: 0 };
        }

        if (!Array.isArray(profiles) || profiles.length === 0) {
            console.log("PhantomBuster: Format de résultat inattendu");
            return { followers: 0, following: 0, postsCount: 0, totalLikes: 0, totalViews: 0 };
        }

        // Chercher le profil correspondant au username
        const cleanUsername = username.toLowerCase().replace("@", "");
        const profile = profiles.find((item: Record<string, unknown>) => {
            const itemUsername = String(item.profileName || item.username || "").toLowerCase().replace("@", "");
            return itemUsername === cleanUsername;
        }) || profiles[0];

        console.log("PhantomBuster Instagram profile keys:", Object.keys(profile).join(", "));
        console.log("PhantomBuster Instagram profile sample:", JSON.stringify(profile).slice(0, 500));

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
    if (!APIFY_API_TOKEN) {
        console.log("TikTok: Apify non configuré (APIFY_API_TOKEN manquant)");
        return { followers: 0, following: 0, hearts: 0, videoCount: 0, totalViews: 0 };
    }

    try {
        // Utiliser l'actor TikTok Profile Scraper (clockworks)
        // Si APIFY_TIKTOK_ACTOR_ID est défini, on lit le dernier dataset existant
        // Sinon on exécute directement le profile scraper
        const profileActorId = "clockworks~tiktok-profile-scraper";
        const cleanUsername = username.toLowerCase().replace("@", "");

        // Étape 1 : Lancer une exécution de l'actor TikTok Profile Scraper
        console.log(`Apify TikTok: Scraping profil @${cleanUsername}...`);
        const runRes = await fetch(
            `https://api.apify.com/v2/acts/${encodeURIComponent(profileActorId)}/runs?token=${APIFY_API_TOKEN}`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    profiles: [cleanUsername],
                    resultsPerPage: 1,
                    shouldDownloadVideos: false,
                    shouldDownloadCovers: false,
                    shouldDownloadSubtitles: false,
                    shouldDownloadSlideshowImages: false,
                }),
            }
        );

        if (!runRes.ok) {
            const errText = await runRes.text();
            console.error("Apify TikTok: erreur lancement actor:", runRes.status, errText.slice(0, 300));

            // Fallback : essayer de lire le dernier dataset existant si APIFY_TIKTOK_ACTOR_ID est configuré
            if (APIFY_TIKTOK_ACTOR_ID) {
                console.log("Apify TikTok: Fallback sur le dernier dataset existant...");
                return await fetchTikTokFromLastDataset(APIFY_TIKTOK_ACTOR_ID, cleanUsername);
            }
            return { followers: 0, following: 0, hearts: 0, videoCount: 0, totalViews: 0 };
        }

        const runData = await runRes.json();
        const runId = runData?.data?.id;
        const datasetId = runData?.data?.defaultDatasetId;

        if (!datasetId || !runId) {
            console.error("Apify TikTok: Pas de runId ou datasetId dans la réponse");
            if (APIFY_TIKTOK_ACTOR_ID) {
                return await fetchTikTokFromLastDataset(APIFY_TIKTOK_ACTOR_ID, cleanUsername);
            }
            return { followers: 0, following: 0, hearts: 0, videoCount: 0, totalViews: 0 };
        }

        // Étape 2 : Attendre que l'exécution soit terminée (max 60s)
        let attempts = 0;
        const maxAttempts = 30;
        while (attempts < maxAttempts) {
            await new Promise((resolve) => setTimeout(resolve, 2000));
            const statusRes = await fetch(
                `https://api.apify.com/v2/actor-runs/${runId}?token=${APIFY_API_TOKEN}`
            );
            const statusData = await statusRes.json();
            const status = statusData?.data?.status;

            if (status === "SUCCEEDED") {
                break;
            } else if (status === "FAILED" || status === "ABORTED" || status === "TIMED-OUT") {
                console.error("Apify TikTok: Exécution échouée:", status);
                if (APIFY_TIKTOK_ACTOR_ID) {
                    return await fetchTikTokFromLastDataset(APIFY_TIKTOK_ACTOR_ID, cleanUsername);
                }
                return { followers: 0, following: 0, hearts: 0, videoCount: 0, totalViews: 0 };
            }
            attempts++;
        }

        if (attempts >= maxAttempts) {
            console.log("Apify TikTok: Timeout en attendant l'exécution");
            if (APIFY_TIKTOK_ACTOR_ID) {
                return await fetchTikTokFromLastDataset(APIFY_TIKTOK_ACTOR_ID, cleanUsername);
            }
            return { followers: 0, following: 0, hearts: 0, videoCount: 0, totalViews: 0 };
        }

        // Étape 3 : Récupérer les données du dataset
        const resultRes = await fetch(
            `https://api.apify.com/v2/datasets/${datasetId}/items?token=${APIFY_API_TOKEN}&limit=5`
        );
        if (!resultRes.ok) {
            console.error("Apify TikTok: erreur lecture dataset:", resultRes.status);
            return { followers: 0, following: 0, hearts: 0, videoCount: 0, totalViews: 0 };
        }

        const items = await resultRes.json();
        return parseTikTokProfileData(items, cleanUsername);
    } catch (error) {
        console.error("Erreur Apify TikTok:", error);
        return { followers: 0, following: 0, hearts: 0, videoCount: 0, totalViews: 0 };
    }
}

function parseTikTokProfileData(items: unknown[], username: string): TikTokMetrics {
    if (!Array.isArray(items) || items.length === 0) {
        console.log("Apify TikTok: Aucune donnée de profil");
        return { followers: 0, following: 0, hearts: 0, videoCount: 0, totalViews: 0 };
    }

    const cleanUsername = username.toLowerCase().replace("@", "");

    // L'actor Profile Scraper renvoie un objet profil, pas des vidéos
    // Mais l'actor Hashtag Scraper renvoie des vidéos avec authorMeta
    const firstItem = items[0] as Record<string, unknown>;

    // Cas 1 : Profile Scraper - objet avec les champs directs
    if (firstItem.followers !== undefined || firstItem.followerCount !== undefined || firstItem.fans !== undefined) {
        console.log("Apify TikTok: Format profil détecté");
        const profile = firstItem;
        return {
            followers: parseInt(String(profile.followers || profile.followerCount || profile.fans || "0"), 10) || 0,
            following: parseInt(String(profile.following || profile.followingCount || "0"), 10) || 0,
            hearts: parseInt(String(profile.hearts || profile.heartCount || profile.heart || profile.likes || "0"), 10) || 0,
            videoCount: parseInt(String(profile.videoCount || profile.videos || "0"), 10) || 0,
            totalViews: parseInt(String(profile.totalViews || profile.totalPlayCount || "0"), 10) || 0,
        };
    }

    // Cas 2 : Hashtag Scraper - vidéos avec authorMeta
    const matchingVideos = items.filter((item: unknown) => {
        const v = item as Record<string, unknown>;
        const author = v.authorMeta as Record<string, unknown> | undefined;
        const itemUsername = String(author?.name || v.username || v.uniqueId || "").toLowerCase().replace("@", "");
        return itemUsername === cleanUsername;
    });

    const videos = matchingVideos.length > 0 ? matchingVideos : items;
    const firstVideo = videos[0] as Record<string, unknown>;
    const authorMeta = (firstVideo.authorMeta as Record<string, unknown>) || {};

    console.log("Apify TikTok: Format vidéo détecté, extraction depuis authorMeta");
    console.log("Apify TikTok authorMeta keys:", Object.keys(authorMeta).join(", "));

    let totalViews = 0;
    let totalHearts = 0;
    for (const v of videos) {
        const item = v as Record<string, unknown>;
        totalViews += parseInt(String(item.playCount || "0"), 10) || 0;
        totalHearts += parseInt(String(item.diggCount || "0"), 10) || 0;
    }

    return {
        followers: parseInt(String(authorMeta.followers || authorMeta.fans || "0"), 10) || 0,
        following: parseInt(String(authorMeta.following || "0"), 10) || 0,
        hearts: parseInt(String(authorMeta.hearts || authorMeta.heart || "0"), 10) || totalHearts,
        videoCount: videos.length,
        totalViews,
    };
}

async function fetchTikTokFromLastDataset(actorId: string, username: string): Promise<TikTokMetrics> {
    try {
        const runsRes = await fetch(
            `https://api.apify.com/v2/actor-runs?actorId=${actorId}&limit=1&status=SUCCEEDED&token=${APIFY_API_TOKEN}`,
            { headers: { "Accept": "application/json" } }
        );

        if (!runsRes.ok) {
            console.error("Apify fallback: erreur runs:", runsRes.status);
            return { followers: 0, following: 0, hearts: 0, videoCount: 0, totalViews: 0 };
        }

        const runsData = await runsRes.json();
        const runs = runsData.data?.items || [];
        if (runs.length === 0) {
            console.log("Apify fallback: Aucune exécution trouvée");
            return { followers: 0, following: 0, hearts: 0, videoCount: 0, totalViews: 0 };
        }

        const datasetId = runs[0].defaultDatasetId;
        if (!datasetId) {
            console.log("Apify fallback: Pas de dataset");
            return { followers: 0, following: 0, hearts: 0, videoCount: 0, totalViews: 0 };
        }

        const datasetRes = await fetch(
            `https://api.apify.com/v2/datasets/${datasetId}/items?token=${APIFY_API_TOKEN}&limit=10`
        );
        if (!datasetRes.ok) {
            console.error("Apify fallback: erreur dataset:", datasetRes.status);
            return { followers: 0, following: 0, hearts: 0, videoCount: 0, totalViews: 0 };
        }

        const items = await datasetRes.json();
        return parseTikTokProfileData(items, username);
    } catch (error) {
        console.error("Apify fallback erreur:", error);
        return { followers: 0, following: 0, hearts: 0, videoCount: 0, totalViews: 0 };
    }
}

// ==========================================
// Facebook Graph API
// ==========================================
interface FacebookMetrics {
    followers: number;
    totalLikes: number;
    totalViews: number;
}

async function fetchFacebookMetrics(pageIdentifier: string): Promise<FacebookMetrics> {
    if (!FACEBOOK_PAGE_ACCESS_TOKEN) {
        console.log("Facebook: non configuré (FACEBOOK_PAGE_ACCESS_TOKEN manquant)");
        return { followers: 0, totalLikes: 0, totalViews: 0 };
    }

    try {
        // Étape 1 : Trouver le Page ID à partir du nom ou ID
        const searchRes = await fetch(
            `https://graph.facebook.com/v19.0/${encodeURIComponent(pageIdentifier)}?fields=id,name,followers_count,fan_count&access_token=${FACEBOOK_PAGE_ACCESS_TOKEN}`
        );

        if (!searchRes.ok) {
            // Essayer la recherche par nom si l'ID direct échoue
            const searchUrl = `https://graph.facebook.com/v19.0/search?q=${encodeURIComponent(pageIdentifier)}&type=page&fields=id,name,followers_count,fan_count&access_token=${FACEBOOK_PAGE_ACCESS_TOKEN}`;
            const searchByRes = await fetch(searchUrl);
            if (!searchByRes.ok) {
                console.error("Facebook API erreur:", searchRes.status, await searchRes.text());
                return { followers: 0, totalLikes: 0, totalViews: 0 };
            }
            const searchData = await searchByRes.json();
            const page = searchData.data?.[0];
            if (!page) {
                console.log("Facebook: Page non trouvée pour", pageIdentifier);
                return { followers: 0, totalLikes: 0, totalViews: 0 };
            }
            return {
                followers: parseInt(String(page.followers_count || page.fan_count || "0"), 10) || 0,
                totalLikes: parseInt(String(page.fan_count || "0"), 10) || 0,
                totalViews: 0,
            };
        }

        const pageData = await searchRes.json();
        console.log("Facebook page data:", JSON.stringify(pageData).slice(0, 300));

        return {
            followers: parseInt(String(pageData.followers_count || pageData.fan_count || "0"), 10) || 0,
            totalLikes: parseInt(String(pageData.fan_count || "0"), 10) || 0,
            totalViews: 0,
        };
    } catch (error) {
        console.error("Erreur Facebook API:", error);
        return { followers: 0, totalLikes: 0, totalViews: 0 };
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
        const annaYtTotalLikes = annaYtMetrics.videos.reduce((sum, v) => sum + v.likes, 0);
        const annaYtTotalComments = annaYtMetrics.videos.reduce((sum, v) => sum + v.comments, 0);
        if (annaYtMetrics.subscribers > 0 || annaYtMetrics.totalViews > 0) {
            await prisma.dailySnapshot.upsert({
                where: { platform_owner_date: { platform: "youtube", owner: "anna", date: today } },
                create: {
                    platform: "youtube",
                    owner: "anna",
                    followers: annaYtMetrics.subscribers,
                    totalViews: annaYtMetrics.totalViews,
                    totalLikes: annaYtTotalLikes,
                    totalComments: annaYtTotalComments,
                    date: today,
                },
                update: {
                    followers: annaYtMetrics.subscribers,
                    totalViews: annaYtMetrics.totalViews,
                    totalLikes: annaYtTotalLikes,
                    totalComments: annaYtTotalComments,
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
        console.log("Instagram metrics:", JSON.stringify(annaIgMetrics));
        if (annaIgMetrics.followers > 0 || annaIgMetrics.totalLikes > 0 || annaIgMetrics.totalViews > 0 || annaIgMetrics.postsCount > 0) {
            try {
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
                console.log("Instagram snapshot saved successfully");
            } catch (igErr) {
                console.error("Instagram snapshot error:", igErr);
            }
        }
        results.anna_instagram = annaIgMetrics;

        // TikTok Anna (via Apify)
        const annaTtMetrics = await fetchTikTokViaApify(ANNA_TIKTOK_USER);
        if (annaTtMetrics.followers > 0 || annaTtMetrics.totalViews > 0 || annaTtMetrics.hearts > 0) {
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

        // Facebook Anna (via Graph API)
        const annaFbMetrics = await fetchFacebookMetrics(FACEBOOK_PAGE_ANNA);
        if (annaFbMetrics.followers > 0 || annaFbMetrics.totalLikes > 0) {
            await prisma.dailySnapshot.upsert({
                where: { platform_owner_date: { platform: "facebook", owner: "anna", date: today } },
                create: {
                    platform: "facebook",
                    owner: "anna",
                    followers: annaFbMetrics.followers,
                    totalLikes: annaFbMetrics.totalLikes,
                    totalViews: annaFbMetrics.totalViews,
                    date: today,
                },
                update: {
                    followers: annaFbMetrics.followers,
                    totalLikes: annaFbMetrics.totalLikes,
                    totalViews: annaFbMetrics.totalViews,
                },
            });
        }
        results.anna_facebook = annaFbMetrics;

        // ==========================================
        // DAVID - Collecte des métriques
        // ==========================================

        if (DAVID_YOUTUBE_CHANNEL_ID) {
            const davidYtMetrics = await fetchYouTubeMetrics(DAVID_YOUTUBE_CHANNEL_ID);
            const davidYtTotalLikes = davidYtMetrics.videos.reduce((sum, v) => sum + v.likes, 0);
            const davidYtTotalComments = davidYtMetrics.videos.reduce((sum, v) => sum + v.comments, 0);
            if (davidYtMetrics.subscribers > 0 || davidYtMetrics.totalViews > 0) {
                await prisma.dailySnapshot.upsert({
                    where: { platform_owner_date: { platform: "youtube", owner: "david", date: today } },
                    create: {
                        platform: "youtube",
                        owner: "david",
                        followers: davidYtMetrics.subscribers,
                        totalViews: davidYtMetrics.totalViews,
                        totalLikes: davidYtTotalLikes,
                        totalComments: davidYtTotalComments,
                        date: today,
                    },
                    update: {
                        followers: davidYtMetrics.subscribers,
                        totalViews: davidYtMetrics.totalViews,
                        totalLikes: davidYtTotalLikes,
                        totalComments: davidYtTotalComments,
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
            message: "Métriques collectées avec succès (YouTube API + PhantomBuster Instagram + Apify TikTok + Facebook Graph API)",
        });
    } catch (error) {
        console.error("Erreur collecte métriques:", error);
        return NextResponse.json({ error: "Erreur lors de la collecte des métriques" }, { status: 500 });
    }
}