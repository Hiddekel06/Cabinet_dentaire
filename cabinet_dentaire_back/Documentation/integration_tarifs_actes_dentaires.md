# Intégration des tarifs des actes dentaires dans l'application

## 1. Structure de la table des actes dentaires

```sql
Table: dental_acts
-------------------
- id (int, PK, auto-increment)
- name (string)                -- Nom de l'acte (ex: Cavité simple (1 face))
- category (string)            -- Catégorie (Consultation, Soins conservateurs, etc.)
- code (string)                -- Cotation (ex: D5, D10, D15...)
- tarif (integer)              -- Tarif en FCFA (ex: 6000, 12000...)
- description (text, nullable) -- Détail optionnel
- created_at / updated_at
```

## 2. Relation entre traitements et actes

### a) Table pivot (plusieurs actes par traitement)
```sql
Table: patient_treatment_act
---------------------------
- id (int, PK, auto-increment)
- patient_treatment_id (int, FK)
- dental_act_id (int, FK)
- quantity (int, default 1)
- tarif_snapshot (integer)   -- Tarif au moment de l'acte (pour l'historique)
- created_at / updated_at
```

### b) Table des traitements patients (existant)
```sql
Table: patient_treatments
-------------------------
- id (int, PK)
- patient_id (int, FK)
- ...
```

## 3. Flux d'utilisation

1. Lors de la création d'un traitement, l'utilisateur sélectionne un ou plusieurs actes dans la nomenclature.
2. Les actes sont liés au traitement via la table pivot.
3. Le tarif total du traitement est la somme des tarifs des actes sélectionnés.
4. Les devis/factures sont générés automatiquement à partir de ces données.

## 4. Exemple d'affichage dans l'app

- Traitement de M. X
  - Cavité simple (1 face) — 6 000 FCFA
  - Pulpotomie — 12 000 FCFA
  - **Total : 18 000 FCFA**

## 5. Avantages
- Calcul automatique et fiable
- Historique des tarifs (si changement)
- Factures et devis professionnels
- Statistiques par acte

---

**À faire ensuite :**
- Migration Laravel pour créer ces tables
- Seeder pour remplir la nomenclature
- Adapter le frontend pour sélectionner les actes lors de la création d’un traitement
