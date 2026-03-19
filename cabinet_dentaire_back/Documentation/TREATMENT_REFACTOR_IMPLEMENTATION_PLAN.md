# Plan d'Implementation - Refonte Traitements (V1)

## 1. Objectif
Refondre la gestion des traitements pour coller au processus metier dentaire:
- Un traitement = un parcours de soins multi-seances.
- Une seance est obligatoirement liee a un rendez-vous.
- La facturation est cumulative sur le traitement, visible en cours, finalisable en PDF.
- Les actions importantes laissent une trace exploitable (audit).

## 2. Regles Metier Validees
1. Un patient ne peut avoir qu'un seul traitement actif (planned ou in_progress).
2. Une seance est obligatoirement liee a un rendez-vous.
3. A la creation d'un traitement, l'acte "Consultation simple" est ajoute automatiquement.
4. La date de cette "Consultation simple" = date de debut du traitement.
5. "Consultation simple" est obligatoire et non supprimable.
6. La facture est cumulative et unique par traitement.
7. Une facture en cours doit etre visible pendant le traitement.
8. Si un acte est supprime, il disparait de la facture PDF finale.
9. La suppression doit laisser une trace sur la plateforme (audit).
10. Le tarif snapshot est pris du catalogue, mais modifiable manuellement.
11. Si la facture est marquee payee, aucune modification n'est autorisee sur les actes/facture.
12. La note d'audit est facultative.
13. Un traitement termine doit avoir au moins une seance.
14. Le PDF de facture en cours contient un watermark "Brouillon".

## 3. Cible Fonctionnelle (Vue d'Ensemble)
### 3.1 Entites principales
- patient_treatments: dossier global du parcours de soins.
- appointments: planification des rendez-vous.
- medical_records: trace clinique de seance.
- patient_treatment_acts: actes realises et facturables du traitement.
- invoices + invoice_items: facture cumulative par traitement.
- treatment_audit_logs (nouvelle): journal metier horodate.

### 3.2 Cycle de vie
1. Demarrage traitement
- Verifier absence de traitement actif.
- Creer traitement.
- Ajouter automatiquement "Consultation simple".
- Creer/associer rendez-vous initial.

2. Ajout seance
- Rendez-vous obligatoire.
- Creer medical_record.
- Ajouter/modifier actes eventuels.
- Mettre a jour projection de facture en cours.

3. Suppression acte
- Retirer l'acte de la projection facture PDF.
- Enregistrer trace audit.
- Interdire suppression de "Consultation simple".

4. Cloture traitement
- Verifier qu'au moins une seance existe.
- Finaliser facture.
- Autoriser PDF final (sans watermark).

5. Paiement facture
- Passer invoice.status a paid.
- Verrouiller toute modification des actes/facture.

## 4. Impacts Base de Donnees
## 4.1 Evolutions a ajouter
1. patient_treatment_acts
- appointment_id nullable au debut puis rendu obligatoire pour les nouveaux actes de seance.
- performed_at (datetime/date) pour la date reelle d'execution.
- is_mandatory boolean (pour "Consultation simple").
- is_deleted boolean (soft-delete logique metier) ou equivalent via historique.
- unit_price_override nullable (si prix manuel).

2. invoices
- Ajouter patient_treatment_id (FK) pour garantir 1 facture cumulative par traitement.
- Ajouter is_draft boolean (ou status draft/pending/paid).

3. treatment_audit_logs (nouvelle table)
- patient_treatment_id, user_id, action, note, before_json, after_json, created_at.

## 4.2 Contraintes et index
- Index metier pour interdire >1 traitement actif par patient (validation transactionnelle + garde applicative).
- Contrainte pour empecher suppression de l'acte obligatoire.
- Controle strict sur statut facture payee.

## 5. API - Contrat cible
### 5.1 Traitements
- POST /api/patient-treatments
  - Ajoute automatiquement "Consultation simple".
- POST /api/patient-treatments/{id}/sessions
  - appointment_id requis.
