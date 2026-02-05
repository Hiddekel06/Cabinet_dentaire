# Documentation - Conception de la Base de Données
## Cabinet Dentaire - Plateforme de Gestion
---

## 1. Vue d'ensemble
Cette documentation décrit la structure de la base de données pour la plateforme de gestion du cabinet dentaire.
Elle couvre :
- Les tables principales
- Les relations (clés étrangères)
- Les contraintes
- Les indices

---

## 2. Diagramme ERD (Entity Relationship Diagram)
```
[À compléter avec le diagramme]

---

## 3. Tables Principales

### 3.1 users
**Rôle** : Gestion des utilisateurs (dentistes, réceptionnistes, administrateurs)

| Colonne | Type | Contrainte | Description |
|---------|------|-----------|-------------|
| id | UUID/INT | PRIMARY KEY | Identifiant unique |
| name | VARCHAR(255) | NOT NULL | Nom de l'utilisateur |
| email | VARCHAR(255) | UNIQUE, NOT NULL | Email unique |
| password | VARCHAR(255) | NOT NULL | Mot de passe hashé |
| phone | VARCHAR(20) | - | Numéro de téléphone |
| role | ENUM | NOT NULL | Rôle (admin, dentiste, réceptionniste) |
| created_at | TIMESTAMP | - | Date de création |
| updated_at | TIMESTAMP | - | Date de modification |

---

### 3.2 patients
**Rôle** : Gestion des patients du cabinet

| Colonne | Type | Contrainte | Description |
|---------|------|-----------|-------------|
| id | UUID/INT | PRIMARY KEY | Identifiant unique |
| first_name | VARCHAR(255) | NOT NULL | Prénom |
| last_name | VARCHAR(255) | NOT NULL | Nom |
| email | VARCHAR(255) | - | Email du patient |
| phone | VARCHAR(20) | NOT NULL | Téléphone |
| date_of_birth | DATE | - | Date de naissance |
| gender | ENUM | - | Sexe (M/F/Other) |
| address | TEXT | - | Adresse |
| city | VARCHAR(100) | - | Ville |
| notes | TEXT | - | Notes particulières |
| created_at | TIMESTAMP | - | Date de création |
| updated_at | TIMESTAMP | - | Date de modification |

---

### 3.3 appointments (Rendez-vous)
**Rôle** : Gestion des rendez-vous

| Colonne | Type | Contrainte | Description |
|---------|------|-----------|-------------|
| id | UUID/INT | PRIMARY KEY | Identifiant unique |
| patient_id | INT/UUID | FK → patients | Référence au patient |
| dentist_id | INT/UUID | FK → users | Référence au dentiste |
| appointment_date | DATETIME | NOT NULL | Date et heure du RDV |
| duration | INT | - | Durée en minutes |
| status | ENUM | - | État (pending, confirmed, completed, cancelled) |
| reason | TEXT | - | Raison du rendez-vous |
| notes | TEXT | - | Notes |
| created_at | TIMESTAMP | - | Date de création |
| updated_at | TIMESTAMP | - | Date de modification |

**Relations** :
- `patient_id` → `patients.id`
- `dentist_id` → `users.id`

---

### 3.4 treatments (Traitements)
**Rôle** : Catalogue des traitements dentaires

| Colonne | Type | Contrainte | Description |
|---------|------|-----------|-------------|
| id | UUID/INT | PRIMARY KEY | Identifiant unique |
| name | VARCHAR(255) | NOT NULL | Nom du traitement |
| description | TEXT | - | Description |
| price | DECIMAL(10,2) | NOT NULL | Prix |
| duration | INT | - | Durée estimée (min) |
| created_at | TIMESTAMP | - | Date de création |
| updated_at | TIMESTAMP | - | Date de modification |

---

### 3.5 invoices (Factures)
**Rôle** : Gestion des factures de facturation

| Colonne | Type | Contrainte | Description |
|---------|------|-----------|-------------|
| id | UUID/INT | PRIMARY KEY | Identifiant unique |
| patient_id | INT/UUID | FK → patients | Référence au patient |
| invoice_number | VARCHAR(50) | UNIQUE, NOT NULL | Numéro de facture |
| issue_date | DATE | NOT NULL | Date d'émission |
| due_date | DATE | NOT NULL | Date d'échéance |
| total_amount | DECIMAL(10,2) | NOT NULL | Montant total |
| paid_amount | DECIMAL(10,2) | DEFAULT 0 | Montant payé |
| status | ENUM | - | État (pending, partial, paid, cancelled) |
| notes | TEXT | - | Notes |
| created_at | TIMESTAMP | - | Date de création |
| updated_at | TIMESTAMP | - | Date de modification |

**Relations** :
- `patient_id` → `patients.id`

---

### 3.6 invoice_items (Lignes de facture)
**Rôle** : Détail des lignes de facture

| Colonne | Type | Contrainte | Description |
|---------|------|-----------|-------------|
| id | UUID/INT | PRIMARY KEY | Identifiant unique |
| invoice_id | INT/UUID | FK → invoices | Référence à la facture |
| treatment_id | INT/UUID | FK → treatments | Référence au traitement |
| quantity | INT | DEFAULT 1 | Quantité |
| unit_price | DECIMAL(10,2) | NOT NULL | Prix unitaire |
| subtotal | DECIMAL(10,2) | NOT NULL | Sous-total |
| created_at | TIMESTAMP | - | Date de création |
| updated_at | TIMESTAMP | - | Date de modification |

**Relations** :
- `invoice_id` → `invoices.id`
- `treatment_id` → `treatments.id`


### 3.7 medical_records (Dossiers médicaux)
**Rôle** : Historique médical des patients

| Colonne | Type | Contrainte | Description |
|---------|------|-----------|-------------|
| id | UUID/INT | PRIMARY KEY | Identifiant unique |
| patient_id | INT/UUID | FK → patients | Référence au patient |
| appointment_id | INT/UUID | FK → appointments | Référence au RDV |
| treatment_performed | TEXT | - | Traitement effectué |
| diagnosis | TEXT | - | Diagnostic |
| observations | TEXT | - | Observations |
| date | DATE | NOT NULL | Date du dossier |
| created_at | TIMESTAMP | - | Date de création |
| updated_at | TIMESTAMP | - | Date de modification |

**Relations** :


### 3.8 patient_treatments (Traitements patients)
**Rôle** : Suivi des traitements globaux d'un patient pouvant s'étaler sur plusieurs rendez-vous

| Colonne      | Type       | Contrainte         | Description                                              |
|--------------|------------|--------------------|----------------------------------------------------------|
| id           | UUID/INT   | PRIMARY KEY        | Identifiant unique                                       |
| patient_id   | INT/UUID   | FK → patients      | Référence au patient                                     |
| treatment_id | INT/UUID   | FK → treatments    | Référence au traitement global                           |
| start_date   | DATE       | NOT NULL           | Date de début du traitement                              |
| end_date     | DATE       | NULLABLE           | Date de fin prévue ou réelle                             |
| status       | ENUM       | NOT NULL           | Statut (planned, in_progress, completed, cancelled)      |
| notes        | TEXT       | -                  | Notes générales sur le traitement                        |
| created_at   | TIMESTAMP  | -                  | Date de création                                         |
| updated_at   | TIMESTAMP  | -                  | Date de modification                                     |

| total_sessions | INT      | NULLABLE           | Nombre total de séances prévues (NULL si inconnu)        |
| completed_sessions | INT  | DEFAULT 0          | Nombre de séances déjà réalisées                         |

**Relations** :

---

### 3.9 radiographies (Radios/Scanners)
**Rôle** : Stocker les fichiers de radios/scanners associés à un patient

| Colonne      | Type         | Contrainte         | Description                                 |
|--------------|--------------|--------------------|---------------------------------------------|
| id           | UUID/INT     | PRIMARY KEY        | Identifiant unique                          |
| patient_id   | INT/UUID     | FK → patients      | Référence au patient                        |
| file_path    | VARCHAR(255) | NOT NULL           | Chemin ou URL du fichier radio/scanner      |
| scan_date    | DATE         | NOT NULL           | Date de la radio/scanner                    |
| description  | TEXT         | -                  | Description ou annotation                   |
| created_at   | TIMESTAMP    | -                  | Date de création                            |
| updated_at   | TIMESTAMP    | -                  | Date de modification                        |

**Relations** :

---

### 3.10 user_sessions
**Rôle** : Tracer les connexions et activités de session des utilisateurs**

| Colonne      | Type         | Contrainte         | Description                                 |
|--------------|--------------|--------------------|---------------------------------------------|
| id           | UUID/INT     | PRIMARY KEY        | Identifiant unique de session               |
| user_id      | INT/UUID     | FK → users         | Référence à l'utilisateur                   |
| ip_address   | VARCHAR(45)  | -                  | Adresse IP de connexion                     |
| user_agent   | TEXT         | -                  | Navigateur/appareil utilisé                 |
| login_at     | TIMESTAMP    | NOT NULL           | Date/heure de connexion                     |
| logout_at    | TIMESTAMP    | NULLABLE           | Date/heure de déconnexion                   |
| is_active    | BOOLEAN      | DEFAULT TRUE       | Session active ou non                       |
| created_at   | TIMESTAMP    | -                  | Date de création                            |
| updated_at   | TIMESTAMP    | -                  | Date de modification                        |

**Relations** :

---

### 3.11 audit_logs
**Rôle** : Tracer les actions importantes et modifications dans le système (audit trail)**

| Colonne      | Type         | Contrainte         | Description                                 |
|--------------|--------------|--------------------|---------------------------------------------|
| id           | UUID/INT     | PRIMARY KEY        | Identifiant unique du log                   |
| user_id      | INT/UUID     | FK → users         | Utilisateur ayant effectué l'action          |
| action       | VARCHAR(100) | NOT NULL           | Type d'action (create, update, delete, login, etc.) |
| table_name   | VARCHAR(100) | -                  | Table concernée                             |
| record_id    | UUID/INT     | -                  | Identifiant de l'enregistrement concerné     |
| old_values   | JSON         | -                  | Valeurs avant modification (si applicable)   |
| new_values   | JSON         | -                  | Valeurs après modification (si applicable)   |
| description  | TEXT         | -                  | Détail ou commentaire                       |
| created_at   | TIMESTAMP    | -                  | Date de l'action                            |

**Relations** :

---

### 3.12 medical_certificates (Certificats médicaux)
**Rôle** : Gérer les certificats médicaux délivrés aux patients**

| Colonne         | Type         | Contrainte         | Description                                 |
|-----------------|--------------|--------------------|---------------------------------------------|
| id              | UUID/INT     | PRIMARY KEY        | Identifiant unique du certificat            |
| patient_id      | INT/UUID     | FK → patients      | Référence au patient                        |
| issued_by       | INT/UUID     | FK → users         | Utilisateur (médecin/dentiste) ayant délivré le certificat |
| issue_date      | DATE         | NOT NULL           | Date de délivrance                          |
| certificate_type| VARCHAR(100) | NOT NULL           | Type de certificat (arrêt, aptitude, etc.)  |
| content         | TEXT         | NOT NULL           | Contenu du certificat                       |
| file_path       | VARCHAR(255) | -                  | Chemin/URL du fichier PDF (optionnel)       |
| notes           | TEXT         | -                  | Notes complémentaires                       |
| created_at      | TIMESTAMP    | -                  | Date de création                            |
| updated_at      | TIMESTAMP    | -                  | Date de modification                        |

**Relations** :
- `patient_id` → `patients.id`
- `issued_by` → `users.id`
## 4. Diagramme des Relations

```
users
├── 1 ← N appointments (dentist_id)
└── 1 ← N medical_records (created_by)

