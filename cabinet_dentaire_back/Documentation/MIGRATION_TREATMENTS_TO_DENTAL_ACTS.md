# Migration : Remplacement de TREATMENTS par DENTAL_ACTS

**Date** : Mars 2026  
**Objectif** : Simplifier et flexibiliser la gestion des traitements en passant par les actes dentaires directs

---

## 📋 Résumé de la Migration

### **Avant (Modèle actuel)**
```
Patient → Traitement (du catalogue) → Actes dentaires
```
- Table `treatments` : catalogue de traitements prédéfinis
- `patient_treatments.treatment_id` → référence le traitement template
- Les actes sont liés via `patient_treatment_act`

### **Après (Nouveau modèle)**
```
Patient → Actes dentaires (directement, flexibles)
```
- Table `treatments` : **SUPPRIMÉE**
- `patient_treatments` : perd la colonne `treatment_id`
- Les actes sont toujours liés via `patient_treatment_act` (point central)

---

## 🔄 Changements Détaillés par Table

### **1. Table `patient_treatments` (MODIFIÉE)**

#### ❌ À SUPPRIMER
- `treatment_id` (colonne) → Plus de lien vers le catalogue de traitements
- `total_sessions` (colonne) → Pas de plan figé, plus de sens
- `completed_sessions` (colonne) → Compté dynamiquement via `appointments`

#### ✅ À CONSERVER
- `id`
- `patient_id`
- `start_date`
- `end_date` (nullable)
- `status` (enum: `planned`, `in_progress`, `completed`, `cancelled`)
- `notes`
- `next_appointment_id` (nullable)
- `created_at`, `updated_at`

#### ➕ À AJOUTER  
- `name` (varchar) → Libellé du suivi (Ex: "Détartrage complet", "Détartrage + Détection cavité")
- Optionnel : `created_by` pour traçabilité (utilisateur qui a créé le suivi)

---

### **2. Table `patient_treatment_act` (CENTRALE, inchangée)**
```
patient_treatment_act
├── id
├── patient_treatment_id (FK → patient_treatments)
├── dental_act_id (FK → dental_acts) ← MAINTENANT: point central
├── quantity
├── tarif_snapshot (prix au moment de l'acte)
├── created_at
└── updated_at
```
**Rôle** : Lie les actes au suivi. **C'est l'essence du suivi maintenant.**

---

### **3. Table `dental_acts` (NOUVEAU RÔLE)**
```
dental_acts
├── id
├── name (Ex: "Détartrage")
├── code (Ex: "D5") ← IDENTIFIANT PRINCIPAL
├── category (Ex: "Nettoyage")
├── tarif (prix en FCFA)
├── description
├── created_at
└── updated_at
```
**Rôle** : Catalogue des actes. Remplace la logique de `treatments`.

---

### **4. Table `treatments` (SUPPRIMÉE) ❌**
- Raison : Remplacée par `dental_acts`
- Dépendances à gérer :
  - `invoice_items` pointe dessus → À REDIRECTIONNER
  - Modèles Laravel → À NETTOYER

---

### **5. Table `invoice_items` (REDIRECTIONNÉE)**

#### ❌ AVANT
```
invoice_items
├── id
├── invoice_id (FK)
├── treatment_id (FK → treatments) ← PROBLÈME
├── quantity
├── unit_price
├── subtotal
```

#### ✅ APRÈS
```
invoice_items
├── id
├── invoice_id (FK)
├── patient_treatment_act_id (FK → patient_treatment_act) ← CHANGEMENT
├── quantity
├── unit_price
├── subtotal
```

**Impact** : Les factures tracent directement les actes réalisés, pas les traitements. Plus de précision. ✅

---

## 🎯 Flux Métier Après Migration

### **Démarrer un suivi**
1. Dentiste sélectionne **Patient**
2. Dentiste sélectionne **Actes dentaires** (1 ou plusieurs)
   - Recherche par code ou nom (Ex: `D5`, `Détartrage`)
   - Affichage : `CODE | NOM | TARIF`
3. Dentiste saisit :
   - `name` du suivi (Ex: "Détartrage complet du 05/03/2026")
   - `start_date`
   - `notes` optionnels