- POST /api/patient-treatments/{id}/finish
  - Verifie >= 1 seance.

### 5.2 Actes
- POST /api/patient-treatments/{id}/acts
  - Ajout acte (snapshot auto + override optionnel).
- PATCH /api/patient-treatment-acts/{id}
  - Modification quantite/prix (si non paye).
- DELETE /api/patient-treatment-acts/{id}
  - Suppression logique + audit + recalcul facture.

### 5.3 Facturation
- GET /api/patient-treatments/{id}/invoice-draft
  - Facture en cours.
- POST /api/patient-treatments/{id}/invoice/finalize
  - Finalisation a la cloture.
- POST /api/invoices/{id}/mark-paid
  - Verrou complet.
- POST /api/invoices/{id}/generate
  - PDF brouillon (watermark) ou final selon statut.

### 5.4 Audit
- GET /api/patient-treatments/{id}/audit-logs
- POST implicite via actions metier (note facultative).

## 6. Frontend - Flux cibles
### 6.1 Ecran Suivi patient
- Demarrer traitement:
  - Plus besoin de forcer l'ajout manuel de "Consultation simple".
  - Affichage automatique dans la liste d'actes.
- Ajouter seance:
  - Obligation de selectionner un rendez-vous existant.
  - Zone note clinique / audit (facultative).
- Actes:
  - Afficher etiquette "Obligatoire" sur Consultation simple.
  - Bloquer bouton suppression pour acte obligatoire.

### 6.2 Ecran Factures
- Ajouter vue "Facture en cours" par traitement.
- Badge visuel Brouillon.
- PDF brouillon avec watermark.
- Si facture payee: ecran en lecture seule.

### 6.3 Historique/Audit
- Timeline des actions du traitement:
  - creation traitement
  - ajout seance
  - ajout/suppression/modification acte
  - cloture
  - paiement

## 7. Ordre d'Implementation (Sprint technique)
## Sprint 1 - Invariants metier backend
1. Bloquer multi-traitement actif par patient.
2. Auto-ajout Consultation simple obligatoire.
3. Interdire suppression Consultation simple.
4. Bloquer mutations si facture payee.

## Sprint 2 - Schema + services
1. Migrations (acts/invoices/audit logs).
2. Service metier transactionnel (TreatmentLifecycleService, BillingService, AuditService).
3. Recalcul facture en cours a chaque mutation acte.

## Sprint 3 - API exposee
1. Endpoints sessions/acts/facture draft/finalize.
2. Validation stricte appointment_id obligatoire pour seance.
3. PDF brouillon avec watermark.

## Sprint 4 - Frontend
1. Refonte page PatientTreatments.
2. Vue facture en cours.
3. Verrou UI si paid.
4. Timeline audit.

## Sprint 5 - Qualite
1. Tests feature backend.
2. Tests scenario metier bout-en-bout.
3. Recette utilisateur sur cas "carie multi-rendez-vous".

## 8. Cas de recette critiques
1. Creation traitement -> Consultation simple auto-presente et non supprimable.
2. Ajout seance sans rendez-vous -> refuse.
3. Ajout acte -> total facture en cours augmente.
4. Suppression acte -> total facture baisse + trace audit visible.
5. Marquer payee -> toute edition bloquee.
6. Terminer traitement sans seance -> refuse.
7. PDF brouillon affiche watermark tant que non finalise.

## 9. Risques et mitigations
1. Donnees historiques incoherentes
- Mitigation: script de backfill + journaux de migration.

2. Regression sur facturation existante
- Mitigation: tests de non-regression sur InvoiceController.

3. Conflits de concurrence (deux users)
- Mitigation: transactions + lock sur lignes critiques.

## 10. Definition of Done
- Regles metier V1 appliquees backend et front.
- Facture cumulative operationnelle (brouillon + final PDF).
- Consultation simple auto/obligatoire operationnelle.
- Audit visible en interface.
- Verrou paye robuste.
- Tests critiques verts.
