# habit.app — Documentation complète

![ci](https://github.com/akimsoule/habit.app/actions/workflows/ci.yml/badge.svg)
[![codecov](https://codecov.io/gh/akimsoule/habit.app/branch/main/graph/badge.svg)](https://codecov.io/gh/akimsoule/habit.app)
![coverage](https://img.shields.io/badge/coverage-100%25-brightgreen)
![types](https://img.shields.io/badge/types-TypeScript-blue)
![license](https://img.shields.io/badge/license-ISC-green)

Librairie TypeScript/ESM pour modéliser des habitudes, objectifs SMART (avec date butoir), catégories et persistance JSON. Conçue pour être intégrée dans des apps Node/React/Vite, sans dépendances Node (fs/path) dans le cœur de la lib.

## Sommaire
- Présentation et fonctionnalités
- Installation
- Démarrage rapide
- Modèle de données (concepts)
- API de haut niveau (HabitManager)
- API de bas niveau (Domain, Repository, Storage)
- Calcul de progression et gestion des dates (UTC)
- Exemples avancés
- Tests, couverture et qualité
- Build et publication
- FAQ et dépannage
- Licence

## Présentation et fonctionnalités
- Habitudes récurrentes: daily/weekly/monthly avec paramètres (jours/semaine, jour du mois).
- Objectifs SMART: regroupent des habitudes et possèdent une date butoir (`dueDate`) utilisée pour calculer la progression par défaut.
- Catégories et priorités pour organiser vos habitudes.
- Persistance JSON (agnostique plateforme):
	- Snapshot complet via `JsonStorage` branché sur un `IStorageProvider`.
	- Provider mémoire inclus: `InMemoryStorageProvider`.
	- (Déprécié) Répertoire JSON disque via `JsonHabitRepository`: la version côté lib n’utilise PAS fs/path et ne persiste pas sur disque (voir détails plus bas).
- Manager de haut niveau (`HabitManager`): création, mutations, agrégation de progressions, rappels.
- TypeScript strict, 100% coverage (pour le cœur de la lib), ESM ready.

## Installation

```bash
npm i habit.app
```

Compatible Node >= 18 (ESM) et bundlers modernes (Vite, Webpack, etc.).

## Démarrage rapide

```ts
import {
	Category,
	Priority,
	Habit,
	GoalSmart,
	InMemoryHabitRepository,
	HabitManager,
	NotificationService,
	JsonStorage,
	StorageHelper,
} from 'habit.app'
import { InMemoryStorageProvider } from 'habit.app/dist/services/storage/memory.js'

const repo = new InMemoryHabitRepository()
const manager = new HabitManager(repo, new NotificationService())
// Stockage snapshot: injectez un provider (ici, mémoire)
const storage = new JsonStorage(new InMemoryStorageProvider())

const cat = new Category('imm', 'Immigration')
manager.addCategory(cat)
const h = manager.createHabit({ id: 'h1', name: 'Paperasse 15 min', category: cat, priority: Priority.High })
const goal = new GoalSmart('g1', 'Visa', [h], Priority.High, 'Dossier', '2027-09-10')
manager.addGoal(goal)

console.log('Progression objectif (par dueDate):', goal.getProgress('2025-09-01'))
storage.saveFrom(manager, repo)
```

## Modèle de données (concepts)

- Priority: enum numérique { High, Medium, Low }.
- Category(id: string, name: string, description?: string)
- Habit(
	id: string,
	name: string,
	frequency: 'daily' | 'weekly' | 'monthly',
	category: Category,
	priority: Priority,
	description?: string
)
	- daysOfWeek?: number[]  // weekly: 0=Dimanche … 6=Samedi
	- dayOfMonth?: number    // monthly: 1..31
	- archived: boolean
	- completedDates: Set<string> (privé) au format YYYY-MM-DD

- GoalSmart(
	id: string,
	name: string,
	habits: Habit[] = [],
	priority: Priority = Priority.Medium,
	description?: string,
	dueDate?: string // ISO YYYY-MM-DD
)

## API de haut niveau — HabitManager

Construction: `new HabitManager(repo: IHabitRepository, notifier: NotificationService)`

- Catégories
	- addCategory(category)
	- getAllCategories(): Category[]
- Habitudes
	- createHabit({ id, name, frequency?, category?, priority?, description? }): Habit
	- addHabit(habit)
	- getHabit(id): Habit | undefined
	- getAllHabits(options?: { includeArchived?: boolean }): Habit[]
	- getHabitsByCategory(categoryId): Habit[]
	- Mutations: renameHabit, setDescription, archiveHabit, unarchiveHabit, toggleHabit(dateISO), setDone(done,dateISO), setWeeklyDays, setMonthlyDay
- Objectifs
	- addGoal(goal: GoalSmart)
	- getAllGoals(): GoalSmart[]
- Progression
	- getOverallProgress(startISO, endISO): number (moyenne de toutes les habitudes)
	- getOverallProgressFromGoals(startISO): number (moyenne des objectifs avec dueDate)
	- getNearestDueDateProgress(startISO, refISO?): { goalId, goalName, dueDate, progress } | undefined
- Notifications
	- sendReminders(): void (appel `console.log` par défaut)

## API de bas niveau

### Habit
- markAsCompleted(dateISO) / unmarkAsCompleted(dateISO) / toggleCompleted(dateISO)
- isCompletedOn(dateISO)
- getCompletionHistory(): string[] (trié)
- getLastCompleted(): string | undefined
- isDueOn(dateISO): boolean (UTC)
- getProgress(startISO, endISO): number ∈ [0..1]

Règles de due:
- daily: tous les jours.
- weekly: par défaut lundi (UTC) ou selon `daysOfWeek` si défini.
- monthly: par défaut le 1er (UTC) ou selon `dayOfMonth` si défini.

### GoalSmart
- addHabit(habit) / removeHabit(habitId) / getHabits()
- getProgress(startISO, endISO?): number
	- Si `endISO` non fourni et `dueDate` défini, utilise `dueDate`.
	- Moyenne des progressions de ses habitudes.

### Repository
- IHabitRepository: saveHabit, getHabitById, getAllHabits({ includeArchived? }), deleteHabit
- InMemoryHabitRepository: implémentation en mémoire (par défaut pour apps runtime/tests).
- JsonHabitRepository: version « lib » in-memory (pas de fs/path). La persistance DISQUE est déportée hors de la lib. Voir `src/domain/repository.json.ts` (dépréciation notée dans le fichier) si besoin d’une base temporaire en mémoire avec une API similaire.

### Storage (snapshot complet)
- JsonStorage(provider: IStorageProvider)
	- loadInto(manager, repo): charge categories, habits, goals
	- saveFrom(manager, repo)
- IStorageProvider (interface): abstrait la lecture/écriture du snapshot.
- InMemoryStorageProvider: stocke le snapshot en mémoire (copie profonde).

Format (simplifié):
- CategoryDTO: { id, name, description? }
- HabitDTO: { id, name, frequency, categoryId, priority, archived, completedDates[], daysOfWeek?, dayOfMonth?, description? }
- GoalDTO: { id, name, priority, habitIds[], dueDate?, description? }

## Calcul de progression et dates (UTC)
- Les dates sont en ISO `YYYY-MM-DD`.
- Les calculs utilisent l’UTC pour éviter les décalages de fuseau.
- Habit.getProgress() compte les occurrences « attendues » (selon la récurrence) dans [start..end], puis le ratio `completed/expected`.
- GoalSmart.getProgress() fait la moyenne des progressions des habitudes. Sans `endDate` explicite, utilise `dueDate`.

## Exemples avancés

### Exemple: Projet de certification professionnelle

Contexte
- Candidat·e préparant une certification (ex: Développeur·euse Web). Objectif: structurer révisions, avancement projet, et preuves; suivre la progression jusqu’à la date d’examen, avec 100% tests et CI.

Exemple d’implémentation

```ts
import {
	Category,
	Priority,
	GoalSmart,
	InMemoryHabitRepository,
	HabitManager,
	NotificationService,
	JsonStorage,
} from 'habit.app'

const repo = new InMemoryHabitRepository()
const manager = new HabitManager(repo, new NotificationService())

// Catégorie dédiée
const cat = new Category('cert', 'Certification')
manager.addCategory(cat)

// Habitudes clés
const study = manager.createHabit({
	id: 'study',
	name: 'Révisions 1h',
	frequency: 'daily',
	category: cat,
	priority: Priority.High,
})

const project = manager.createHabit({
	id: 'proj',
	name: 'Avancement projet',
	frequency: 'weekly',
	category: cat,
	priority: Priority.High,
	description: 'Livrables hebdomadaires',
})
project.setDaysOfWeek([3]) // Jeudi (UTC)

const portfolio = manager.createHabit({
	id: 'port',
	name: 'Mise à jour portfolio',
	frequency: 'monthly',
	category: cat,
	priority: Priority.Medium,
})
portfolio.setDayOfMonth(1)

// Objectif global calé sur la date d’examen
const goal = new GoalSmart(
	'g-cert',
	'Préparer la certification',
	[study, project, portfolio],
	Priority.High,
	'Programme de 12 semaines',
	'2025-12-15', // dueDate de l’examen
)
manager.addGoal(goal)

// Suivi quotidien + notes de preuve (journal)
const today = new Date().toISOString().slice(0, 10)
study.completeWithNote(today, 'Chapitres 3-4 + exos')

console.log('Streak révisions (jours consécutifs):', study.getCurrentStreak())
console.log('Progression objectif (jusqu’à l’examen):', goal.getProgress('2025-09-01'))

// Snapshot (preuve d’avancement exportable)
new JsonStorage('./.data/certif.snapshot.json').saveFrom(manager, repo)
```

Ce qui est valorisable pour un dossier/jury
- Backlog structuré (habitudes + objectif SMART avec dueDate)
- Journal des preuves (notes de complétion datées)
- KPIs: progression globale, streaks, objectifs les plus urgents
- Qualité: 100% de couverture, CI verte, docs générées

### Objectif prioritaire (deadline la plus proche)
```ts
const res = manager.getNearestDueDateProgress('2025-09-01', '2025-09-10')
if (res) console.log(`${res.goalName} → ${res.progress}% avant ${res.dueDate}`)
```

### Habitudes hebdos et mensuelles paramétrées
```ts
const hWeekly = manager.createHabit({ id: 'w', name: 'Sport', frequency: 'weekly', category: cat })
hWeekly.setDaysOfWeek([1,4]) // Lundi & Jeudi (UTC)
const hMonthly = manager.createHabit({ id: 'm', name: 'Budget', frequency: 'monthly', category: cat })
hMonthly.setDayOfMonth(15)
```

## Tests, couverture et qualité
- Tests unitaires (Vitest) couvrant 100% (lignes, fonctions, statements, branches) sur le cœur de la lib.
- Lancer:

```bash
npm test
```

Rapports disponibles en texte/HTML/LCOV (voir `coverage/`).

## Build et publication
- Build ESM + d.ts:

```bash
npm run build
```

- Générer la doc API (TypeDoc):

```bash
npm run docs
```

## Intégration TypeScript (Node, Vite, Next)

La librairie est ESM avec types fournis. Quelques recommandations pour un projet TypeScript consommateur:

- Vite/React (recommandé)
	- tsconfig (extrait):
		- "module": "ESNext"
		- "moduleResolution": "Bundler"
	- Import:
		```ts
		import { HabitManager, InMemoryHabitRepository, JsonStorage } from 'habit.app'
		import { InMemoryStorageProvider } from 'habit.app/dist/services/storage/memory.js'
		// Injection du provider de stockage
		const storage = new JsonStorage(new InMemoryStorageProvider())
		```

- Node + tsx/vite-node/ts-node ESM
	- Utilisez `tsx` ou `vite-node` pour l’exécution:
		```bash
		npx tsx src/main.ts
		```
	- tsconfig (extrait):
		- "module": "ESNext"
		- "target": "ES2021" (ou plus)
		- "moduleResolution": "bundler" (ou "nodenext" si vous préférez le mode Node ESM)
	- Import ESM uniquement (pas de require):
		```ts
		import { HabitManager, JsonStorage } from 'habit.app'
		import { InMemoryStorageProvider } from 'habit.app/dist/services/storage/memory.js'
		```

- Jest vs Vitest
	- Vitest est nativement compatible ESM/Vite.
	- Pour Jest, activez le support ESM ou transpilez via Babel/ts-jest en mode ESM.

Erreurs fréquentes
- « Cannot use import statement outside a module »: activez ESM (Node >= 18) ou utilisez un bundler/`tsx`.
- « ERR_REQUIRE_ESM »: importez la lib via `import` ESM, pas `require()`.

## FAQ et dépannage
- Mes dates semblent décalées d’un jour.
	- Vérifiez que vous fournissez des dates ISO (YYYY-MM-DD). La lib calcule en UTC pour éviter les offsets.
- Puis-je utiliser CommonJS ?
	- La lib est ESM ("type": "module"). Utilisez des bundlers modernes ou Node ESM.
- Comment persister tout l’état ?
	- Utilisez `JsonStorage`. Pour des habitudes seules, `JsonHabitRepository` peut suffire.

## Licence
ISC — voir `LICENSE`.
