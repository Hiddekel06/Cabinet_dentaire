# ORDONNANCES V1 - SPEC FONCTIONNELLE ET TECHNIQUE

Date: 2026-03-09
Statut: Valide pour implementation V1

## 1. Decisions validees

- Nom de la fonctionnalite: `Ordonnances` (pas `Prescriptions`)
- Creation possible meme sans consultation liee
- Workflow medicaments: saisie libre + suggestions
- Frequence en texte libre (ex: `3 par jour`, `2 par jour`)
- Suppression: soft delete si implementation simple, sinon hard delete en V1
- Gestion des roles: reportee a une phase ulterieure

## 2. Objectif V1

Permettre au cabinet de:
- creer une ordonnance pour un patient,
- ajouter plusieurs lignes de medicaments,
- retrouver rapidement les ordonnances existantes,
- preparer la generation PDF plus tard.

La signature electronique n'est pas incluse. Le praticien applique son cachet manuellement.

## 3. Workflow cible

## 3.1 Creation depuis dossier patient

1. Ouvrir un dossier patient
2. Cliquer `Nouvelle ordonnance`
3. Formulaire pre-rempli avec le patient
4. Ajouter 1..n lignes medicament
5. Enregistrer
6. Affichage dans l'historique des ordonnances du patient

## 3.2 Vue globale Ordonnances

1. Ouvrir le menu `Ordonnances`
2. Rechercher / filtrer (patient, date, texte)
3. Ouvrir le detail d'une ordonnance
4. Lancer plus tard l'action `Generer PDF`

Note: la vue globale est conservee car utile pour le suivi administratif et la recherche transversale.

## 4. Modele de donnees propose

## 4.1 Table `ordonnances`

Champs proposes:
- `id`
- `patient_id` (FK -> patients.id)
- `issued_by` (FK -> users.id)
- `issue_date` (date)
- `medical_record_id` (FK nullable -> medical_records.id)
- `patient_treatment_id` (FK nullable -> patient_treatments.id)
- `notes` (text nullable)
- `file_path` (string nullable, pour PDF futur)
- `created_at`, `updated_at`
- `deleted_at` (nullable, uniquement si soft delete active)

Indexes recommandes:
- index sur `patient_id`
- index sur `issue_date`
- index sur `issued_by`

## 4.2 Table `ordonnance_items`

Champs proposes:
- `id`
- `ordonnance_id` (FK -> ordonnances.id)
- `medication_id` (FK nullable -> medications.id)
- `medication_name` (string)
- `frequency` (string, ex: `3 par jour`)
- `duration` (string nullable, ex: `7 jours`)
- `instructions` (text nullable)
- `created_at`, `updated_at`

Regles:
- `medication_name` obligatoire (meme en mode libre)
- minimum 1 item par ordonnance

## 4.3 Table `medications` (suggestions)

Champs proposes:
- `id`
- `name` (unique)
- `category` (nullable)
- `default_frequency` (nullable)
- `default_duration` (nullable)
- `is_active` (boolean, default true)
- `created_at`, `updated_at`

But:
- proposer des suggestions rapides,
- autoriser la saisie libre si le medicament n'existe pas.

## 5. API V1 (backend Laravel)

Routes recommandees:
- `GET /api/ordonnances`
- `POST /api/ordonnances`
- `GET /api/ordonnances/{id}`
- `PUT /api/ordonnances/{id}` (optionnel en V1)
- `DELETE /api/ordonnances/{id}`
- `GET /api/medications/suggestions?query=`

Payload creation attendu:

```json
{
	"patient_id": 12,
	"issue_date": "2026-03-09",
	"medical_record_id": null,
	"patient_treatment_id": null,
	"notes": "Instructions generales",
	"items": [
		{
			"medication_id": 3,
			"medication_name": "Amoxicilline",
			"frequency": "3 par jour",
			"duration": "7 jours",
			"instructions": "Apres repas"
		},
		{
			"medication_id": null,
			"medication_name": "Paracetamol",
			"frequency": "2 par jour",
			"duration": "5 jours",
			"instructions": "Si douleur"
		}
	]
}
```

## 6. UI V1 (frontend React)

## 6.1 Nouvelle page `Ordonnances`

Contenu minimal:
- tableau des ordonnances
- filtres: patient, date, recherche texte
- bouton `Nouvelle ordonnance`
- action `Voir detail`
- action `Supprimer`

## 6.2 Formulaire `Nouvelle ordonnance`

Champs:
- patient (select)
- date ordonnance
- notes generales
- bloc dynamique des items (ajout/suppression de lignes)
- suggestions medicaments + saisie libre

Validation UX:
- au moins 1 ligne
- `medication_name` et `frequency` obligatoires

## 7. Soft delete - politique pragmatique

Option preferentielle: activer soft delete sur `ordonnances`.

Si cela ajoute trop de complexite immediate, fallback V1:
- hard delete sur `ordonnances`
- journaliser plus tard dans audit logs

Decision d'implementation:
- a prendre pendant dev selon temps/rework reel.

## 8. Hors scope V1

- generation PDF
- signature electronique
- permissions par role fines
- versioning avance des ordonnances
- controle d'interactions medicamenteuses avance

## 9. Plan d'implementation propose

1. Migrations + models (`ordonnances`, `ordonnance_items`, `medications`)
2. Controller + routes API CRUD de base
3. Endpoint suggestions medicaments
4. Vue globale `Ordonnances`
5. Creation depuis dossier patient + page globale
6. Tests API minimum (store/index/delete)

## 10. Criteres d'acceptation V1

- un utilisateur connecte peut creer une ordonnance avec plusieurs items
- les suggestions apparaissent sans bloquer la saisie libre
- l'ordonnance apparait dans la vue globale
- l'ordonnance apparait dans le dossier du patient
- la suppression fonctionne selon la strategie retenue (soft/hard)

