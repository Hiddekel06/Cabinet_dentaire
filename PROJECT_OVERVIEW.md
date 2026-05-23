# Gestion de Cabinet Dentaire - Documentation Projet

## 📌 Présentation du Projet
Ce projet est une solution complète de gestion pour cabinets dentaires, visant à automatiser le suivi médical et financier des patients. L'application permet de gérer le cycle de vie complet d'un patient : de la prise de rendez-vous à la clôture du plan de traitement, en passant par la gestion des actes, des ordonnances et de la comptabilité journalière.

## 🛠 Stack Technique
- **Backend :** Laravel 12 (PHP 8.3) - API REST, Sanctum Auth.
- **Frontend :** React 19 + Vite - Tailwind CSS 4, React Router 7.
- **Base de données :** MySQL/PostgreSQL (gestion complexe des relations Patients/RDV/Traitements/Actes).

## 🚀 Logique Métier Clé
1. **Auto-création de Traitement :** Tout nouveau rendez-vous pour un patient sans suivi actif génère automatiquement un traitement "Consultation" avec l'acte "CS" (Consultation Simple).
2. **Tarification Snapshot :** Les tarifs des actes sont figés au moment de l'ajout au traitement pour protéger les devis en cours contre les changements futurs du catalogue.
3. **Double Système de Paiement :**
   - **Reçus de Session :** Pour les paiements immédiats lors d'une séance (encaissés en direct).
   - **Factures Cumulative :** Pour la clôture globale d'un plan de traitement long.

## ✅ Optimisations & Corrections Récentes (Mai 2026)

### 1. Performance & Scalabilité
- **Indexation des Téléphones :** Ajout d'une colonne `phone_normalized` indexée pour des recherches et vérifications d'unicité ultra-rapides.
- **Modularisation Frontend :** Découpage du composant massif `Appointments.jsx` en sous-composants (ex: `ValidationModal`).

### 2. Sécurité & Stabilité
- **Soft Delete :** Implémentation de la suppression logique sur les Patients, RDV et Séances.
- **Migration Robustesse (Production) :** Sécurisation des migrations de données en utilisant `DB::table` au lieu des modèles Eloquent pour éviter les conflits avec les traits (comme SoftDeletes) lors du déploiement.
- **Nettoyage Automatique :** Tâche planifiée (`app:cleanup-temp-files`) pour les PDF temporaires.

### 3. Corrections de Bugs (Comptabilité & UX)
- **Bug du Doublage :** Suppression du cumul erroné entre le reçu et la séance.
- **Rapports Financiers :** Calcul global du "Total Encaissé" sur l'ensemble de la pagination.
- **Disparition des RDV :** Séparation du RDV futur et de la séance initiale.
- **UX Séance :** Auto-remplissage du motif de RDV dans les soins prodigués.

## 🛡️ Points de Vigilance (Règles d'or)
1. **Migrations de Données :** NE JAMAIS utiliser les Modèles Eloquent (ex: `Patient::all()`) dans une migration. Utiliser toujours `DB::table('patients')` pour éviter les erreurs de colonnes manquantes (ex: `deleted_at`) en production.
2. **Idempotence :** Toujours vérifier si une colonne existe (`Schema::hasColumn`) avant de l'ajouter dans une migration pour permettre une relance sans erreur en cas de plantage partiel.
3. **Recherche :** Toujours utiliser `phone_normalized` pour les requêtes SQL par numéro.
4. **Cohérence Financière :** Maintenir le lien entre `medical_records.amount_collected` et `session_receipts.total_amount`.

