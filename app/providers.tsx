"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  ReactNode,
} from "react";
import { IcalEvent, IcalSource, Module, Routine, Task } from "@/lib/types";
import { createClient } from "@/lib/supabase/client";
import { taskChangesToRow, taskToRow } from "@/lib/supabase/mappers";

const ICAL_EVENTS_KEY = "uni-tasks:icalEvents";
const ICAL_SOURCE_KEY = "uni-tasks:icalSource";

// date ISO -> ids of routines completed that day
type RoutineCompletions = Record<string, string[]>;

interface AppDataContextValue {
  modules: Module[];
  tasks: Task[];
  icalEvents: IcalEvent[];
  icalSource: IcalSource | null;
  routines: Routine[];
  routineCompletions: RoutineCompletions;
  loaded: boolean;
  addModule: (name: string, color: Module["color"]) => void;
  updateModule: (id: string, changes: Partial<Omit<Module, "id">>) => void;
  deleteModule: (id: string) => void;
  addTask: (task: Omit<Task, "id">) => void;
  updateTask: (id: string, changes: Partial<Omit<Task, "id">>) => void;
  deleteTask: (id: string) => void;
  toggleTaskDone: (id: string) => void;
  // Assigns a task to `date` (or back to the unplanned pool if null),
  // inserting it before `beforeTaskId` within that day, or at the end if
  // omitted. Used by the Week view's drag and drop.
  moveTaskToDay: (taskId: string, date: string | null, beforeTaskId?: string) => void;
  importIcalEvents: (events: IcalEvent[], fileName: string) => void;
  clearIcalEvents: () => void;
  addRoutine: (title: string) => void;
  deleteRoutine: (id: string) => void;
  toggleRoutineDone: (routineId: string, date: string) => void;
}

const AppDataContext = createContext<AppDataContextValue | null>(null);

interface AppDataProviderProps {
  children: ReactNode;
  userId: string;
  initialModules: Module[];
  initialTasks: Task[];
  initialRoutines: Routine[];
  initialRoutineCompletions: RoutineCompletions;
}

