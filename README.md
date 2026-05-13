# 🎯 Dashboard Marketing - Anna OLLIVIER

Application dashboard de suivi marketing pour **Anna OLLIVIER**, psychologue, qui vend une formation en ligne via Système.io.

## 🌐 Liens

- **Site web** : [anna-ollivier-psy.com](https://anna-ollivier-psy.com)
- **YouTube** : [@Confidencesdetoutpetits-Monreg](https://www.youtube.com/@Confidencesdetoutpetits-Monreg)
- **TikTok** : @anna.ollivier.psy
- **Instagram** : @anna.ollivier.psy
- **Dashboard** : Déployé sur Vercel

## 📋 Fonctionnalités

### 📊 Métriques Réseaux Sociaux
- Collecte automatique quotidienne des vues, likes, commentaires YouTube
- Suivi multi-plateformes : YouTube, TikTok, Instagram, Facebook
- Support multi-propriétaire (Anna + David)
- Historique des abonnés et vues avec graphiques d'évolution

### 🔍 Analyse de Contenu
- Visualisation des analyses de pertinence des discussions
- Données issues des automatisations N8N stockées dans Notion
- Filtrage par plateforme (YouTube, TikTok, Facebook, Instagram)

### 🏪 Veille Concurrence
- Suivi des concurrents et analyses comparatives
- Suggestions d'amélioration basées sur l'analyse du marché

### 📝 Backlog de Contenu
- Liste priorisée des idées de contenu
- Statuts : À faire, En cours, Terminé
- Filtrage par priorité et type

## 🛠️ Tech Stack

- **Framework** : Next.js 14 (App Router)
- **Base de données** : SQLite (dev) / PostgreSQL (prod via Prisma ORM)
- **Authentification** : NextAuth.js (Credentials Provider)
- **UI** : Tailwind CSS
- **Graphiques** : Recharts
- **Déploiement** : Vercel

## 🚀 Installation

```bash
# Cloner le repo
git clone https://github.com/david72220/anna-marketing-dashboard.git
cd dashboard

# Installer les dépendances
npm install

# Configurer les variables d'environnement
cp .env.example .env.local
# Éditer .env.local avec vos valeurs

# Base de données
npx prisma db push
npx prisma generate

# Développement
npm run dev
```

## 🔐 Variables d'Environnement

Voir `.env.example` pour la liste complète :

| Variable | Description |
|---|---|
| `DATABASE_URL` | URL de la base de données |
| `NEXTAUTH_SECRET` | Secret JWT (min 32 caractères) |
| `NEXTAUTH_URL` | URL de l'application |
| `ADMIN_EMAIL` | Email de connexion |
| `ADMIN_PASSWORD` | Mot de passe de connexion |
| `NOTION_API_KEY` | Clé API Notion |
| `NOTION_*_DB_ID` | IDs des bases Notion |
| `YOUTUBE_API_KEY` | Clé API YouTube Data v3 |
| `YOUTUBE_CHANNEL_ANNA` | ID chaîne YouTube Anna |
| `YOUTUBE_CHANNEL_DAVID` | ID chaîne YouTube David |
| `TIKTOK_USERNAME_ANNA` | Username TikTok Anna |
| `INSTAGRAM_USERNAME_ANNA` | Username Instagram Anna |
| `FACEBOOK_PAGE_ANNA` | Nom page Facebook Anna |
| `CRON_SECRET` | Secret pour sécuriser le cron |

## 📁 Structure

```
dashboard/
├── prisma/
│   └── schema.prisma          # Schéma base de données
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── auth/           # Authentification NextAuth
│   │   │   ├── notion/         # APIs Notion (analyses, veille, backlog)
│   │   │   └── social/         # APIs réseaux sociaux (collect + metrics)
│   │   └── dashboard/
│   │       ├── page.tsx        # Vue d'ensemble (métriques sociales)
│   │       ├── analyses/      # Analyses de contenu
│   │       ├── veille/        # Veille concurrentielle
│   │       └── backlog/       # Backlog contenu
│   ├── components/
│   │   └── Sidebar.tsx         # Navigation latérale
│   └── lib/
│       ├── auth.ts             # Configuration NextAuth
│       ├── notion.ts           # Client Notion API
│       └── prisma.ts           # Client Prisma singleton
├── .env.example
├── vercel.json                 # Config Vercel (cron jobs)
├── next.config.mjs
├── tailwind.config.ts
└── package.json
```

## 🔄 Collecte Automatique

La collecte quotidienne des métriques sociales est configurée via Vercel Cron Jobs :

```json
// vercel.json
{
  "crons": [{
    "path": "/api/social/collect",
    "schedule": "0 6 * * *"
  }]
}
```

La route est sécurisée par un header `Authorization: Bearer <CRON_SECRET>`.

### Plateformes supportées

| Plateforme | Données collectées | Statut |
|---|---|---|
| YouTube | Vues, likes, commentaires, abonnés | ✅ API officielle |
| TikTok | Abonnés, likes | ⚠️ Scraping (RapidAPI recommandé) |
| Instagram | Abonnés, publications | ⚠️ Scraping (RapidAPI recommandé) |
| Facebook | À configurer | 🔜 API Graph Facebook |

## 📝 Licence

Projet privé - Tous droits réservés.