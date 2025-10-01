import fs from "node:fs";
import path from "node:path";
import type { MarkdownContent, Schedule } from "../types/markdown.types";

export class Markdown {
  markdown_template = path.join(__dirname, "../assets/markdown.md");
  markdown: string = "";

  constructor() {
    // load markdown template
    if (fs.existsSync(this.markdown_template)) {
      this.markdown = fs.readFileSync(this.markdown_template, "utf-8");
    } else {
      throw new Error("Markdown template file not found.");
    }
  }

  getPriorityEmoji(priority?: "high" | "medium" | "low"): string {
    if (!priority) return "";

    const emojiMap: Record<"high" | "medium" | "low", string[]> = {
      high: ["🔥", "🤯", "🚀"],
      medium: ["⚡", "😎", "🎯"],
      low: ["🌱", "😌", "🛋️"],
    };

    const choices = emojiMap[priority];
    return choices[Math.floor(Math.random() * choices.length)] || "";
  }

  public getFormattedMarkdown(content: MarkdownContent) {
    // set properties
    this.markdown = this.markdown
      .replace("{{DATE}}", content.date)
      .replace("{{TOTAL_TASKS}}", content.total_tasks.toString())
      .replace("{{ESTIMATED_TIME}}", content.estimated_time)
      .replace(
        "{{HIGH_PRIORITY_TASK_COUNT}}",
        content.high_priority_task_count.toString(),
      );

    // set schedule
    let scheduleBody = "";
    for (const item of content.schedule) {
      const isCalendarEvent = item.priority !== undefined;
      scheduleBody += `\n
## ${this.getPriorityEmoji(item.priority)} ${item.title}

**⏰ ${item.startTime} - ${item.endTime}**${isCalendarEvent ? `\n\n**Priority:** ${item.priority} ${this.getPriorityEmoji(item.priority)}` : ""}

${item.activity}

---`;
    }

    this.markdown = this.markdown.replace("{{SCHEDULE_BODY}}", scheduleBody);

    return this.markdown;
  }
}
