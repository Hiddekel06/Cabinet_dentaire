# ✅ CHECKLIST TESTS - Montant encaissé & Navigation patients

## 🔍 TEST 1: Navigation depuis liste patients
**But**: Vérifier que cliquer sur un patient:
- ✅ Redirige vers SESSION si traitement `in_progress`
- ✅ Redirige vers NOUVEAU TRAITEMENT sinon

**Étapes**:
1. Aller sur `/patients`
2. Créer un patient sans traitement
3. Cliquer dessus → doit aller à `/treatments/new`
4. Créer un traitement (statut: `in_progress`)
5. Retourner `/patients` et cliquer → doit aller à `/treatments/{id}/session`

---

## 💰 TEST 2: Montant encaissé - Persistance en BDD
**But**: Vérifier que le montant est bien sauvegardé

**Étapes**:
1. Dans espace séance: Enregistrer une séance avec montant = 50000 XOF
2. Vérifier en BDD: `medical_records.amount_collected = 50000`
3. Aller à la séance suivante du même traitement
4. Vérifier que le montant s'affiche dans le tableau "Montant encaissé"

---

## 📄 TEST 3: Affichage montant sur le reçu
**But**: Vérifier que le reçu PDF affiche le montant encaissé

**Étapes**:
1. Enregistrer une séance avec montant = 75000 XOF
2. Générer le reçu PDF
3. Vérifier dans le PDF:
   - ✅ Ligne "Montant encaissé: 75000 FCFA"
   - ✅ Fond vert (mise en évidence)
   - ✅ Date séance correcte
   - ✅ Nom patient correct

---

## 📊 TEST 4: Historique des montants encaissés
**But**: Vérifier que l'historique s'affiche correctement

**Étapes**:
1. Créer 3 séances: 50000 XOF, 75000 XOF, 25000 XOF
2. Aller à la 4ème séance
3. Vérifier le tableau:
   - ✅ 3 lignes de séances passées
   - ✅ Dates correctes
   - ✅ Montants corrects
   - ✅ **Total: 150000 XOF**

---

## ❌ TEST 5: Edge cases
**But**: Vérifier la robustesse

**Étapes**:
1. Créer une séance **SANS montant encaissé** (laisser vide)
   - Vérifier que la séance est bien créée
   - Vérifier que dans l'historique elle affiche "–"
   
2. Créer une séance avec montant décimal: 50000.50 XOF
   - Vérifier que c'est bien arrondi à 2 décimales
   
3. Créer un montant très grand: 999999999 XOF
   - Vérifier que ça ne casse pas l'affichage

---

## 🧪 Requêtes SQL pour vérification rapide

```sql
-- Vérifier que amount_collected existe et est bien rempli
SELECT id, date, treatment_performed, amount_collected 
FROM medical_records 
WHERE patient_id = 1 
ORDER BY created_at DESC;

-- Vérifier la structure
DESCRIBE medical_records;
```

---

## 📝 Notes
- Devise: **XOF** (pas €)
- Les montants affichent en format: `50 000,00 XOF`
- Montant optionnel (peut être NULL)
- Total en bas du tableau

