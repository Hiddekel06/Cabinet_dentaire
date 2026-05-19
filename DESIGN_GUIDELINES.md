# Design System & UI Guidelines - Cabinet Dentaire

Ce document définit les standards visuels et les composants UI utilisés dans le projet. Il sert de référence pour maintenir une cohérence esthétique à travers toute l'application.

## 1. Principes Fondamentaux
- **Clarté & Professionnalisme :** Utilisation de fonds clairs, d'une typographie lisible (Inter/Sans) et d'espaces généreux.
- **Interactivité Douce :** Transitions systématiques sur les hovers (`transition-all duration-300`).
- **Profondeur :** Utilisation de flous d'arrière-plan (`backdrop-blur`) et d'ombres portées subtiles.

## 2. Palette de Couleurs (Tailwind CSS)
- **Primaire (Actions/Info) :** `blue-600` (hover: `blue-700`), `blue-50` pour les fonds.
- **Succès (Validation) :** `emerald-500` ou `emerald-600`.
- **Alerte (Attention) :** `amber-500` ou `amber-600`.
- **Danger (Suppression) :** `red-600`.
- **Neutre :** `gray-500` pour le texte secondaire, `gray-50` pour les fonds alternés.

## 3. Composants Standards

### 3.1 Conteneurs de Listes (Tableaux/Grilles)
```jsx
className="relative overflow-hidden rounded-2xl border border-blue-100 shadow-lg bg-gradient-to-br from-white/80 via-blue-50/60 to-white/90 backdrop-blur-sm transition-all duration-300 group hover:shadow-2xl hover:border-blue-200"
```

### 3.2 Modales & Dialogues
- **Overlay :** `fixed inset-0 z-50 flex items-center justify-center backdrop-blur-md bg-black/25`
- **Card :** `bg-white rounded-xl shadow-2xl border border-blue-100 overflow-hidden`
- **Header :** `bg-gradient-to-r from-blue-50 via-white to-blue-50`

### 3.3 Boutons
- **Principal :** `rounded-full px-5 py-2 bg-blue-600 text-white hover:bg-blue-700 shadow-sm transition-all`
- **Secondaire :** `rounded-lg px-3 py-2 bg-blue-50 text-blue-600 border border-blue-100 hover:bg-blue-100`
- **Action de ligne :** `bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg`

### 3.4 Badges de Statut
```jsx
// Style général
"inline-block px-2 py-1 rounded-full text-xs font-semibold"
// Variantes
"bg-blue-100 text-blue-700" // Aujourd'hui / Info
"bg-emerald-100 text-emerald-700" // À venir / Succès
"bg-amber-100 text-amber-700" // Retard / Alerte
"bg-red-100 text-red-600" // Annulé / Danger
```

## 4. Patterns UX
- **Feedback visuel :** Utilisation de l'animation `animate-pulse` ou d'un changement de couleur de fond pour mettre en évidence un élément récemment modifié.
- **Empty States :** Toujours afficher un message clair et une icône grise quand une liste est vide.
- **Chargement :** Utilisation de skeletons ou de spinners discrets (`animate-spin`) sur les boutons lors des appels API.

## 5. Classes CSS Globales (Utilitaires)
- **Glassmorphism :** `backdrop-blur-sm bg-white/90`
- **Soft Shadow :** `shadow-[0_8px_30px_rgb(0,0,0,0.04)]`
