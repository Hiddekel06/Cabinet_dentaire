# Conception Module Facturation

## 1. Objectif
Mettre en place un module de facturation fiable, base sur les actes reels realises, avec:
- creation de facture depuis les actes patient
- suivi des montants dus, payes, restants
- historique coherent (pas d'impact si les tarifs changent plus tard)
- generation PDF depuis le backend (source de verite)

## 2. Principes metier
- Une facture est rattachee a un patient.
- Une facture contient des lignes, chaque ligne pointe vers un acte realise (`patient_treatment_act_id`).
- Un acte ne doit pas etre facture deux fois (sauf cas explicite de correction).
- Le backend est source de verite (totaux, statuts, transitions).
- Le frontend ne calcule pas la logique metier critique (il affiche).

## 3. Etat actuel du schema
Le projet contient deja:
- `invoices`
- `invoice_items`

Et `invoice_items` a deja ete redirige vers `patient_treatment_act_id` via migration:
- `2026_03_06_143311_modify_invoice_items_for_dental_acts.php`

## 4. Schema cible recommande

### 4.1 invoices
Champs existants conserves:
- `id`
- `patient_id`
- `invoice_number` (unique)
- `issue_date`
- `due_date`
- `total_amount`
- `paid_amount`
- `status`
- `notes`

Ajouts recommandes:
- `created_by` (FK users)
- `discount_amount` (decimal, default 0)
- `currency` (ex: XOF)
- `cancelled_at` (nullable)

### 4.2 invoice_items
Champs existants:
- `id`
- `invoice_id`
- `patient_treatment_act_id`
- `quantity`
- `unit_price`
- `subtotal`

Ajouts recommandes pour figer l'historique:
- `code_snapshot`
- `label_snapshot`
- `unit_price_snapshot`

But: eviter qu'un changement de catalogue modifie visuellement des anciennes factures.

### 4.3 payments (phase 2)
Nouvelle table recommandee:
- `id`
- `invoice_id`
- `patient_id`
- `amount`
- `payment_date`
- `method`
- `reference`
- `notes`
- `received_by`

## 5. Machine d'etat facture
Statuts recommandes:
- `draft`: brouillon editable
- `issued`: emise
- `partial`: partiellement payee
- `paid`: soldee
- `cancelled`: annulee

Transitions:
- `draft -> issued`
- `issued -> partial`
- `issued -> paid`
- `partial -> paid`
- `draft|issued -> cancelled`

Regle: une facture `cancelled` n'accepte plus de paiement.

## 6. Regles de calcul backend
- `subtotal ligne = quantity * unit_price`
- `total_amount = somme subtotaux - discount_amount`
- `remaining_amount = total_amount - paid_amount`
- `status` derive de `paid_amount`:
  - `paid_amount == 0` et facture emise: `issued`
  - `0 < paid_amount < total_amount`: `partial`
  - `paid_amount >= total_amount`: `paid`

## 7. API cible (backend)

### 7.1 Factures
- `GET /api/invoices`
- `GET /api/invoices/{invoice}`
- `POST /api/invoices` (create draft or issued)
- `PATCH /api/invoices/{invoice}` (edits autorises si draft)
- `POST /api/invoices/{invoice}/issue`
- `POST /api/invoices/{invoice}/cancel`
- `POST /api/invoices/{invoice}/generate` (PDF)

### 7.2 Paiements (phase 2)
- `POST /api/invoices/{invoice}/payments`
- `GET /api/invoices/{invoice}/payments`
- `DELETE /api/payments/{payment}` (optionnel, admin)

### 7.3 Source des lignes facturables
- `GET /api/patients/{patient}/billable-acts`

Retour attendu:
- actes realises non encore factures
- quantite, tarif, date, suivi lie

## 8. UX cible (frontend)

### 8.1 Ecran liste factures
- recherche (patient, numero)
- filtres (statut, periode)
- actions (voir, modifier draft, emettre, annuler, PDF)

### 8.2 Ecran creation facture
- selection patient
- affichage actes facturables
- selection des lignes
- calcul total en direct (visuel)
- bouton `Enregistrer brouillon`
- bouton `Emettre`

### 8.3 Ecran detail facture
- entete patient + infos facture
- lignes facture
- resume financier (total, paye, reste)
- historique paiements (phase 2)
- bouton PDF

## 9. Contraintes importantes
- Un meme `patient_treatment_act_id` ne doit pas etre reutilisable dans une autre facture active.
- Le numero facture est genere backend, jamais frontend.
- Les montants sont valides backend meme si frontend envoie des valeurs.
- Les operations critiques sont transactionnelles (DB transaction).

## 10. Plan de realisation propose

### Phase 1 (MVP utile)
1. Finaliser models `Invoice`, `InvoiceItem` + relations
2. Ajouter `InvoiceController` (CRUD + issue/cancel)
3. Endpoint `billable-acts` par patient
4. Creation facture depuis actes realises
5. Generation PDF facture
6. Page frontend `Factures.jsx` (liste + creation + detail simple)

### Phase 2 (encaissement)
1. Table `payments`
2. Endpoint ajout paiement
3. Mise a jour auto statut (`partial`, `paid`)
4. Historique paiements dans detail facture

### Phase 3 (solidite)
1. Snapshots ligne facture
2. Logs audit sur annulation/modification
3. Tests automatises (API + calcul montants + transitions)

## 11. Decisions a valider avant implementation
1. Devise par defaut (`XOF` ? `EUR` ?)
2. Format numero facture (`FAC-YYYY-0001` recommande)
3. Autoriser edition facture apres `issued` ou non
4. Politique annulation (avoir plus tard ou simple annulation)
5. Niveau de remise (globale uniquement ou par ligne)

## 12. Recommandation finale
Commencer par un flux court et robuste:
- facturer uniquement des actes reels non factures
- backend calcule tout
- PDF genere depuis donnees stockees

Ce choix permet d'avoir vite un module exploitable en production, puis d'ajouter les paiements et optimisations sans refaire la base.
