# 🗺️ Roadmap Migration : TREATMENTS → DENTAL_ACTS

**Date de début** : 5 mars 2026  
**Statut** : En cours  
**Documentation complète** : [MIGRATION_TREATMENTS_TO_DENTAL_ACTS.md](./MIGRATION_TREATMENTS_TO_DENTAL_ACTS.md)

---

## 📊 Vue d'ensemble

```
Ancien modèle : Patient → Treatment (catalogue) → Actes
Nouveau modèle : Patient → Actes dentaires (direct)
```

**Tables impactées** :
- ✏️ `patient_treatments` (modifiée)
- ✏️ `invoice_items` (modifiée)
- ❌ `treatments` (supprimée)
- ✅ `dental_acts` (nouvelle centralité)

---

## 📝 Checklist Globale

- [ ] Phase 0 : Préparation & Sécurité
- [ ] Phase 1 : Import des Actes Dentaires
- [ ] Phase 2 : Migrations Base de Données
- [ ] Phase 3 : Refactoring Backend
- [ ] Phase 4 : Refactoring Frontend
- [ ] Phase 5 : Tests & Validation
- [ ] Phase 6 : Déploiement

---

## 🔒 PHASE 0 : Préparation & Sécurité

**Objectif** : Sécuriser avant de modifier

### Étape 0.1 : Backup
- [ ] Créer backup complet de la base de données
- [ ] Sauvegarder fichier `.env`
- [ ] Commiter tous les changements en cours

**Commandes** :
```bash
# Backup DB (exemple MySQL)
php artisan db:backup

# Commit Git
git add .
git commit -m "Sauvegarde avant migration treatments → dental_acts"
```

### Étape 0.2 : Branche Git
- [ ] Créer branche `feature/migration-dental-acts`
- [ ] Push la branche

**Commandes** :
```bash
git checkout -b feature/migration-dental-acts
git push -u origin feature/migration-dental-acts
```

### Étape 0.3 : Documentation
- [x] Créer fichier `MIGRATION_TREATMENTS_TO_DENTAL_ACTS.md`
- [x] Créer roadmap (ce fichier)
- [x] Générer diagrammes de conception

---

## 📥 PHASE 1 : Import des Actes Dentaires

**Objectif** : Peupler la table `dental_acts` avant de supprimer `treatments`

### Étape 1.1 : Préparer le fichier Excel
- [ ] Créer template CSV/Excel (`dental_acts_template.csv`)
- [ ] Remplir avec les actes dentaires réels
- [ ] Valider la structure (colonnes, données)

**Template** : `database/seeders/data/dental_acts_template.csv`

**Structure attendue** :
```
code | name | category | tarif | description
```

**Nombre d'actes à importer** : ______ (à définir)

### Étape 1.2 : Créer la classe d'import
- [ ] Créer `app/Imports/DentalActsImport.php`
- [ ] Implémenter validation (code unique, tarif > 0)
- [ ] Gérer les erreurs (lignes invalides)

**Commande** :
```bash
php artisan make:import DentalActsImport --model=DentalAct
```

### Étape 1.3 : Créer l'endpoint d'import
- [ ] Ajouter méthode `import()` dans `DentalActController`
- [ ] Ajouter route `POST /api/dental-acts/import`
- [ ] Tester upload fichier

**Route** :
```php
Route::post('/dental-acts/import', [DentalActController::class, 'import']);
```

### Étape 1.4 : Importer les données
- [ ] Tester import avec template rempli
- [ ] Vérifier données dans `dental_acts`
- [ ] Résoudre erreurs éventuelles

**Test** :
```bash
# Via Postman ou cURL
POST http://localhost:8000/api/dental-acts/import
Body: form-data, key="file", value=dental_acts.xlsx
```

---

## 🗄️ PHASE 2 : Migrations Base de Données

**Objectif** : Modifier la structure sans perdre de données

### ⚠️ ORDRE CRITIQUE (respecter absolument)

