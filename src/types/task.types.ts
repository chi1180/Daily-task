import type { CalendarEvent } from "./calendar.types";

export type Task = {
  content: string;
  deadline: string;
};

export type Todo = {
  calendar_event: CalendarEvent[];
  my_task: Task[];
};
