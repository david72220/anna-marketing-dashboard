// Appels aux webhooks N8N du projet Anna (Modules A, B, C).
//
// Ces webhooks sont protégés par un basic auth au niveau de Traefik, pas par
// N8N : sur N8N 2.23.3, `authentication: headerAuth` sur un nœud Webhook n'a
// pas protégé l'endpoint, même avec un credential rempli et assigné — des
// appels sans jeton et avec un jeton invalide déclenchaient l'exécution
// (vérifié trois fois, avant et après un cycle Inactive/Active). La protection
// a donc été déplacée dans le reverse proxy, qui lui l'applique réellement.
//
// Variable attendue : N8N_WEBHOOK_BASIC_AUTH="utilisateur:motdepasse",
// identique aux identifiants du middleware Traefik `anna-webhook-auth`.

const IDENTIFIANTS = process.env.N8N_WEBHOOK_BASIC_AUTH;

/**
 * En-têtes à utiliser pour tout appel aux webhooks `anna-*`.
 * Sans identifiants configurés, Traefik répondra 401 : mieux vaut le détecter
 * via `webhookAuthConfiguree()` et rendre une erreur explicite.
 */
export function enTetesWebhookN8N(): Record<string, string> {
    const entetes: Record<string, string> = { "Content-Type": "application/json" };
    if (!IDENTIFIANTS) return entetes;
    entetes.Authorization = `Basic ${Buffer.from(IDENTIFIANTS).toString("base64")}`;
    return entetes;
}

export function webhookAuthConfiguree(): boolean {
    return Boolean(IDENTIFIANTS);
}