export function AppDataProvider({
  children,
  userId,
  initialModules,
  initialTasks,
  initialRoutines,
  initialRoutineCompletions,
}: AppDataProviderProps) {
  const supabase = useMemo(() => createClient(), []);

  const [modules, setModules] = useState<Module[]>(initialModules);
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [routines, setRoutines] = useState<Routine[]>(initialRoutines);
  const [routineCompletions, setRoutineCompletions] = useState<RoutineCompletions>(
    initialRoutineCompletions
  );

  // ical import is a locally-cached calendar feed, not authored data, so it
  // stays entirely client-side/localStorage — unrelated to the Supabase
  // migration of modules/tasks/routines above.
  const [icalEvents, setIcalEvents] = useState<IcalEvent[]>([]);
  const [icalSource, setIcalSource] = useState<IcalSource | null>(null);
  const icalLoaded = useRef(false);

  useEffect(() => {
    try {
      const storedIcalEvents = localStorage.getItem(ICAL_EVENTS_KEY);
      const storedIcalSource = localStorage.getItem(ICAL_SOURCE_KEY);
      setIcalEvents(storedIcalEvents ? JSON.parse(storedIcalEvents) : []);
      setIcalSource(storedIcalSource ? JSON.parse(storedIcalSource) : null);
    } catch {
      // ignore malformed cached feed, keep the empty defaults
    }
    icalLoaded.current = true;
  }, []);

  useEffect(() => {
    if (icalLoaded.current) localStorage.setItem(ICAL_EVENTS_KEY, JSON.stringify(icalEvents));
  }, [icalEvents]);

  useEffect(() => {
    if (!icalLoaded.current) return;
    if (icalSource) {
      localStorage.setItem(ICAL_SOURCE_KEY, JSON.stringify(icalSource));
    } else {
      localStorage.removeItem(ICAL_SOURCE_KEY);
    }
  }, [icalSource]);

  const value = useMemo<AppDataContextValue>(
    () => ({
      modules,
      tasks,
      icalEvents,
      icalSource,
      routines,
      routineCompletions,
      loaded: true,

      addModule: (name, color) => {
        const id = crypto.randomUUID();
        setModules((prev) => [...prev, { id, name, color }]);
        supabase
          .from("modules")
          .insert({ id, name, color, user_id: userId })
          .then(({ error }) => {
            if (error) setModules((prev) => prev.filter((m) => m.id !== id));
          });
      },

      updateModule: (id, changes) => {
        let prevModule: Module | undefined;
        setModules((prev) =>
          prev.map((m) => {
            if (m.id === id) {
              prevModule = m;
              return { ...m, ...changes };
            }
            return m;
          })
        );
        supabase
          .from("modules")
          .update(changes)
          .eq("id", id)
          .then(({ error }) => {
            if (error && prevModule) {
              const restored = prevModule;
              setModules((prev) => prev.map((m) => (m.id === id ? restored : m)));
            }
          });
      },

      deleteModule: (id) => {
        let prevModules: Module[] = [];
        let prevTasks: Task[] = [];
        setModules((prev) => {
          prevModules = prev;
          return prev.filter((m) => m.id !== id);
        });
        setTasks((prev) => {
          prevTasks = prev;
          return prev.filter((t) => t.moduleId !== id);
        });
        supabase
          .from("modules")
          .delete()
          .eq("id", id)
          .then(({ error }) => {
            if (error) {
              setModules(prevModules);
              setTasks(prevTasks);
            }
          });
      },

      addTask: (task) => {
        const id = crypto.randomUUID();
        setTasks((prev) => [...prev, { ...task, id }]);
        supabase
          .from("tasks")
          .insert({ id, ...taskToRow(task, userId) })
          .then(({ error }) => {
            if (error) setTasks((prev) => prev.filter((t) => t.id !== id));
          });
      },

      updateTask: (id, changes) => {
        let prevTask: Task | undefined;
        setTasks((prev) =>
          prev.map((t) => {
            if (t.id === id) {
              prevTask = t;
              return { ...t, ...changes };
            }
            return t;
          })
        );
        supabase
          .from("tasks")
          .update(taskChangesToRow(changes))
          .eq("id", id)
          .then(({ error }) => {
            if (error && prevTask) {
              const restored = prevTask;
              setTasks((prev) => prev.map((t) => (t.id === id ? restored : t)));
            }
          });
      },

      deleteTask: (id) => {
        let prevTasks: Task[] = [];
        setTasks((prev) => {
          prevTasks = prev;
          return prev.filter((t) => t.id !== id);
        });
        supabase
          .from("tasks")
          .delete()
          .eq("id", id)
          .then(({ error }) => {
            if (error) setTasks(prevTasks);
          });
      },

      toggleTaskDone: (id) => {
        let nextDone = false;
        let prevTask: Task | undefined;
        setTasks((prev) =>
          prev.map((t) => {
            if (t.id === id) {
              prevTask = t;
              nextDone = !t.done;
              return { ...t, done: nextDone };
            }
            return t;
          })
        );
        supabase
          .from("tasks")
          .update({ done: nextDone })
          .eq("id", id)
          .then(({ error }) => {
            if (error && prevTask) {
              const restored = prevTask;
              setTasks((prev) => prev.map((t) => (t.id === id ? restored : t)));
            }
          });
      },

      moveTaskToDay: (taskId, date, beforeTaskId) => {
        let prevTasks: Task[] = [];
        let movedIds: { id: string; planned_date: string | null; plan_order: number }[] = [];

        setTasks((prev) => {
          prevTasks = prev;
          const moving = prev.find((t) => t.id === taskId);
          if (!moving) return prev;

          if (date === null) {
            movedIds = [{ id: taskId, planned_date: null, plan_order: 0 }];
            return prev.map((t) =>
              t.id === taskId ? { ...t, plannedDate: null, planOrder: 0 } : t
            );
          }

          const dayTasks = prev
            .filter((t) => t.id !== taskId && t.plannedDate === date)
            .sort((a, b) => a.planOrder - b.planOrder);

          const insertIndex = beforeTaskId
            ? Math.max(0, dayTasks.findIndex((t) => t.id === beforeTaskId))
            : dayTasks.length;
          const withMoved = [...dayTasks];
          withMoved.splice(
            insertIndex === -1 ? dayTasks.length : insertIndex,
            0,
            { ...moving, plannedDate: date }
          );

          const reordered = new Map(
            withMoved.map((t, i) => [t.id, { ...t, planOrder: i }])
          );
          movedIds = withMoved.map((t, i) => ({
            id: t.id,
            planned_date: date,
            plan_order: i,
          }));
          return prev.map((t) => reordered.get(t.id) ?? t);
        });

        if (movedIds.length === 0) return;

        const persist =
          date === null
            ? supabase
                .from("tasks")
                .update({ planned_date: null, plan_order: 0 })
                .eq("id", taskId)
            : supabase.rpc("reorder_tasks", { p_updates: movedIds });

        persist.then(({ error }: { error: unknown }) => {
          if (error) setTasks(prevTasks);
        });
      },

      importIcalEvents: (events, fileName) => {
        setIcalEvents(events);
        setIcalSource({
          fileName,
          importedAt: new Date().toISOString(),
          count: events.length,
        });
      },
      clearIcalEvents: () => {
        setIcalEvents([]);
        setIcalSource(null);
      },

      addRoutine: (title) => {
        const id = crypto.randomUUID();
        setRoutines((prev) => [...prev, { id, title }]);
        supabase
          .from("routines")
          .insert({ id, title, user_id: userId })
          .then(({ error }) => {
            if (error) setRoutines((prev) => prev.filter((r) => r.id !== id));
          });
      },

      deleteRoutine: (id) => {
        let prevRoutines: Routine[] = [];
        setRoutines((prev) => {
          prevRoutines = prev;
          return prev.filter((r) => r.id !== id);
        });
        supabase
          .from("routines")
          .delete()
          .eq("id", id)
          .then(({ error }) => {
            if (error) setRoutines(prevRoutines);
          });
      },

      toggleRoutineDone: (routineId, date) => {
        let prevCompletions: RoutineCompletions = {};
        let willComplete = true;
        setRoutineCompletions((prev) => {
          prevCompletions = prev;
          const done = prev[date] ?? [];
          willComplete = !done.includes(routineId);
          const next = willComplete
            ? [...done, routineId]
            : done.filter((id) => id !== routineId);
          return { ...prev, [date]: next };
        });

        const persist = willComplete
          ? supabase
              .from("routine_completions")
              .insert({ routine_id: routineId, completed_date: date, user_id: userId })
          : supabase
              .from("routine_completions")
              .delete()
              .match({ routine_id: routineId, completed_date: date });

        persist.then(({ error }) => {
          if (error) setRoutineCompletions(prevCompletions);
        });
      },
    }),
    [modules, tasks, icalEvents, icalSource, routines, routineCompletions, supabase, userId]
  );

  return (
    <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>
  );
}

export function useAppData(): AppDataContextValue {
  const ctx = useContext(AppDataContext);
  if (!ctx) throw new Error("useAppData must be used within AppDataProvider");
  return ctx;
}