patients
├── 1 ← N appointments (patient_id)
├── 1 ← N invoices (patient_id)
├── 1 ← N medical_records (patient_id)
└── 1 ← N payments (patient_id)

appointments
└── 1 → N medical_records (appointment_id)

treatments
└── 1 ← N invoice_items (treatment_id)

invoices
└── 1 ← N invoice_items (invoice_id)

medical_records
└── (dépend de patients et appointments)
```


Ajout :

patients
├── 1 ← N patient_treatments (patient_id)

treatments
├── 1 ← N patient_treatments (treatment_id)

patient_treatments
├── 1 ← N medical_records (patient_treatment_id)

patients
├── 1 ← N radiographies (patient_id)

radiographies
├── N → 1 patients (patient_id)


## 5. Clés Étrangères

| Table Source | Colonne | Table Cible | Colonne Cible | Action |
|--------------|---------|------------|----------------|--------|
| appointments | patient_id | patients | id | CASCADE DELETE |
| appointments | dentist_id | users | id | RESTRICT |
| invoices | patient_id | patients | id | CASCADE DELETE |
| invoice_items | invoice_id | invoices | id | CASCADE DELETE |
| invoice_items | treatment_id | treatments | id | RESTRICT |
| medical_records | patient_id | patients | id | CASCADE DELETE |
| medical_records | appointment_id | appointments | id | CASCADE DELETE |
| patient_treatments | patient_id | patients | id | CASCADE DELETE |
| patient_treatments | treatment_id | treatments | id | RESTRICT |

| radiographies | patient_id | patients | id | CASCADE DELETE |

---

## 6. Indices (Indexes)

```sql
-- Indexes pour améliorer les performances
CREATE INDEX idx_patients_email ON patients(email);
CREATE INDEX idx_appointments_patient_id ON appointments(patient_id);
CREATE INDEX idx_appointments_dentist_id ON appointments(dentist_id);
CREATE INDEX idx_appointments_date ON appointments(appointment_date);
CREATE INDEX idx_invoices_patient_id ON invoices(patient_id);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_medical_records_patient_id ON medical_records(patient_id);
```

---

## 7. Considérations de Sécurité

- [ ] Hasher les mots de passe (bcrypt/Argon2)
- [ ] Implémenter des soft deletes si nécessaire
- [ ] Audit trail pour les modifications sensibles
- [ ] Permissions basées sur les rôles (RBAC)
- [ ] Chiffrer les données sensibles (SSN, données médicales)

---

## 8. À Développer

- [ ] Table des paiements
- [ ] Table des prescriptions
- [ ] Table des photos (radiographies)
- [ ] Système d'audit logging
- [ ] Gestion des rappels (SMS/Email)
- [ ] Configuration de facturation

---

**Dernière mise à jour** : 01/02/2026
**Statut** : En cours de développement
