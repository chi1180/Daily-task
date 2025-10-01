import fs from "node:fs";
import path from "node:path";

import type { CalendarEvent } from "../types/calendar.types";
import type { Task } from "../types/task.types";

export class Gemini {
  // prompt
  TODO: { calendar_event: CalendarEvent[]; my_task: Task[] };
  prompt_template_path = path.join(__dirname, "../assets/prompt.md");
  prompt: string = "";

  // gemini
  endPoint = `https://generativelanguage.googleapis.com/v1beta/models/${process.env.GEMINI_API_MODEL}:generateContent?key=${process.env.GEMINI_API_KEY}`;

  constructor(TODO: { calendar_event: CalendarEvent[]; my_task: Task[] }) {
    this.TODO = TODO;

    if (fs.existsSync(this.prompt_template_path)) {
      this.prompt = fs.readFileSync(this.prompt_template_path, "utf-8");

      // apply variables to template
      const today =
        new Date()
          .toLocaleString("ja-JP", {
            timeZone: "Asia/Tokyo",
          })
          .split(" ")[0] || "";

      this.prompt = this.prompt
        .replace("{{DATE}}", today)
        .replace("{{CALENDAR_EVENT}}", JSON.stringify(this.TODO.calendar_event))
        .replace("{{MY_TASK}}", JSON.stringify(this.TODO.my_task));

      // console.log(`[--DEBUG--] Prompt is\n${this.prompt}`);
    } else {
      throw new Error("Prompt template file not found.");
    }
  }

  public async generateSchedule() {
    const payload = {
      contents: [
        {
          parts: [
            {
              text: this.prompt,
            },
          ],
        },
      ],
    };

    const options = {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": process.env.GEMINI_API_KEY,
      },
      body: JSON.stringify(payload),
    };

    const response = await fetch(this.endPoint, options as any);
    const result = (await response.json()) as any;

    // console.log(`[--DEBUG--] Result from gemini api:`);
    // console.dir(result, { depth: null });

    if (!result?.candidates?.[0]?.content?.parts?.[0]?.text) {
      throw new Error("Invalid Gemini API response format");
    }

    const responseText = result.candidates[0].content.parts[0].text as string;

    // check JSON code format
    if (responseText.startsWith("```json\n") && responseText.endsWith("```")) {
      return JSON.parse(
        responseText.replace("```json\n", "").replace("```", ""),
      );
    }

    return JSON.parse(responseText);
  }
}
