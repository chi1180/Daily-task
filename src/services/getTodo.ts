/**
 * 1. get ca;endar events
 * 2. get tasks from github
 */

import type { CalendarEvent } from "../types/calendar.types";
import type { Task, Todo } from "../types/task.types";
import { Calendar } from "../utilities/calendar";
import { GitHub } from "../utilities/github";

export async function getTodo() {
  const TODO: Todo = {
    calendar_event: [],
    my_task: [],
  };

  /* Calendar */

  const _Calendar = new Calendar();

  const today = new Date();
  const events = await _Calendar.getEvents(today);

  if (events.length > 0) {
    // console.log("[--DEBUG--] Today's events:");
    // console.dir(events, { depth: null });
    TODO.calendar_event.push(...events);
  } else {
    console.log("[--INFO--] No events found for today");
  }

  /* Task data from GitHub */
  const _GitHub = new GitHub();
  const content = await _GitHub.getTasks();

  // get unchecked tasks only
  const taskLines = content.split("\n");
  const uncheckedTasks = taskLines.filter((line) => line.startsWith("- [ ]"));

  // get task deadilne
  for (const task of uncheckedTasks) {
    const taskInfo: Task = {
      content: task.replace("- [ ] ", ""),
      deadline: "No deadline",
    };

    const deadlineMatch = task.match(/📅\s*(\d{4}-\d{2}-\d{2})/);
    if (deadlineMatch) {
      const deadlineStr = deadlineMatch[1];
      taskInfo.deadline = deadlineStr || "No deadline";
    }

    TODO.my_task.push(taskInfo);
  }

  return TODO;
}
