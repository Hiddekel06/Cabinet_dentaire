# Connecter un Frontend React (Vite) à une API Laravel

## 1. Préparer l’URL de l’API Laravel

- Déploie ton backend Laravel sur un hébergeur (ex : https://api.monsite.com)
- Vérifie que l’API fonctionne (ex : https://api.monsite.com/api/patients)

## 2. Ajouter la variable d’environnement dans React

- À la racine de ton projet React, crée ou édite le fichier `.env` :

```
VITE_API_URL=https://api.monsite.com/api
```

- Cette variable sera accessible dans tout ton code via `import.meta.env.VITE_API_URL`

## 3. Utiliser l’URL dans tes appels API

- Dans ton fichier de services (ex : `src/services/api.js`) :

```js
const API_URL = import.meta.env.VITE_API_URL;

export const patientAPI = {
  getAll: (page, params) => fetch(`${API_URL}/patients?...`),
  // ...autres méthodes
};
```

- Remplace toutes les URLs "en dur" par cette variable.

## 4. Déployer sur Vercel

- Sur Vercel, va dans les paramètres du projet > Environment Variables
- Ajoute la variable :
  - Name : `VITE_API_URL`
  - Value : `https://api.monsite.com/api`
- Redeploie ton front

## 5. Configurer le CORS côté Laravel

- Dans `config/cors.php`, ajoute l’URL de ton front (ex : https://ton-front.vercel.app) dans `allowed_origins` :

```php
'allowed_origins' => [
    'https://ton-front.vercel.app',
],
```

- Vide le cache config si besoin :
```
php artisan config:cache
```

## 6. Tester la connexion

- Lance ton front en local ou sur Vercel
- Vérifie que les appels API fonctionnent (pas d’erreur CORS, données reçues)

## 7. Résumé rapide

- `.env` React : VITE_API_URL=... (local et sur Vercel)
- Utilise `import.meta.env.VITE_API_URL` dans le code
- CORS Laravel autorise le domaine du front
- Teste les appels API depuis le front

---

# Déployer Laravel sur cPanel (avec un front déjà sur Vercel)

## 1. Préparer les fichiers Laravel
- Sur ton PC, supprime les dossiers inutiles (node_modules, vendor si tu veux regénérer sur le serveur).
- Compresse tout le projet Laravel (sauf le dossier public, voir étape 3).

## 2. Uploader sur cPanel
- Connecte-toi à cPanel > File Manager.
- Va dans le dossier souhaité (souvent public_html ou un sous-dossier).
- Upload ton zip et extrait-le.

## 3. Placer le dossier public
- Le contenu du dossier `public` de Laravel doit être dans `public_html` (ou le dossier racine web de ton hébergeur).
- Les autres dossiers (app, bootstrap, config, etc.) doivent être en dehors de public_html si possible (sinon, dans un sous-dossier sécurisé).
- Modifie le fichier `index.php` dans public_html pour pointer vers le bon chemin des autoload et bootstrap (exemple : `require __DIR__.'/../vendor/autoload.php';` à adapter selon l'arborescence).

## 4. Installer les dépendances
- Ouvre le Terminal cPanel (ou connecte-toi en SSH si possible).
- Va dans le dossier du projet Laravel.
- Lance :
```
composer install --no-dev --optimize-autoloader
```

## 5. Configurer le .env
- Copie `.env.example` en `.env` si besoin.
- Modifie les variables :
  - DB_HOST, DB_DATABASE, DB_USERNAME, DB_PASSWORD (infos de ta base cPanel)
  - APP_URL (ex : https://api.tonsite.com)
  - CORS (voir plus bas)

## 6. Générer la clé d’application
```
php artisan key:generate
```

## 7. Lancer les migrations
```
php artisan migrate --force
```

## 8. Droits d’écriture
- Donne les droits d’écriture à `storage/` et `bootstrap/cache/` :
```
chmod -R 775 storage bootstrap/cache
```

## 9. Configurer le CORS
- Dans `config/cors.php`, ajoute l’URL de ton front Vercel dans `allowed_origins` :
```php
'allowed_origins' => [
    'https://ton-front.vercel.app',
],
```
- Vide le cache config :
```
php artisan config:cache
```

## 10. Sécurité et finitions
- Mets `APP_DEBUG=false` dans `.env`.
- Vérifie la version PHP (>=8.1 recommandé).
- Active HTTPS sur ton domaine si possible.

## 11. Tester l’API
- Depuis ton front sur Vercel, vérifie que les appels API fonctionnent.
- Si erreur CORS, revois la config.
- Si erreur 500, vérifie les logs dans `storage/logs/`.

---

# Déploiement Laravel sur cPanel via Git (workflow moderne)

## 1. Préparer le dépôt Git
- Héberge ton projet Laravel sur GitHub, GitLab ou Bitbucket (privé ou public).
- Mets à jour ton .gitignore pour ne pas versionner `.env`, `vendor/`, `node_modules/`, etc.

## 2. Cloner le dépôt sur cPanel
- Ouvre cPanel > Git Version Control (ou Terminal SSH si disponible).
- Clone le repo dans un dossier (ex : `/home/username/laravel-backend`).
- Pour mettre à jour :
```
cd /home/username/laravel-backend
git pull origin main
```

## 3. Configurer le dossier public
- Le dossier `public` de Laravel doit pointer sur `public_html` (ou configurer un sous-domaine qui pointe sur `/laravel-backend/public`).
- Si ce n'est pas possible, copie le contenu de `public/` dans `public_html` et adapte les chemins dans `public/index.php`.

## 4. Installer les dépendances et configurer
- Après chaque `git pull` :
```
composer install --no-dev --optimize-autoloader
php artisan migrate --force
php artisan config:cache
```
- Mets à jour `.env` si besoin (jamais versionné !).

## 5. Gestion des API (meilleures pratiques)

### a) Structure des routes
- Toutes les routes API doivent être dans `routes/api.php`.
- Utilise un préfixe versionné :
```php
Route::prefix('v1')->group(function() {
    Route::apiResource('patients', PatientController::class);
    // autres routes
});
```
- Pour une nouvelle version, crée un dossier `app/Http/Controllers/Api/V2` et un nouveau groupe de routes `v2`.

### b) Sécurité des API
- Utilise Laravel Sanctum ou Passport pour l’authentification (tokens).
- Protège les routes sensibles avec le middleware `auth:sanctum` ou `auth:api`.
- Limite le nombre de requêtes (throttle) :
```php
Route::middleware('throttle:60,1')->group(function() {
    // routes protégées
});
```

### c) CORS
- Dans `config/cors.php`, autorise uniquement le domaine de ton front (Vercel) :
```php
'allowed_origins' => [
    'https://ton-front.vercel.app',
],
```
- Après modification :
```
php artisan config:cache
```

### d) Format des réponses API
- Utilise toujours un format JSON standardisé :
```json
{
  "status": "success",
  "data": {...},
  "message": "..."
}
```
- Pour les erreurs :
```json
{
  "status": "error",
  "message": "Erreur explicite",
  "errors": { "champ": ["message"] }
}
```
- Utilise les Resources Laravel (`return new PatientResource($patient)`).

### e) Versionning et évolutions
- Ne casse jamais une API déjà utilisée par le front : crée une nouvelle version (`v2`) si besoin.
- Documente chaque endpoint (Swagger, Postman, README).

### f) Sécurité supplémentaire
- Désactive l’indexation des dossiers (Options -Indexes dans .htaccess).
- Mets `APP_DEBUG=false` en production.
- Surveille les logs (`storage/logs/laravel.log`).

## 6. Workflow de mise à jour
- Pour chaque modification :
  1. Commit & push sur GitHub
  2. Sur cPanel : `git pull origin main`
  3. `composer install`, `php artisan migrate`, `php artisan config:cache`
  4. Tester l’API

## 7. Résumé connexion front ↔ back
- Front sur Vercel, backend sur cPanel (via git)
- API versionnée, sécurisée, CORS configuré
- Front utilise l’URL API via `.env` (VITE_API_URL)
- Mises à jour backend faciles via git pull

---

**Résumé** :
- Front React sur Vercel (déjà fait)
- Backend Laravel sur cPanel (public dans public_html, reste du code sécurisé)
- .env bien configuré
- CORS ouvert pour le front
- Composer, migrations, permissions OK
- Teste la connexion front ↔ back

Besoin d’un exemple de structure de fichiers ou d’aide sur un point précis ? Demande-moi !
