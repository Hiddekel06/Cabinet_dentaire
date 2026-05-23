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
- **Indexation des Téléphones :** Ajout d'une colonne `phone_normalized` indexée pour des recherches et vérifications d'unicité ultra-rapides sur des milliers de patients.
- **Modularisation Frontend :** Découpage du composant massif `Appointments.jsx` (2200+ lignes) en sous-composants (ex: `ValidationModal`) pour améliorer la fluidité de l'interface.

### 2. Sécurité des Données
- **Soft Delete :** Implémentation de la suppression logique sur les Patients, RDV et Séances. Les données supprimées par erreur peuvent désormais être restaurées.
- **Nettoyage Automatique :** Mise en place d'une tâche planifiée (`CleanupTempFiles`) qui supprime les PDF temporaires de plus de 24h pour éviter la saturation du disque serveur.

### 3. Corrections de Bugs (Comptabilité & UX)
- **Bug du Doublage :** Suppression de la logique qui additionnait par erreur le montant du reçu au montant de la séance, causant des montants erronés (ex: 30 000 au lieu de 5 000).
- **Rapports Financiers :** Correction du calcul du "Total Encaissé" qui ne prenait auparavant que la page en cours au lieu du montant global filtré.
- **Disparition des RDV :** Correction du bug qui marquait les futurs rendez-vous comme "Terminés" lors de l'initialisation du diagnostic.
- **UX Séance :** Le motif du rendez-vous est désormais pré-rempli automatiquement dans la description des soins prodigués.

## 🛡️ Points de Vigilance
- Toujours utiliser `phone_normalized` pour les recherches SQL par téléphone.
- Lors de l'ajout d'une fonctionnalité financière, vérifier la cohérence entre `medical_records.amount_collected` et `session_receipts.total_amount`.
- Maintenir le découpage des composants React pour éviter les fichiers de plus de 500 lignes.
