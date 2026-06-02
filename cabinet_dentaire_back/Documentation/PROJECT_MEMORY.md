# Projet Cabinet Dentaire — Fichier Mémoire

But: fichier mémo centralisé pour documenter l'architecture, les décisions récentes, les points critiques et les actions à faire. À mettre à jour régulièrement.

**Résumé**
- Nom: Cabinet Dentaire (backend Laravel, frontend React + Vite)
- Objectif: gérer patients, rendez-vous, dossiers médicaux, traitements et facturation (reçus & factures).
- Contrainte opérationnelle: préserver l'immuabilité des données historiques en production; préférer corrections non-destructives.

**Architecture**
- Backend: Laravel (PHP 8.4), Eloquent, controllers dans `app/Http/Controllers`.
  - Reçus de séance: `SessionReceipt`, `SessionReceiptController`, `SessionReceiptEvent`.
  - Dossier médical: `MedicalRecord`, `MedicalRecordController`.
  - Rdv: `Appointment`, `AppointmentController`.
  - Caches: clés `dashboard:overview:day|week|month|year`.
- Frontend: React + Vite, dossier principal `cabinet_dentaire_front/src`.
  - API wrapper: `src/services/api.js` (cache simple + inFlightRequests).
  - Pages clés: `PatientTreatments.jsx`, `SessionReceipts.jsx`, `StartSessionWorkspace.jsx`, `Appointments.jsx`.

**Flux critique (paiements / reçus)**
- Règle actuelle (appliquée): lorsqu'un médecin enregistre un `MedicalRecord` avec `amount_collected`, le backend crée automatiquement un `SessionReceipt` paid (non destructif) si aucun reçu n'existe pour ce `medical_record_id`.
- Problème rencontré et corrigé: doublons quand le frontend appelait aussi `sessionReceiptAPI.create()` après création du `MedicalRecord`.
  - Solution appliquée: idempotence côté backend (retourne le reçu existant si `medical_record_id` présent) + suppression des appels redondants côté frontend (StartSession/StartTreatment/PatientTreatments).
- Comportements préservés: suppression d'un reçu ajuste le MR en place (logique existante), KPI invalidation effectuée après création/paiement.

**Incident récent à retenir**
- Incident: la page `/treatments/:id/session` affichait parfois des montants calculés depuis `MedicalRecord.amount_collected` au lieu des reçus, alors que la page `/session-receipts` montrait les bons chiffres.
- Cause racine: deux sources de vérité concurrentes pour un même flux métier.
  - `SessionReceipt` était la source correcte pour l'affichage financier.
  - `MedicalRecord.amount_collected` a été utilisé par erreur comme agrégat d'affichage dans le workspace de séance.
- Faille de conception: le montant encaissé était dupliqué dans deux entités sans contrat clair de priorité, ce qui a permis une divergence silencieuse entre affichages.
- Règle à appliquer à l'avenir: pour tout affichage comptable, `SessionReceipt.total_amount` doit être considéré comme source d'autorité; `MedicalRecord.amount_collected` ne doit servir qu'à la création initiale ou comme secours technique.
- Second incident observé: un reçu récemment créé pouvait sembler "disparaître" côté front alors qu'il existait bien en base, à cause du cache `session-receipts` non invalidé lors d'une création de `MedicalRecord` qui génère automatiquement un reçu.
- Correction adoptée: invalider les caches `session-receipts`, `patient-treatments`, `dashboard:overview` et `statistics:overview` dès qu'un `MedicalRecord` est créé.

