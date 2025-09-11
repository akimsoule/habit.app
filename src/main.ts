import { Category } from "./domain/category";
import { GoalSmart } from "./domain/goal";
import { Priority } from "./domain/priority";
import { InMemoryHabitRepository } from "./domain/repository";
import { NotificationService } from "./services/notification";
import { HabitManager } from "./services/manager";
import fs from "node:fs";
import { JsonStorage } from "./services/storage";

// ---- Projet: Faire venir ma femme d'ici 2 ans ----
const dataFile = `${process.cwd()}/.data/snapshot.json`;
// --- Reset des données (mettre à true pour repartir de zéro) ---
const RESET_DATA = true;
if (RESET_DATA) {
  try {
    fs.rmSync(dataFile, { force: true });
  console.log("🧹 Données réinitialisées (.data/snapshot.json)");
  } catch (e) {
    console.error("Échec de la réinitialisation des données:", e);
  }
}
const repo = new InMemoryHabitRepository();
const notifier = new NotificationService();
const manager = new HabitManager(repo, notifier);
const storage = new JsonStorage(dataFile);

// Charger un snapshot complet (catégories, habitudes, objectifs) si présent
storage.loadInto(manager, repo);

const immCategory = new Category("imm", "Immigration");
const finCategory = new Category("fin", "Finances");
const langCategory = new Category("lang", "Langue");
const logCategory = new Category("log", "Logistique");

manager.addCategory(immCategory);
manager.addCategory(finCategory);
manager.addCategory(langCategory);
manager.addCategory(logCategory);

const h6 = manager.createHabit({
  id: "h6",
  name: "Paperasse immigration 15 min",
  frequency: "daily",
  category: immCategory,
  priority: Priority.High,
});
const h7 = manager.createHabit({
  id: "h7",
  name: "Épargne 10€",
  frequency: "daily",
  category: finCategory,
  priority: Priority.High,
});
const h8 = manager.createHabit({
  id: "h8",
  name: "Anglais 10 min",
  frequency: "daily",
  category: langCategory,
  priority: Priority.Medium,
});
const h9 = manager.createHabit({
  id: "h9",
  name: "Revue dossier (hebdo)",
  frequency: "weekly",
  category: immCategory,
  priority: Priority.Medium,
});
const h10 = manager.createHabit({
  id: "h10",
  name: "Récap mensuel & RDV",
  frequency: "monthly",
  category: logCategory,
  priority: Priority.Low,
});

const goalVisa = new GoalSmart(
  "g2",
  "Faire venir ma femme (2 ans)",
  [h6, h7, h8, h9, h10],
  Priority.High,
  undefined,
  "2027-09-10"
);
manager.addGoal(goalVisa);

// Sauvegarder le snapshot complet
storage.saveFrom(manager, repo);

// Simulation de progression (septembre 2025)
h6.markAsCompleted("2025-09-01");
h6.markAsCompleted("2025-09-02");
h6.markAsCompleted("2025-09-03");
h7.markAsCompleted("2025-09-01");
h7.markAsCompleted("2025-09-02");
h8.markAsCompleted("2025-09-01");
h9.markAsCompleted("2025-09-01"); // lundi
h9.markAsCompleted("2025-09-08"); // lundi
h10.markAsCompleted("2025-09-01"); // 1er du mois

console.log(
  "🎯 Progression Projet (Visa):",
  goalVisa.getProgress("2025-09-01")
);
console.log(
  "📈 Progression Globale (incluant projet):",
  manager.getOverallProgress("2025-09-01", "2025-09-30")
);
console.log(
  "📊 Progression Globale (via objectifs/dates butoir):",
  manager.getOverallProgressFromGoals("2025-09-01")
);

// Notifications
manager.sendReminders();

// Habitudes dues aujourd'hui (UTC)
const todayISO = new Date().toISOString().slice(0, 10);
const dueToday = manager
  .getAllHabits()
  .filter((h) => h.isDueOn(todayISO) && !h.isCompletedOn(todayISO));
console.log(
  "🗓️ À faire aujourd'hui:",
  dueToday.map((h) => `${h.name} [${h.category.name}]`)
);

const nearest = manager.getNearestDueDateProgress("2025-09-01", todayISO);
if (nearest) {
  console.log(
    `⏳ Objectif prioritaire: ${nearest.goalName} (due ${nearest.dueDate}) → ${nearest.progress.toFixed(
      1
    )}%`
  );
}
