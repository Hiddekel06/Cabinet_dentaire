# Contexte du Projet : Cabinet Dentaire

Ce document fournit une vue d'ensemble du projet **Cabinet Dentaire**, une solution complète de gestion pour cabinets dentaires. Il sert de guide d'accueil pour tout développeur rejoignant le projet.

---

## 1. Vue d'Ensemble
Le projet est une application web full-stack permettant de gérer :
- Le cycle de vie complet des patients (dossier médical, antécédents).
- La planification des rendez-vous avec synchronisation automatique des traitements.
- Le suivi des traitements (actes effectués, sessions, observations cliniques).
- La facturation et l'émission de reçus de session.
- La gestion des prescriptions (ordonnances) et certificats médicaux.
- Le catalogue des actes dentaires (NGAP/CCAM) et l'inventaire des produits.

---

## 2. Architecture Technique

### Backend (Laravel 12)
- **Framework :** Laravel 12.x (PHP 8.2+)
- **Authentification :** Laravel Sanctum (Token-based SPA auth)
- **Base de données :** MySQL (Schéma relationnel complexe avec 20+ tables)
- **Génération de documents :** PHPOffice/PHPWord pour les certificats, PDF pour les factures/ordonnances.
- **Imports :** Maatwebsite Excel pour le catalogue des actes dentaires.

### Frontend (React 19)
- **Framework :** React 19.x + Vite
- **Routage :** React Router 7
- **Styling :** Tailwind CSS 4
- **Gestion d'état :** Context API pour l'authentification, hooks locaux (useState/useEffect) pour les pages.
- **Client API :** Axios avec un système de cache minimal (TTL 5 min).

---

## 3. Modules Principaux et Flux de Données

### 3.1 Gestion des Patients & Rendez-vous
- Les patients sont le cœur du système.
- Un rendez-vous peut être lié à un traitement. Si aucun traitement n'est actif lors de la création d'un rendez-vous, un traitement "Consultation" est automatiquement créé.

### 3.2 Cycle de Vie des Traitements (`PatientTreatment`)
1. **Initialisation :** Un traitement est créé (Statut : `planned` ou `in_progress`).
2. **Sessions :** À chaque rendez-vous, des actes sont ajoutés (`PatientTreatmentAct`) avec un "tarif snapshot" (prix figé au moment de l'acte).
3. **Observations :** Des notes cliniques (`ClinicalObservation`) et des comptes-rendus de session (`MedicalRecord`) sont enregistrés.
4. **Clôture :** Une fois les actes terminés et facturés, le traitement passe au statut `completed`.

### 3.3 Facturation et Reçus
- **Factures (`Invoice`) :** Regroupent plusieurs actes pour paiement global.
- **Reçus de Session (`SessionReceipt`) :** Permettent un suivi détaillé des paiements par session, avec gestion d'événements de paiement.

---

## 4. Structure du Code

### Backend (`cabinet_dentaire_back/`)
- `app/Models/` : Contient 16+ modèles avec relations complexes.
- `app/Http/Controllers/` : Logique métier. Note : Les contrôleurs comme `PatientTreatmentController` sont denses et gèrent beaucoup de logique (en cours de refactorisation vers des Services).
- `database/migrations/` : Historique complet de la base de données. Les migrations récentes (Mai 2026) introduisent les rôles d'utilisateurs et les observations cliniques.

### Frontend (`cabinet_dentaire_front/`)
- `src/pages/` : Contient les composants pages (souvent >300 lignes).
- `src/services/api.js` : Point d'entrée unique pour toutes les requêtes API avec gestion centralisée du cache.
- `src/context/` : Gestion de l'état global (Auth).

---

## 5. État Actuel & Dette Technique (Mai 2026)
- **Couverture de tests :** Très faible (tests unitaires/feature à renforcer).
- **Validation :** Principalement côté serveur. La validation côté client (React Hook Form) est à généraliser.
- **Gestion d'erreur :** Utilisation fréquente de `alert()`. Un système de notifications (Toasts) est recommandé.
- **Rôles :** Les rôles (`admin`, `dentist`) sont présents en base de données mais l'autorisation (Policies/Gates) est en cours de déploiement.

---

## 6. Guide de Démarrage Rapide

### Installation Backend
1. `cd cabinet_dentaire_back`
2. `composer install`
3. `cp .env.example .env` (configurer la DB)
4. `php artisan key:generate`
5. `php artisan migrate --seed`
6. `php artisan serve`

### Installation Frontend
1. `cd cabinet_dentaire_front`
2. `npm install`
3. `cp .env.example .env` (configurer `VITE_API_URL`)
4. `npm run dev`

---

## 7. Documentation Complémentaire
- `COMPREHENSIVE_APPLICATION_ANALYSIS.md` : Analyse détaillée de l'architecture (Mars 2026).
- `IMPLEMENTATION_ROADMAP.md` : Plan d'action pour les améliorations futures.
- `cabinet_dentaire_back/Documentation/` : Spécifications détaillées par module (Facturation, Ordonnances, etc.).
