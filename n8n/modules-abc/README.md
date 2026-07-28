# Modules A, B, C — version sécurisée

Workflows N8N transformés le 28/07/2026 pour retirer tous les secrets en dur et
basculer les appels LLM sur l'Ollama interne du VPS.

**Ces fichiers ne sont pas générés automatiquement** — contrairement au Module D,
ils dérivent des workflows existants en production. Les réimporter écrase la
version en ligne.

| Fichier | Workflow | ID actuel |
|---|---|---|
| `module-a.json` | 🔍 Anna — Module A — Analyse Contenu V3 | `gH27P2tysvL3KffF` |
| `module-b.json` | 📊 Anna — Module B — Veille Concurrence | `w500k8CVeN4NPjhC` |
| `module-c.json` | 💡 Anna — Module C — Suggestions Posts | `W2RV0vmpI2hQFjsv` |

---

## Ce qui a changé

### Les trois modules — appel LLM

Le nœud `Cascade LLM *` appelait Anthropic avec **la clé écrite en dur** dans son
code. Il appelle désormais l'Ollama du VPS :

```
http://172.18.0.1:11434/api/chat   modèle glm-5.2:cloud   think: false
```

Cet endpoint est sur le réseau Docker interne et **ne demande aucune
authentification** : il n'y a donc plus aucun secret dans ces nœuds, ni même de
credential à gérer. C'est ce qui rend la correction définitive plutôt que
cosmétique — un nœud Code N8N ne peut ni lire `$env` ni utiliser
`httpRequestWithAuthentication`, donc toute API à clé appelée depuis un Code node
oblige à versionner le secret.

La sortie garde le **format Anthropic** (`content[0].text`) : les nœuds `Parse` en
aval sont inchangés.

`num_predict` reprend le `maxTokens` d'origine : A 2000, B 2500, C 6000.

Le repli deepseek/qwen disparaît. Un échec lève une erreur visible dans les
exécutions plutôt que de produire un résultat silencieusement dégradé.

### Module A — token Apify

`Fetch TikTok Apify` et `Fetch Instagram Apify` portaient le token **dans l'URL**,
en query string. Une URL atterrit dans les logs d'exécution N8N et dans les logs
d'accès Traefik ; un en-tête d'authentification, non.

Les deux nœuds utilisent maintenant le credential **`APIFY Anna`** (Header Auth).

### Module B — clé Serper

`Serper Requete 1` et `2` portaient `X-API-KEY` en clair dans les paramètres
d'en-tête. Ils utilisent maintenant le credential **`Serper API`**.

⚠️ **À vérifier avant le premier lancement** : ce credential doit contenir
`Name = X-API-KEY` et `Value = <la clé Serper>`. Il existait déjà mais n'était
utilisé nulle part — son contenu n'a pas pu être vérifié (chiffré en base).

---

## Import

Pour chaque module, dans l'ordre :

1. Ouvrir le workflow existant dans N8N, le **désactiver**
2. Importer le fichier (`...` → *Import from File*) — ou supprimer puis réimporter
3. **Réassigner les credentials** : ils ne survivent jamais à un import
4. Réactiver

### Credentials attendus après import

| Module | Nœuds | Credential |
|---|---|---|
| A, B, C | tous les nœuds Notion | `Notion David account` |
| A, B, C | nœud Gmail | `Gmail Anna` |
| A | `Fetch TikTok Apify`, `Fetch Instagram Apify` | `APIFY Anna` |
| B | `Serper Requete 1`, `Serper Requete 2` | `Serper API` |
| A, B, C | `Cascade LLM *` | **aucun** — Ollama interne |

---

## Protection des webhooks — à appliquer sur le VPS

Les trois webhooks `anna-analyse-contenu`, `anna-veille-concurrence` et
`anna-suggestions-posts` sont sans authentification. Le nœud Webhook de N8N ne
sait pas les protéger : testé sur le Module D, `authentication: headerAuth` avec
un credential rempli et assigné laissait passer les appels sans jeton comme avec
un jeton invalide.

La protection est donc portée par **Traefik**, qui l'applique réellement.

### 1. Générer les identifiants

Sur le VPS. Le mot de passe ne doit transiter nulle part ailleurs :

```bash
MDP=$(openssl rand -base64 24)
echo "mot de passe (a copier dans Vercel) : $MDP"
echo "hash pour le compose               : $(openssl passwd -apr1 "$MDP")"
```

### 2. Ajouter le middleware et le routeur

Dans `/root/docker-compose.yml`, service `n8n`, **ajouter** ces lignes aux
`labels` existants (ne rien retirer) :

```yaml
      # Webhooks Anna protégés par basic auth au niveau du reverse proxy.
      # N8N 2.23.3 n'applique pas l'authentification de son propre nœud Webhook.
      - "traefik.http.routers.n8n-anna-webhooks.rule=Host(`n8n.srv1179315.hstgr.cloud`) && (PathPrefix(`/webhook/anna-`) || PathPrefix(`/webhook-test/anna-`))"
      - "traefik.http.routers.n8n-anna-webhooks.priority=100"
      - "traefik.http.routers.n8n-anna-webhooks.entrypoints=websecure"
      - "traefik.http.routers.n8n-anna-webhooks.tls=true"
      - "traefik.http.routers.n8n-anna-webhooks.tls.certresolver=mytlschallenge"
      - "traefik.http.routers.n8n-anna-webhooks.service=n8n"
      - "traefik.http.routers.n8n-anna-webhooks.middlewares=anna-webhook-auth"
      - "traefik.http.middlewares.anna-webhook-auth.basicauth.users=anna:LE_HASH_ICI"
```

Le `$` du hash doit être **doublé en `$$`** dans un fichier compose, sinon Docker
l'interprète comme une variable. Exemple : `$apr1$abc...` devient `$$apr1$$abc...`.

`priority=100` fait gagner ce routeur sur le routeur `n8n` général, plus permissif.

Le préfixe `/webhook/anna-` ne touche que les trois webhooks Anna : les 101 autres
chemins enregistrés dans N8N restent inchangés.

### 3. Appliquer

```bash
cd /root && docker compose up -d n8n
```

### 4. Vérifier

```bash
# sans identifiants -> doit renvoyer 401
curl -s -o /dev/null -w "%{http_code}\n" -X POST \
  https://n8n.srv1179315.hstgr.cloud/webhook/anna-veille-concurrence -d '{}'

# un autre webhook, non concerne -> ne doit PAS renvoyer 401
curl -s -o /dev/null -w "%{http_code}\n" -X POST \
  https://n8n.srv1179315.hstgr.cloud/webhook/agent-callback -d '{}'
```

Un 401 sur le premier prouve que la protection s'applique. Vérifier aussi
qu'**aucune exécution n'a démarré** dans l'historique N8N — c'est la seule preuve
qui compte, la leçon du Module D.

### 5. Côté dashboard

Ajouter la variable, en local et sur Vercel :

```
N8N_WEBHOOK_BASIC_AUTH="anna:LE_MOT_DE_PASSE"
```

Les routes `analyses`, `veille` et `backlog` envoient l'en-tête `Authorization:
Basic` via `src/lib/n8n.ts`. Sans cette variable, Traefik répondra 401 et les
boutons du dashboard cesseront de fonctionner.
