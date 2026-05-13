# 🎯 Dashboard Marketing - Anna OLLIVIER

Application dashboard de suivi marketing pour **Anna OLLIVIER**, psychologue, qui vend une formation en ligne via Système.io.

## 🌐 Liens

- **Site web** : [anna-ollivier-psy.com](https://anna-ollivier-psy.com)
- **YouTube** : [@Confidencesdetoutpetits-Monreg](https://www.youtube.com/@Confidencesdetoutpetits-Monreg)
- **TikTok** : @anna.ollivier.psy
- **Dashboard** : Déployé sur Vercel

## 📋 Fonctionnalités

### 📊 Métriques Réseaux Sociaux
- Collecte automatique quotidienne des vues, likes, commentaires YouTube
- Historique des abonnés et vues avec graphiques d'évolution
- Placeholders pour TikTok et Facebook (APIs à configurer)

### 🔍 Analyse de Contenu
- Visualisation des analyses de pertinence des discussions
- Données issues des automatisations N8N stockées dans Notion
- Filtrage par plateforme (YouTube, TikTok, Facebook)

### 🏪 Veille Concurrence
- Suivi des concurrents et analyses comparatives
- Suggestions d'amélioration basées sur l'analyse du marché

### 📝 Backlog de Contenu
- Liste priorisée des idées de contenu
- Statuts : À faire, En cours, Terminé
- Filtrage par priorité et type

## 🛠️ Tech Stack

- **Framework** : Next.js 14 (App Router)
- **Base de données** : PostgreSQL (Prisma ORM)
- **Authentification** : NextAuth.js (Credentials Provider)
- **UI** : Tailwind CSS
- **Graphiques** : Recharts
- **Déploiement** : Vercel

## 🚀 Installation

```bash
# Cloner le repo
git clone <repo-url>
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

```env
# Base de données
DATABASE_URL="postgresql://user:password@host:5432/db_name"

# Authentification
NEXTAUTH_SECRET="votre-secret-jwt"
NEXTAUTH_URL="https://votre-domaine.vercel.app"
APP_PASSWORD="votre-mot-de-passe"

# APIs
NOTION_API_KEY="secret_xxx"
NOTION_DATABASE_ANALYSES_ID="xxx"
NOTION_DATABASE_VEILLE_ID="xxx"
NOTION_DATABASE_BACKLOG_ID="xxx"
YOUTUBE_API_KEY="xxx"
YOUTUBE_CHANNEL_ID="UCxxx"

# Cron
CRON_SECRET="votre-secret-cron"
```

## 📁 Structure

```
dashboard/
├── prisma/
│   └── schema.prisma          # Schéma base de données
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── auth/           # Authentification
│   │   │   ├── notion/         # APIs Notion
│   │   │   └── social/         # APIs réseaux sociaux
│   │   └── dashboard/
│   │       ├── page.tsx        # Vue d'ensemble
│   │       ├── analyses/      # Analyses de contenu
│   │       ├── veille/        # Veille concurrentielle
│   │       └── backlog/       # Backlog contenu
│   ├── components/
│   │   └── Sidebar.tsx
│   └── lib/
│       ├── auth.ts
│       ├── notion.ts
│       └── prisma.ts
├── .env.local
├── next.config.mjs
├── tailwind.config.ts
└── package.json
```

## 🔄 Collecte Automatique

Pour activer la collecte quotidienne des métriques, configurez un cron job vers :

```
POST https://votre-domaine.vercel.app/api/social/collect
Authorization: Bearer <CRON_SECRET>
```

Sur Vercel, ajoutez dans `vercel.json` :

```json
{
  "crons": [{
    "path": "/api/social/collect",
    "schedule": "0 6 * * *"
  }]
}
```

## 📝 Licence

Projet privé - Tous droits réservés.