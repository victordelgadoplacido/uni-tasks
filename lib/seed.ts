import { Module, Task } from "./types";

export const SEED_MODULES: Module[] = [
  { id: "mod-1", name: "Algorithms", color: "blue", ownerId: "user-1" },
  { id: "mod-2", name: "Databases", color: "purple", ownerId: "user-1" },
  { id: "mod-3", name: "Linear Algebra", color: "emerald", ownerId: "user-1" },
];

export const SEED_TASKS: Task[] = [
  {
    id: "task-1",
    moduleId: "mod-1",
    title: "Problem set 3 - Graph traversal",
    notes: "",
    dueDate: null,
    plannedDate: null,
    planOrder: 0,
    moduleOrder: 0,
    done: false,
    status: "pending",
    priority: "medium",
  },
  {
    id: "task-2",
    moduleId: "mod-2",
    title: "ER diagram for course project",
    notes: "",
    dueDate: null,
    plannedDate: null,
    planOrder: 0,
    moduleOrder: 0,
    done: false,
    status: "pending",
    priority: "high",
  },
  {
    id: "task-3",
    moduleId: "mod-3",
    title: "Read chapter 4",
    notes: "",
    dueDate: null,
    plannedDate: null,
    planOrder: 0,
    moduleOrder: 0,
    done: false,
    status: "pending",
    priority: "low",
  },
];
