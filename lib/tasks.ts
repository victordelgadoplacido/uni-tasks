import { Task } from "./types";

// A module's tasks in the order the user arranged them on the module page,
// with completed tasks after open ones.
export function sortByModuleOrder(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => {
    if (a.done !== b.done) return a.done ? 1 : -1;
    return a.moduleOrder - b.moduleOrder;
  });
}
