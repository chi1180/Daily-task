import type { MarkdownContent, Schedule } from "../types/markdown.types";
import type { Todo } from "../types/task.types";
import { Gemini } from "../utilities/gemini";
import { GitHub } from "../utilities/github";
import { Markdown } from "../utilities/markdown";

export async function makeSchedule(TODO: Todo) {
  // console.log(`[--DEBUG--] My todo:\n`);
  // console.dir(TODO, { depth: null });

  const _Gemini = new Gemini(TODO);
  const schedule = (await _Gemini.generateSchedule()) as Schedule[];

  // console.log(`[--DEBUG--] Generated schedule:\n`);
  // console.dir(schedule, { depth: null });

  // make MarkdownContent
  const content: MarkdownContent = {
    date:
      new Date()
        .toLocaleString("ja-JP", {
          timeZone: "Asia/Tokyo",
        })
        .split(" ")[0] || "",
    total_tasks: schedule.length,
    estimated_time: estimateTime(schedule),
    high_priority_task_count: schedule.filter(
      (item) => item.priority === "high",
    ).length,
    schedule: schedule,
  };

  // formatting markdown body
  const _Markdown = new Markdown();
  const markdownBody = _Markdown.getFormattedMarkdown(content);

  // console.log(`[--DEBUG--] Generated markdown:\n${markdownBody}`);

  // push to github
  const _GitHub = new GitHub();
  await _GitHub.draftDailyTask(markdownBody);
}

function estimateTime(schedule: Schedule[]) {
  let totalMinutes = 0;

  for (const item of schedule) {
    // Parse start time (HH:mm format)
    const startTimeMatch = item.startTime.match(/(\d{1,2}):(\d{2})/);
    const endTimeMatch = item.endTime.match(/(\d{1,2}):(\d{2})/);

    if (
      startTimeMatch &&
      endTimeMatch &&
      startTimeMatch[1] &&
      startTimeMatch[2] &&
      endTimeMatch[1] &&
      endTimeMatch[2]
    ) {
      const startMinutes =
        parseInt(startTimeMatch[1]) * 60 + parseInt(startTimeMatch[2]);
      const endMinutes =
        parseInt(endTimeMatch[1]) * 60 + parseInt(endTimeMatch[2]);

      // Handle case where end time is next day (though unlikely in this context)
      const duration =
        endMinutes >= startMinutes
          ? endMinutes - startMinutes
          : 24 * 60 + endMinutes - startMinutes;

      totalMinutes += duration;
    }
  }

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
}