### Étape 2.1 : Migration 1 - Ajouter `name` à `patient_treatments`
- [ ] Créer migration `2026_03_05_001_add_name_to_patient_treatments_table.php`
- [ ] Ajouter colonne `name` (VARCHAR 255, nullable d'abord)
- [ ] Exécuter migration
- [ ] Vérifier structure DB

**Commande** :
```bash
php artisan make:migration add_name_to_patient_treatments_table --table=patient_treatments
php artisan migrate
```

**Migration** :
```php
$table->string('name', 255)->nullable()->after('patient_id');
```

### Étape 2.2 : Migration 2 - Peupler `name` existants
- [ ] Créer script pour remplir `name` des suivis existants
- [ ] Générer nom depuis `treatment.name` ou actes liés
- [ ] Exécuter script
- [ ] Vérifier tous les `name` remplis

**Script** :
```php
// Dans une commande ou seeder
PatientTreatment::whereNull('name')->chunk(100, function($pts) {
    foreach($pts as $pt) {
        $pt->name = $pt->treatment->name ?? 'Suivi général';
        $pt->save();
    }
});
```

### Étape 2.3 : Migration 3 - Modifier `invoice_items`
- [ ] Créer migration `2026_03_05_002_modify_invoice_items_table.php`
- [ ] Ajouter colonne `patient_treatment_act_id` (nullable)
- [ ] **Migrer données** : lier invoices existants aux actes
- [ ] Supprimer FK `treatment_id`
- [ ] Supprimer colonne `treatment_id`
- [ ] Rendre `patient_treatment_act_id` NOT NULL
- [ ] Exécuter migration

**ATTENTION** : Migration complexe, besoin de données migration !

### Étape 2.4 : Migration 4 - Nettoyer `patient_treatments`
- [ ] Créer migration `2026_03_05_003_remove_columns_from_patient_treatments.php`
- [ ] Supprimer FK `treatment_id`
- [ ] Supprimer colonne `treatment_id`
- [ ] Supprimer colonne `total_sessions`
- [ ] Supprimer colonne `completed_sessions`
- [ ] Exécuter migration

**Migration** :
```bash
php artisan make:migration remove_columns_from_patient_treatments --table=patient_treatments
```

### Étape 2.5 : Migration 5 - Supprimer table `treatments`
- [ ] Créer migration `2026_03_05_004_drop_treatments_table.php`
- [ ] Vérifier aucune FK restante
- [ ] Drop table
- [ ] Exécuter migration

**Migration** :
```php
Schema::dropIfExists('treatments');
```

### ✅ Vérification Phase 2
- [ ] Toutes les migrations exécutées sans erreur
- [ ] Données existantes intactes
- [ ] Table `treatments` n'existe plus
- [ ] `patient_treatments.name` rempli partout

---

## ⚙️ PHASE 3 : Refactoring Backend

**Objectif** : Adapter le code Laravel au nouveau modèle

### Étape 3.1 : Modèles
- [ ] **Supprimer** `app/Models/Treatment.php`
- [ ] **Modifier** `app/Models/PatientTreatment.php`
  - [ ] Retirer relation `treatment()`
  - [ ] Ajouter `'name'` au `$fillable`
  - [ ] Retirer `'total_sessions'`, `'completed_sessions'` du `$fillable`
  - [ ] Retirer casts associés
- [ ] **Modifier** `app/Models/InvoiceItem.php`
  - [ ] Supprimer relation `treatment()`
  - [ ] Ajouter relation `patientTreatmentAct()`
  - [ ] Modifier `$fillable`

### Étape 3.2 : Controllers
- [ ] **Supprimer** `app/Http/Controllers/TreatmentController.php` (si existe)
- [ ] **Modifier** `app/Http/Controllers/PatientTreatmentController.php`
  - [ ] Retirer validation `treatment_id`
  - [ ] Ajouter validation `name`
  - [ ] Adapter logique création
- [ ] **Modifier** `app/Http/Controllers/InvoiceController.php`
  - [ ] Adapter génération factures

### Étape 3.3 : Routes
- [ ] Supprimer routes `/api/treatments/*` (si existent)
- [ ] Vérifier routes `/api/patient-treatments/*`
- [ ] Ajouter route import actes (déjà fait Phase 1)

**Fichier** : `routes/api.php`

### Étape 3.4 : Validations & Requests
- [ ] Modifier `app/Http/Requests/StorePatientTreatmentRequest.php`
  - [ ] Retirer `treatment_id` required
  - [ ] Ajouter `name` required
- [ ] Modifier autres Request classes si nécessaire

### ✅ Vérification Phase 3
- [ ] Aucune référence à `Treatment` model
- [ ] Aucune référence à `treatment_id` dans les controllers
- [ ] API fonctionne sans erreurs 500

---

## 🎨 PHASE 4 : Refactoring Frontend

**Objectif** : Adapter React au nouveau modèle

### Étape 4.1 : Services API
- [ ] **Modifier** `src/services/api.js`
  - [ ] Retirer/adapter `treatmentAPI` si utilisé
  - [ ] Vérifier `patientTreatmentAPI`
  - [ ] S'assurer `dentalActAPI` existe

### Étape 4.2 : Page Démarrage Suivi
- [ ] **Modifier** `src/pages/PatientTreatments.jsx`
  - [ ] Retirer select "Traitement"
  - [ ] Ajouter input `name` du suivi
  - [ ] Garder/adapter sélection actes dentaires (déjà là)
  - [ ] Adapter payload API (sans `treatment_id`, avec `name`)
  - [ ] Tester affichage total actes

### Étape 4.3 : Affichages
- [ ] Modifier tous composants affichant `treatment.name`
  - [ ] `PatientTreatments.jsx`
  - [ ] `PatientDossier.jsx`
  - [ ] `PatientTreatmentsHistory.jsx`
  - [ ] Autres pages concernées
- [ ] Remplacer par `patient_treatment.name`

### Étape 4.4 : Page Admin (optionnel)
- [ ] Créer page admin import actes dentaires
- [ ] Upload fichier Excel
- [ ] Afficher liste actes importés
- [ ] **OU** simplement retirer `AdminTreatments.jsx`

### ✅ Vérification Phase 4
- [ ] Frontend compile sans erreurs
- [ ] Aucune référence à `treatment` dans le code
- [ ] Formulaire démarrage suivi fonctionne
- [ ] Affichages corrects

---

## 🧪 PHASE 5 : Tests & Validation

**Objectif** : S'assurer que tout fonctionne

### Étape 5.1 : Tests Backend
- [ ] **Test** : Import Excel actes dentaires
- [ ] **Test** : Créer patient_treatment sans treatment_id
- [ ] **Test** : Ajouter acte à un suivi
- [ ] **Test** : Générer facture depuis patient_treatment_act
- [ ] **Test** : Terminer un suivi
- [ ] **Test** : Lister suivis patients

### Étape 5.2 : Tests Frontend
- [ ] **Test** : Démarrer nouveau suivi
  - [ ] Sélectionner patient
  - [ ] Saisir nom
  - [ ] Sélectionner actes
  - [ ] Soumettre
- [ ] **Test** : Afficher suivi existant
- [ ] **Test** : Ajouter acte à suivi
- [ ] **Test** : Terminer suivi
- [ ] **Test** : Voir historique

### Étape 5.3 : Tests Données Existantes
- [ ] Vérifier patients existants intacts
- [ ] Vérifier suivis migrés affichent bien
- [ ] Vérifier factures existantes OK
- [ ] Vérifier aucun lien cassé

### ✅ Vérification Phase 5
- [ ] Tous les tests passent
- [ ] Aucune erreur console
- [ ] Données cohérentes
- [ ] UX fluide

---

## 🚀 PHASE 6 : Déploiement

**Objectif** : Mettre en production en sécurité

### Étape 6.1 : Préparation
- [ ] Merge branche dans `develop`
- [ ] Tester sur environnement staging
- [ ] Backup production
- [ ] Planifier fenêtre maintenance

### Étape 6.2 : Exécution
- [ ] Pull code en production
- [ ] Exécuter migrations
  ```bash
  php artisan migrate --force
  ```
- [ ] Vérifier logs erreurs
- [ ] Déployer frontend
- [ ] Clear cache Laravel
  ```bash
  php artisan cache:clear
  php artisan config:clear
  php artisan route:clear
  ```

### Étape 6.3 : Monitoring
- [ ] Surveiller logs 1h après
- [ ] Tester fonctionnalités critiques
- [ ] Surveiller 24h
- [ ] Communiquer succès migration

### ✅ Vérification Phase 6
- [ ] Production opérationnelle
- [ ] Aucun incident majeur
- [ ] Utilisateurs peuvent travailler
- [ ] Monitoring stable

---

## 📈 Suivi de Progression

| Phase | Statut | Début | Fin | Durée réelle | Notes |
|-------|--------|-------|-----|--------------|-------|
| Phase 0 | ⏳ En attente | | | | |
| Phase 1 | ⏳ En attente | | | | |
| Phase 2 | ⏳ En attente | | | | |
| Phase 3 | ⏳ En attente | | | | |
| Phase 4 | ⏳ En attente | | | | |
| Phase 5 | ⏳ En attente | | | | |
| Phase 6 | ⏳ En attente | | | | |

**Légende** :
- ⏳ En attente
- 🚧 En cours
- ✅ Terminé
- ❌ Bloqué

---

## 🐛 Journal des Problèmes

| Date | Phase | Problème | Solution | Statut |
|------|-------|----------|----------|--------|
| | | | | |

---

## 📝 Notes & Décisions

### Décisions prises
- Import via Excel (pas PDF)
- Recherche actes par CODE ou NOM
- Colonne `name` ajoutée à `patient_treatments`
- `invoice_items` pointe vers `patient_treatment_act_id`
- Suppression `total_sessions` et `completed_sessions`

### Points d'attention
- Migration `invoice_items` complexe → besoin script données
- Backup obligatoire avant Phase 2
- Tests approfondis avant production

---

## 🔗 Ressources

- [Documentation Migration](./MIGRATION_TREATMENTS_TO_DENTAL_ACTS.md)
- [Diagrammes](voir fichier MD principal)
- [Laravel Excel Docs](https://docs.laravel-excel.com/)
- [API Endpoints](../routes/api.php)

---

**Dernière mise à jour** : 5 mars 2026  
**Prochaine étape** : Phase 1 - Créer template Excel
