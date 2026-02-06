# Option A — Sanctum SPA (session + CSRF)

## 1. C’est quoi l’option A ?
L’option A utilise **Laravel Sanctum en mode SPA**. Le frontend et le backend communiquent via **cookies de session** et un **token CSRF**. Aucun token Bearer n’est stocké côté navigateur, ce qui simplifie la sécurité et l’authentification pour une application web classique.

**Avantages**
- Simple à utiliser côté React (pas de gestion manuelle de token).
- Sécurisé (CSRF + cookies httpOnly).
- Très bien adapté pour un front web et un back Laravel.

**Inconvénient**
- Moins pratique pour des clients mobiles natifs (où l’option “tokens” est plus adaptée).

---

## 2. Prérequis
- Backend Laravel avec Sanctum installé.
- Frontend React (Vite) sur un domaine/port autorisé.

---

## 3. Étapes côté Backend (Laravel)

### 3.1 Installer Sanctum (si pas déjà fait)
```bash
composer require laravel/sanctum
php artisan vendor:publish --provider="Laravel\Sanctum\SanctumServiceProvider"
php artisan migrate
```

### 3.2 Configurer les domaines “stateful”
Dans `.env` :
```
SANCTUM_STATEFUL_DOMAINS=localhost:5173,127.0.0.1:5173
SESSION_DOMAIN=localhost
```

### 3.3 Activer le middleware Sanctum
Dans `config/sanctum.php`, vérifier `stateful` et `middleware`.

### 3.4 CORS
Dans `config/cors.php` :
```php
'supports_credentials' => true,
'paths' => ['api/*', 'sanctum/csrf-cookie'],
'allowed_origins' => ['http://localhost:5173'],
```

### 3.5 Routes API protégées
Utiliser le middleware `auth:sanctum` :
```php
Route::middleware('auth:sanctum')->group(function () {
    // routes protégées
});
```

---

## 4. Étapes côté Frontend (React)

### 4.1 Appel CSRF
Avant login, appeler :
```
GET /sanctum/csrf-cookie
```

### 4.2 Login
Ensuite :
```
POST /api/login
```

### 4.3 Utiliser axios avec cookies
```js
const api = axios.create({
  baseURL: 'http://localhost:8000',
  withCredentials: true,
  headers: { Accept: 'application/json' },
});
```

### 4.4 Récupérer l’utilisateur connecté
```
GET /api/user
```

### 4.5 Logout
```
POST /api/logout
```

---

## 5. Flow complet (résumé)
1. `GET /sanctum/csrf-cookie`
2. `POST /api/login`
3. `GET /api/user` (ou endpoints protégés)
4. `POST /api/logout`

---

## 6. Checklist rapide
- [ ] Sanctum installé et migré
- [ ] CORS autorise le frontend
- [ ] `SANCTUM_STATEFUL_DOMAINS` configuré
- [ ] `withCredentials: true` côté axios
- [ ] `auth:sanctum` sur les routes protégées

---

## 7. Fichiers utiles dans ce projet
- Backend : `routes/api.php`
- Frontend : `src/services/api.js`
- Frontend : `src/context/AuthContext.jsx`

---

Si tu veux, je peux ensuite **implémenter les endpoints manquants** (ex: `medical_certificates`) et brancher la page React sur l’API réelle.