4. **Créer une ligne `patient_treatment`** + autant de **`patient_treatment_act`** que d'actes

### **Ajouter un acte pendant le suivi**
1. Simple insert dans `patient_treatment_act`
2. Pas de modification du suivi lui-même

### **Supprimer un acte**
1. Si **pas facturisé** : suppression directe
2. Si **facturisé** : marquer comme `cancelled` (soft delete ou flag)
3. Impact facture : à gérer en backend

### **Terminer un suivi**
1. UPDATE `patient_treatments.status = 'completed'`
2. Autres traitements possibles : cloîturer les rendez-vous liés, générer rapports, etc.

### **Compter les sessions réalisées**
```sql
SELECT COUNT(DISTINCT a.id) 
FROM appointments a 
WHERE a.patient_treatment_id = X 
AND a.status = 'completed';
```

---

## 🔗 Relations Finales

```
Patients (1) ←→ (N) patient_treatments
patient_treatments (1) ←→ (N) patient_treatment_act
patient_treatment_act (N) ←→ (1) dental_acts
patient_treatment_act (N) ←→ (1) invoice_items
patient_treatments (1) ←→ (N) appointments
```

---

## 📝 Migrations Techniques à Créer

### **Migration 1 : Ajouter colonne `name` à `patient_treatments`**
```
ALTER TABLE patient_treatments ADD COLUMN name VARCHAR(255);
```

### **Migration 2 : Supprimer colonnes `total_sessions`, `completed_sessions`**
```
ALTER TABLE patient_treatments 
DROP COLUMN total_sessions, 
DROP COLUMN completed_sessions;
```

### **Migration 3 : Supprimer `treatment_id` de `patient_treatments`**
```
ALTER TABLE patient_treatments 
DROP FOREIGN KEY patient_treatments_treatment_id_foreign,
DROP COLUMN treatment_id;
```

### **Migration 4 : Redirectionner `invoice_items.treatment_id` → `patient_treatment_act_id`**
```
ALTER TABLE invoice_items 
DROP FOREIGN KEY invoice_items_treatment_id_foreign,
DROP COLUMN treatment_id,
ADD COLUMN patient_treatment_act_id BIGINT UNSIGNED,
ADD FOREIGN KEY (patient_treatment_act_id) 
  REFERENCES patient_treatment_act(id) ON DELETE CASCADE;
```

### **Migration 5 : Supprimer la table `treatments`**
```
DROP TABLE treatments;
```

---

## 🔨 Impactés Backend

- **Modèles** : `Treatment` suppression, `PatientTreatment` refactoring, `PatientTreatmentAct` nouveau rôle central
- **Controllers** : `TreatmentController` suppression, `PatientTreatmentController` refactoring
- **Routes** : Retirer les routes `/api/treatments`
- **Validations** : Plus besoin de valider `treatment_id`
- **Requêtes** : Refactoriser les queries qui joignaient `treatments`

## 🎨 Impactés Frontend (React)

- **PatientTreatments.jsx** : 
  - Ôter la sélection de "Traitement"
  - Garder la sélection d'actes dentaires (déjà présente)
  - Ajouter champ `name` du suivi
- **Affichage suivi** : Construire le libellé depuis les actes liés
- **Factures** : Point d'accroche change vers `patient_treatment_act`

---

## ✅ Checklist d'Implémentation

- [ ] Créer les migrations Laravel
- [ ] Tester les migrations sur DB de test
- [ ] Supprimer/refactoriser modèles backend
- [ ] Mettre à jour controllers et routes
- [ ] Adapter les validations
- [ ] Tester les endpoints API
- [ ] Refactoriser composantes frontend
- [ ] Tester le flux UX complet
- [ ] Vérifier impact factures
- [ ] Documentation API mise à jour

---

## 📌 Notes Importantes

1. **Pas de rupture de données** : Les suivi existants peuvent être migrés en populant `name` depuis les actes liés
2. **Flexibilité** : Chaque suivi peut avoir une combinaison unique d'actes
3. **Traçabilité** : `tarif_snapshot` dans `patient_treatment_act` = prix EXACT au moment de la création
4. **Facturation** : Plus simple et plus précis (direct sur acte, pas suivi)
