# Checkpoint — Intégration API

## Contexte
Objectif : connecter progressivement le frontend React au backend Laravel (Sanctum SPA).

---

## ✅ Ce qui est déjà intégré

### 1) Authentification (Sanctum SPA)
- Flow CSRF + login validé
- Cookies + session OK
- AuthContext opérationnel

### 2) Patients (frontend + backend)
- **Liste patients** branchée sur `/api/patients` avec mapping réel
- **États UI** ajoutés : chargement + erreur
- **Création** d’un patient branchée (`POST /api/patients`) + refresh
- **Édition** + **Suppression** branchées (`PUT /api/patients/{id}`, `DELETE /api/patients/{id}`)

### 3) Enrichissement backend des patients
- Ajout dans l’endpoint `index` et `show` :
  - `last_appointment_date`
  - `last_treatment`
  - `status` calculé (Nouveau / En traitement / Suivi)

---

## ✅ Rendez‑vous (Appointments)

### Étape 1 + 2 faites
- **Liste RDV** branchée sur `/api/appointments`
- Mapping réel (patient, praticien, date, motif, statut)
- États UI ajoutés (chargement + erreur)

### Étape suivante (en cours / à tester)
- **Création / modification / suppression** branchées sur l’API
- Modale rapide utilise un **sélecteur patient**
- Utilisateur courant utilisé comme `dentist_id`

---

## ❗ À corriger / valider
1. Tester création / édition / suppression des RDV depuis l’UI
2. Vérifier cohérence des statuts (API ↔ UI)
3. Ajouter gestion d’erreur visible dans la modale RDV (optionnel)

---

## Prochaines pages à connecter
- Certificats médicaux
- Statistiques (si besoin via endpoint dédié)
- Dossiers médicaux

---

Dernier état : **connexion API Patients + RDV en cours de validation.**