**Développements récents (résumé)**
- Patch: `MedicalRecordController::store()` — création best-effort d'un `SessionReceipt` si `amount_collected` fourni et aucun reçu lié.
- Patch: `SessionReceiptController::store()` — maintenant idempotent et renvoie 200 + reçu existant si déjà présent pour le MR.
- Patch: Frontend — suppression des créations redondantes `sessionReceiptAPI.create()` dans les flows de séance/diagnostic; lecture du reçu existant à la place.
- Patch: `AppointmentController::index()` — tri par défaut: aujourd'hui en premier, puis futurs; pages par défaut n'incluent plus les rendez-vous en retard (filtre dédié `status_group=overdue`).
- Patch UX (page traitements): les boutons `Ajouter séance` et `Terminer` reproduisent le flow de validation rendez-vous, et récupèrent le motif du RDV lié pour préremplir `defaultTreatmentPerformed`.
  - Fallback ajouté: si `nextAppointment` n'est pas embarqué dans la réponse `patient-treatments`, le front interroge `GET /api/appointments/{id}` pour récupérer `reason`/`motif`.
- Patch (Certificats Médicaux):
  - Frontend: recherche de patients désormais dynamique via `patientAPI.search()` (correction de la limite des 20 premiers).
  - Frontend: ajout d'un reset explicite du formulaire à l'ouverture de la modale pour éviter les données résiduelles.
  - Frontend: ajout de spinners de chargement sur les boutons d'ajout et de téléchargement PDF.
  - Backend: implémentation des méthodes `update()` et `destroy()` dans `MedicalCertificateController`.
  - Backend: renforcement de la validation des `rest_days` (integer casting) pour corriger le bug de remise à 1.

**Fichiers importants**
- Backend:
  - `app/Http/Controllers/MedicalRecordController.php`
  - `app/Http/Controllers/SessionReceiptController.php`
  - `app/Http/Controllers/AppointmentController.php`
  - `app/Models/SessionReceipt.php`, `SessionReceiptEvent.php`, `MedicalRecord.php`, `Appointment.php`
  - Migrations: `database/migrations/*` (notamment `create_session_receipts_table.php`, `create_medical_records_table.php`)
- Frontend:
  - `cabinet_dentaire_front/src/services/api.js`
  - `cabinet_dentaire_front/src/pages/StartSessionWorkspace.jsx`
  - `cabinet_dentaire_front/src/pages/StartTreatmentWorkspace.jsx`
  - `cabinet_dentaire_front/src/pages/PatientTreatments.jsx`
  - `cabinet_dentaire_front/src/pages/Appointments.jsx`

**Tests manuels effectués**
- Création MR avec `amount_collected` -> reçu automatique créé et marqué `paid`.
- Exécution double `POST /api/session-receipts` pour le même `medical_record_id` -> backend retourne le même reçu (aucun doublon en base).
- Flux RDV -> MR -> reçu: création d'un RDV, validation de MR lié, reçu créé; l'`Appointment.status` est mis à `completed` lors de la validation.
- Filtre `overdue` vérifié côté serveur (retourne rendez-vous passés).

**Comment lancer / tests locaux rapides**
- Démarrer serveur Laravel (dev):

```bash
cd "c:\Mes projets\Projets_Profesionel\cabinet_dentaire_back"
php artisan serve --port=8001
```

- Créer un token (en dev) pour un user: en tinker

```bash
php artisan tinker
>>> \App\Models\User::find(2)->createToken('test')->plainTextToken
```

- Exemple d'appel rapide (curl):

```bash
curl -X POST "http://127.0.0.1:8001/api/medical-records" \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"patient_id":1,"treatment_performed":"Test","amount_collected":100}'
```

**Prochaines tâches suggérées**
- Ajouter tests unitaires/integration pour l'idempotence des reçus et le flux MR -> receipt.
- Documenter la politique de conservation des reçus (unique per MR) et décider si on permet plusieurs reçus par MR (impliquerait migration DB).
- Ajouter indicateur UI/feedback quand un reçu existe déjà (au lieu de créer un second).
- Ajouter filtre `Overdue` visible clairement et option de tri dans l'UI (si souhaité).

**Contacts / Références**
- Dépôt local: workspace racine (Backend / Frontend folders)
- Personne à contacter en cas de doute: toi (mainteneur), ou `Mbaye Ndiaye` (user id 2) pour tests

---

Date de création: 2026-05-31 — Mettre à jour ce fichier avec chaque décision majeure ou patch.
